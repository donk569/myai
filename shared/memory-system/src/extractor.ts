import type { DeepSeekClient } from '@dudu/chat-engine';
import type { ExtractedMemory } from './types';

const EXTRACTION_PROMPT = `你是一个记忆提取系统。从下面的对话中提取关于用户的关键信息。

## 提取类别
- **fact**: 关于用户的事实（如"用户是程序员"、"用户有两只猫"）
- **preference**: 用户的偏好（如"用户喜欢喝咖啡"、"用户不喜欢早起"）
- **event**: 用户提到的重要事件（如"用户下周要面试"、"用户上个月去了日本"）
- **pattern**: 可识别的行为模式（如"用户每天都很晚睡"、"用户经常在工作时听音乐"）

## 规则
- 只提取关于用户的信息，不提取AI说的话
- 每个记忆一句话，简洁明了
- 最多5条
- 置信度 0.0-1.0（根据信息的明确程度）
- 如果没有值得记忆的信息，返回空数组

## 输出格式（纯JSON，不要markdown代码块）
{
  "memories": [
    { "type": "fact", "content": "...", "confidence": 0.9 }
  ]
}

## 对话内容`;

export class MemoryExtractor {
  private client: DeepSeekClient;

  constructor(client: DeepSeekClient) {
    this.client = client;
  }

  // 从消息列表中提取记忆
  async extract(
    messages: Array<{ role: string; content: string }>,
    limit = 10
  ): Promise<ExtractedMemory[]> {
    // 只取最近的消息
    const recent = messages.slice(-limit * 2); // user和AI交替，取2倍
    const userMessages = recent.filter(m => m.role === 'user');
    if (userMessages.length === 0) return [];

    const conversationText = recent
      .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
      .join('\n');

    try {
      const response = await this.client.chat([
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: conversationText },
      ], { temperature: 0.3, maxTokens: 500 });

      return this.parseResponse(response.content);
    } catch {
      // 提取失败不抛异常，返回空数组
      return [];
    }
  }

  // 解析 API 返回
  private parseResponse(content: string): ExtractedMemory[] {
    try {
      // 尝试移除可能的 markdown 代码块
      let json = content.trim();
      if (json.startsWith('```')) {
        json = json.replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(json) as { memories?: ExtractedMemory[] };

      if (!Array.isArray(parsed.memories)) return [];

      return parsed.memories
        .filter(m =>
          m.content &&
          m.content.trim().length > 0 &&
          ['fact', 'preference', 'event', 'pattern'].includes(m.type) &&
          typeof m.confidence === 'number' &&
          m.confidence >= 0 && m.confidence <= 1
        )
        .slice(0, 5) // 最多5条
        .map(m => ({
          type: m.type,
          content: m.content.trim(),
          confidence: m.confidence,
        }));
    } catch {
      return [];
    }
  }
}
