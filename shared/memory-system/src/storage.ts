import type { DuduDatabase } from '@dudu/storage';
import type { MemoryRow } from '@dudu/storage';
import type { Memory, MemoryType, ExtractedMemory, DecayConfig } from './types';

const DEFAULT_DECAY_CONFIG: DecayConfig = {
  decayThresholdDays: 30,
  decayAmount: 0.2,
  cleanupThreshold: 0.3,
};

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// 简单的文本相似度（基于公共子串长度比例）
function textSimilarity(a: string, b: string): number {
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  if (shorter.length === 0) return 0;

  let commonChars = 0;
  for (const char of shorter) {
    if (longer.includes(char)) commonChars++;
  }
  return commonChars / longer.length;
}

export class MemoryStore {
  private db: DuduDatabase;
  private decayConfig: DecayConfig;

  constructor(db: DuduDatabase, decayConfig?: Partial<DecayConfig>) {
    this.db = db;
    this.decayConfig = { ...DEFAULT_DECAY_CONFIG, ...decayConfig };
  }

  // 保存记忆（带去重检查）
  save(memory: Omit<Memory, 'id' | 'lastRecalledAt'>): Memory {
    const existing = this.findSimilar(memory.content, 0.7);

    if (existing) {
      // 更新 confidence，不新建
      const newConfidence = Math.min(1.0, existing.confidence + 0.1);
      this.db.run(
        'UPDATE memories SET confidence = ?, last_recalled_at = ? WHERE id = ?',
        [newConfidence, Date.now(), existing.id]
      );
      return { ...existing, confidence: newConfidence, lastRecalledAt: Date.now() };
    }

    const id = randomUUID();
    const now = Date.now();
    this.db.run(
      `INSERT INTO memories (id, type, content, confidence, source_conv_id, created_at, last_recalled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, memory.type, memory.content, memory.confidence, memory.sourceConvId ?? null, now, now]
    );

    return { ...memory, id, lastRecalledAt: now };
  }

  // 批量保存提取的记忆
  saveExtracted(extracted: ExtractedMemory[], sourceConvId?: string): Memory[] {
    return extracted
      .filter(m => m.content.trim().length > 0)
      .map(m => this.save({
        type: m.type,
        content: m.content.trim(),
        confidence: m.confidence,
        sourceConvId: sourceConvId ?? null,
        createdAt: Date.now(),
      }));
  }

  // 关键词检索相关记忆
  getRelevant(keywords: string[], limit = 10): Memory[] {
    if (keywords.length === 0) return this.getRecent(limit);

    const likeClauses = keywords.map(() => 'content LIKE ?').join(' OR ');
    const params = keywords.map(k => `%${k}%`);

    const rows = this.db.query<MemoryRow>(
      `SELECT * FROM memories WHERE ${likeClauses} ORDER BY confidence DESC, last_recalled_at DESC LIMIT ?`,
      [...params, limit]
    );

    // 更新 recall 时间
    const now = Date.now();
    const ids = rows.map(r => r.id);
    if (ids.length > 0) {
      this.db.run(
        `UPDATE memories SET last_recalled_at = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
        [now, ...ids]
      );
    }

    return rows.map(r => this.rowToMemory(r));
  }

  // 搜索所有记忆
  search(query: string, limit = 50): Memory[] {
    const rows = this.db.query<MemoryRow>(
      'SELECT * FROM memories WHERE content LIKE ? ORDER BY last_recalled_at DESC LIMIT ?',
      [`%${query}%`, limit]
    );
    return rows.map(r => this.rowToMemory(r));
  }

  // 获取最近记忆
  getRecent(limit = 20): Memory[] {
    const rows = this.db.query<MemoryRow>(
      'SELECT * FROM memories ORDER BY last_recalled_at DESC LIMIT ?',
      [limit]
    );
    return rows.map(r => this.rowToMemory(r));
  }

  // 获取所有记忆
  getAll(): Memory[] {
    const rows = this.db.query<MemoryRow>(
      'SELECT * FROM memories ORDER BY last_recalled_at DESC'
    );
    return rows.map(r => this.rowToMemory(r));
  }

  // 获取某类型记忆
  getByType(type: MemoryType): Memory[] {
    const rows = this.db.query<MemoryRow>(
      'SELECT * FROM memories WHERE type = ? ORDER BY confidence DESC',
      [type]
    );
    return rows.map(r => this.rowToMemory(r));
  }

  // 删除单条记忆
  delete(id: string): boolean {
    const result = this.db.run('DELETE FROM memories WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // 清空所有记忆
  clear(): number {
    const result = this.db.run('DELETE FROM memories');
    return result.changes;
  }

  // 记忆衰减 — 降低长时间未 recall 的记忆置信度
  applyDecay(): { decayed: number; cleaned: number } {
    const threshold = Date.now() - this.decayConfig.decayThresholdDays * 24 * 60 * 60 * 1000;

    // 衰减
    const decayResult = this.db.run(
      `UPDATE memories
       SET confidence = MAX(0, confidence - ?)
       WHERE last_recalled_at < ? AND confidence > 0`,
      [this.decayConfig.decayAmount, threshold]
    );

    // 清理低置信度
    const cleanResult = this.db.run(
      'DELETE FROM memories WHERE confidence < ?',
      [this.decayConfig.cleanupThreshold]
    );

    return { decayed: decayResult.changes, cleaned: cleanResult.changes };
  }

  // 导出记忆为 JSON
  export(): Memory[] {
    return this.getAll();
  }

  // 导入记忆
  import(memories: Memory[]): number {
    let count = 0;
    for (const m of memories) {
      this.save({
        type: m.type,
        content: m.content,
        confidence: m.confidence,
        sourceConvId: m.sourceConvId,
        createdAt: m.createdAt,
      });
      count++;
    }
    return count;
  }

  // 统计信息
  stats(): { total: number; byType: Record<MemoryType, number>; avgConfidence: number } {
    const total = this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM memories'
    )?.count || 0;

    const byTypeRows = this.db.query<{ type: MemoryType; count: number }>(
      'SELECT type, COUNT(*) as count FROM memories GROUP BY type'
    );
    const byType = { fact: 0, preference: 0, event: 0, pattern: 0 } as Record<MemoryType, number>;
    for (const r of byTypeRows) {
      byType[r.type] = r.count;
    }

    const avgConf = this.db.get<{ avg: number }>(
      'SELECT AVG(confidence) as avg FROM memories'
    )?.avg || 0;

    return { total, byType, avgConfidence: Math.round(avgConf * 100) / 100 };
  }

  // 查找相似记忆
  private findSimilar(content: string, threshold: number): Memory | null {
    const all = this.getAll();
    for (const m of all) {
      if (textSimilarity(content, m.content) >= threshold) {
        return m;
      }
    }
    return null;
  }

  private rowToMemory(row: MemoryRow): Memory {
    return {
      id: row.id,
      type: row.type as MemoryType,
      content: row.content,
      confidence: row.confidence,
      sourceConvId: row.source_conv_id,
      createdAt: row.created_at,
      lastRecalledAt: row.last_recalled_at,
    };
  }
}
