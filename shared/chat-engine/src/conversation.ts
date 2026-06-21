import type { DuduDatabase } from '@dudu/storage';
import type { ConversationRow, MessageRow } from '@dudu/storage';
import { randomUUID } from './utils';

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export class ConversationManager {
  private db: DuduDatabase;

  constructor(db: DuduDatabase) {
    this.db = db;
  }

  // 创建新对话
  createConversation(title?: string): Conversation {
    const id = randomUUID();
    const now = Date.now();
    this.db.run(
      'INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, title || null, now, now]
    );
    return { id, title: title || '新对话', createdAt: now, updatedAt: now };
  }

  // 获取所有对话列表（按更新时间倒序）
  listConversations(): Conversation[] {
    const rows = this.db.query<ConversationRow>(
      'SELECT * FROM conversations ORDER BY updated_at DESC'
    );
    return rows.map(r => ({
      id: r.id,
      title: r.title || '新对话',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  // 获取单个对话
  getConversation(id: string): Conversation | null {
    const row = this.db.get<ConversationRow>(
      'SELECT * FROM conversations WHERE id = ?',
      [id]
    );
    if (!row) return null;
    return {
      id: row.id,
      title: row.title || '新对话',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // 更新对话标题
  updateTitle(id: string, title: string): void {
    this.db.run(
      'UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?',
      [title, Date.now(), id]
    );
  }

  // 删除对话（级联删除消息）
  deleteConversation(id: string): void {
    this.db.run('DELETE FROM conversations WHERE id = ?', [id]);
  }

  // 清空所有对话和消息
  clearAllConversations(): number {
    const convCount = this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM conversations'
    )?.count || 0;
    this.db.run('DELETE FROM messages');
    this.db.run('DELETE FROM conversations');
    return convCount;
  }

  // 添加消息
  addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, unknown>
  ): StoredMessage {
    const id = randomUUID();
    const now = Date.now();
    this.db.run(
      'INSERT INTO messages (id, conversation_id, role, content, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [id, conversationId, role, content, now, metadata ? JSON.stringify(metadata) : null]
    );
    // 更新对话时间
    this.db.run(
      'UPDATE conversations SET updated_at = ? WHERE id = ?',
      [now, conversationId]
    );
    return { id, conversationId, role, content, timestamp: now };
  }

  // 获取对话消息（按时间正序）
  getMessages(conversationId: string, limit?: number): StoredMessage[] {
    const sql = limit
      ? `SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC LIMIT ?`
      : `SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC`;
    const params = limit ? [conversationId, limit] : [conversationId];
    const rows = this.db.query<MessageRow>(sql, params);
    return rows.map(r => ({
      id: r.id,
      conversationId: r.conversation_id,
      role: r.role,
      content: r.content,
      timestamp: r.timestamp,
    }));
  }

  // 获取最近上下文（用于 API 调用，按 token 估算截断，最多 4000 tokens）
  getRecentContext(conversationId: string, maxTokens = 4000): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages = this.getMessages(conversationId);
    const context: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    let tokenCount = 0;

    // 从最近开始倒序取
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'system') continue;
      const estimatedTokens = Math.ceil(msg.content.length / 2); // 粗略估算：1 token ≈ 2 中文字符
      if (tokenCount + estimatedTokens > maxTokens) break;
      context.unshift({ role: msg.role as 'user' | 'assistant', content: msg.content });
      tokenCount += estimatedTokens;
    }

    return context;
  }

  // 搜索消息
  searchMessages(query: string, limit = 50): StoredMessage[] {
    const rows = this.db.query<MessageRow>(
      `SELECT * FROM messages WHERE content LIKE ? ORDER BY timestamp DESC LIMIT ?`,
      [`%${query}%`, limit]
    );
    return rows.map(r => ({
      id: r.id,
      conversationId: r.conversation_id,
      role: r.role,
      content: r.content,
      timestamp: r.timestamp,
    }));
  }
}
