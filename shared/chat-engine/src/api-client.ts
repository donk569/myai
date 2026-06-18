import type { DeepSeekConfig, Message, ChatOptions, ChatResponse, StreamCallbacks, RetryConfig } from './types';
import { StreamHandler } from './stream-handler';

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

export class DeepSeekClient {
  private config: DeepSeekConfig;
  private retryConfig: RetryConfig;

  constructor(config: DeepSeekConfig, retryConfig?: Partial<RetryConfig>) {
    this.config = {
      baseUrl: config.baseUrl || 'https://api.deepseek.com',
      model: config.model || 'deepseek-chat',
      temperature: config.temperature ?? 0.8,
      maxTokens: config.maxTokens || 2048,
      apiKey: config.apiKey,
    };
    this.retryConfig = { ...DEFAULT_RETRY, ...retryConfig };
  }

  // 非流式聊天
  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const temperature = options?.temperature ?? this.config.temperature;
    const maxTokens = options?.maxTokens ?? this.config.maxTokens;

    return this.withRetry(async () => {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
        signal: options?.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        if (response.status === 401) {
          throw new Error('API Key 无效，请检查设置');
        }
        if (response.status === 429) {
          throw new Error('API 请求过于频繁，请稍后再试');
        }
        if (response.status >= 500) {
          throw new Error(`DeepSeek 服务器错误 (${response.status})`);
        }
        throw new Error(`API 请求失败: ${response.status} — ${errorText}`);
      }

      const data = await response.json() as {
        id: string;
        choices: Array<{ message: { content: string }; finish_reason: string }>;
        usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };

      const choice = data.choices[0];
      if (!choice) {
        throw new Error('API 返回数据异常：无有效回复');
      }

      return {
        id: data.id,
        content: choice.message.content,
        finishReason: choice.finish_reason,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
      };
    });
  }

  // 流式聊天
  async chatStream(messages: Message[], callbacks: StreamCallbacks, options?: ChatOptions): Promise<void> {
    const temperature = options?.temperature ?? this.config.temperature;
    const maxTokens = options?.maxTokens ?? this.config.maxTokens;

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
        signal: options?.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        if (response.status === 401) throw new Error('API Key 无效，请检查设置');
        if (response.status === 429) throw new Error('API 请求过于频繁，请稍后再试');
        throw new Error(`API 请求失败: ${response.status} — ${errorText}`);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      const handler = new StreamHandler(callbacks);
      await handler.processStream(response.body);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        callbacks.onError(new Error('请求已取消'));
        return;
      }
      callbacks.onError(error as Error);
    }
  }

  // 更新配置
  updateConfig(partial: Partial<DeepSeekConfig>): void {
    Object.assign(this.config, partial);
  }

  // 获取当前配置（含 API Key）
  getConfig(): DeepSeekConfig {
    return { ...this.config };
  }

  // 重试逻辑
  private async withRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const err = error as Error;
      const isRetryable =
        err.message.includes('服务器错误') ||
        err.message.includes('过于频繁') ||
        err.message.includes('429') ||
        err.message.includes('5');

      // 只对 429 和 500+ 重试
      if (!isRetryable || attempt >= this.retryConfig.maxRetries) {
        throw error;
      }

      const delay = Math.min(
        this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
        this.retryConfig.maxDelayMs
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.withRetry(fn, attempt + 1);
    }
  }
}
