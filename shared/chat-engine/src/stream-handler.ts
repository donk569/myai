import type { StreamCallbacks } from './types';

export class StreamHandler {
  private callbacks: StreamCallbacks;
  private content = '';
  private finishReason = '';
  private id = '';

  constructor(callbacks: StreamCallbacks) {
    this.callbacks = callbacks;
  }

  async processStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6); // 去掉 "data: "
          if (data === '[DONE]') {
            this.callbacks.onComplete({
              id: this.id,
              content: this.content,
              finishReason: this.finishReason,
              usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            });
            return;
          }

          try {
            const parsed = JSON.parse(data) as {
              id: string;
              choices: Array<{
                delta: { content?: string };
                finish_reason: string | null;
              }>;
              usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
            };

            this.id = parsed.id || this.id;

            for (const choice of parsed.choices) {
              const token = choice.delta.content || '';
              if (token) {
                this.content += token;
                this.callbacks.onToken(token);
              }

              if (choice.finish_reason) {
                this.finishReason = choice.finish_reason;
              }
            }
          } catch {
            // 跳过无法解析的行
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // 流结束时通知完成
    this.callbacks.onComplete({
      id: this.id,
      content: this.content,
      finishReason: this.finishReason || 'stop',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });
  }
}
