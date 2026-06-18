import type { Memory, BehaviorPattern } from './types';

export class MemorySummarizer {
  // 当某类记忆 >=3 条时，总结行为模式
  // 注意：不调 API，本地规则匹配。API 总结留给 P2 深度学习功能。
  summarizeByCategory(memories: Memory[]): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];
    const byType = this.groupByType(memories);

    for (const [type, items] of Object.entries(byType)) {
      if (items.length >= 3) {
        const content = items.map(i => i.content).join('；');
        const avgConfidence = items.reduce((s, i) => s + i.confidence, 0) / items.length;

        patterns.push({
          category: type,
          summary: `发现${items.length}条${this.typeLabel(type)}相关记忆: ${content}`,
          evidence: items.map(i => i.content),
          confidence: Math.round(avgConfidence * 100) / 100,
        });
      }
    }

    return patterns;
  }

  // 概括所有记忆的整体情况
  summarize(memories: Memory[]): string {
    if (memories.length === 0) return '暂无关于用户的记忆。';

    const byType = this.groupByType(memories);
    const parts: string[] = [];

    for (const [type, items] of Object.entries(byType)) {
      parts.push(`${this.typeLabel(type)} (${items.length}条)`);
      for (const item of items.slice(0, 3)) {
        parts.push(`  - ${item.content}`);
      }
      if (items.length > 3) {
        parts.push(`  ... 还有 ${items.length - 3} 条`);
      }
    }

    return parts.join('\n');
  }

  private groupByType(memories: Memory[]): Record<string, Memory[]> {
    const grouped: Record<string, Memory[]> = {};
    for (const m of memories) {
      if (!grouped[m.type]) grouped[m.type] = [];
      grouped[m.type].push(m);
    }
    return grouped;
  }

  private typeLabel(type: string): string {
    const labels: Record<string, string> = {
      fact: '事实', preference: '偏好', event: '事件', pattern: '模式',
    };
    return labels[type] || type;
  }
}
