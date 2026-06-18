import { EventEmitter } from 'node:events';
import type { ActiveWindowMonitor } from '../awareness/active-window';
import type { BrowserURLExtractor } from '../awareness/browser-url';
import type { PrivacySwitch } from '../awareness/privacy-switch';
import type { WindowContext } from '../awareness/types';
import type { DeepSeekClient } from '@dudu/chat-engine';
import type { MemoryStore } from '@dudu/memory-system';
import type { CharacterStore } from '@dudu/character-system';
import { RateLimiter } from './rate-limiter';

export interface DecisionResult {
  shouldSpeak: boolean;
  reason: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

export interface DecisionContext {
  activity: WindowContext;
  memories: string[];
  characterName: string;
}

const DECISION_SYSTEM_PROMPT = `你是一个AI桌面伙伴的搭话决策系统。

你的任务：判断是否应该在此时主动向用户说话。

## 搭话规则
- 只在有意义的时候搭话，不要频繁打扰
- 如果用户看起来在工作、浏览网页、写代码等，可以偶尔搭话表示关心
- 如果用户在看视频、开会（检测到会议软件），不要搭话
- 不要对敏感内容（银行/密码/支付）搭话
- 搭话应该是轻松、关心性质的，不是推销或通知

## 输出格式（纯JSON，不要markdown代码块）
{
  "shouldSpeak": true/false,
  "reason": "简短的原因说明",
  "message": "如果搭话，具体说什么（符合角色风格的亲切中文对话）",
  "priority": "low/medium/high"
}`;

export class ProactiveEngine extends EventEmitter {
  private monitor: ActiveWindowMonitor;
  private browserExtractor: BrowserURLExtractor;
  private privacySwitch: PrivacySwitch;
  private aiClient: DeepSeekClient;
  private memoryStore: MemoryStore;
  private characterStore: CharacterStore;
  private rateLimiter: RateLimiter;
  private enabled: boolean = true;

  constructor(
    monitor: ActiveWindowMonitor,
    browserExtractor: BrowserURLExtractor,
    privacySwitch: PrivacySwitch,
    aiClient: DeepSeekClient,
    memoryStore: MemoryStore,
    characterStore: CharacterStore,
  ) {
    super();
    this.monitor = monitor;
    this.browserExtractor = browserExtractor;
    this.privacySwitch = privacySwitch;
    this.aiClient = aiClient;
    this.memoryStore = memoryStore;
    this.characterStore = characterStore;
    this.rateLimiter = new RateLimiter();
  }

  // 启动主动搭话服务
  start(): void {
    this.monitor.on('context-changed', (context: WindowContext) => {
      this.evaluate(context);
    });
  }

  // 停止
  stop(): void {
    this.monitor.removeAllListeners('context-changed');
  }

  // 评估是否搭话
  private async evaluate(context: WindowContext): Promise<void> {
    // 1. 隐私检查
    if (!this.privacySwitch.isEnabled()) return;
    if (!this.enabled) return;

    // 2. 频率检查
    const limitCheck = this.rateLimiter.canSpeak();
    if (!limitCheck.allowed) return;

    // 3. 提取浏览器 URL
    const enrichedContext = this.browserExtractor.extract(context);

    // 4. 跳过明显不该搭话的场景（快速规则）
    if (this.isQuietMode(enrichedContext)) return;

    // 5. 调 AI 决策
    try {
      const result = await this.decide(enrichedContext);
      if (result.shouldSpeak) {
        this.rateLimiter.recordSpeak();
        this.emit('should-speak', {
          message: result.message,
          context: enrichedContext,
          priority: result.priority,
        });
      }
    } catch {
      // AI 决策失败，静默处理
    }
  }

  // AI 决策
  private async decide(context: WindowContext): Promise<DecisionResult> {
    const character = this.characterStore.get();

    // 获取相关记忆
    const memories = this.memoryStore.getRecent(5);
    const memoryText = memories
      .filter(m => m.confidence >= 0.5)
      .map(m => m.content)
      .join('；');

    const userPrompt = `## 用户当前活动
- 应用: ${context.appName}
- 窗口标题: ${context.title}
${context.url ? `- URL: ${context.url}` : ''}

## 用户相关记忆
${memoryText || '暂无已知信息'}

## 角色信息
- 名字: ${character.name}
- 性格: ${character.personality}

请判断是否搭话并生成内容。`;

    const response = await this.aiClient.chat(
      [
        { role: 'system', content: DECISION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 300 }
    );

    return this.parseDecision(response.content);
  }

  private parseDecision(content: string): DecisionResult {
    try {
      let json = content.trim();
      if (json.startsWith('```')) {
        json = json.replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim();
      }
      const parsed = JSON.parse(json) as DecisionResult;

      return {
        shouldSpeak: Boolean(parsed.shouldSpeak),
        reason: parsed.reason || '',
        message: parsed.message || '',
        priority: parsed.priority === 'high' || parsed.priority === 'medium' ? parsed.priority : 'low',
      };
    } catch {
      return { shouldSpeak: false, reason: 'parse_error', message: '', priority: 'low' };
    }
  }

  // 快速规则：某些场景不搭话
  private isQuietMode(context: WindowContext): boolean {
    const silentApps = [
      'zoom', 'teams', 'meet', '会议', 'conference',
      'netflix', 'youtube', 'video', '播放',
      'bank', '银行', 'payment', '支付',
    ];

    const lowerTitle = context.title.toLowerCase();
    const lowerApp = context.appName.toLowerCase();

    return silentApps.some(kw =>
      lowerTitle.includes(kw) || lowerApp.includes(kw)
    );
  }

  // 手动触发搭话（用于测试）
  async triggerManually(context: WindowContext): Promise<DecisionResult> {
    return this.decide(context);
  }

  // 启用/禁用
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled && this.privacySwitch.isEnabled();
  }

  // 更新频率限制
  updateRateLimit(minMs?: number, maxPerDay?: number): void {
    if (minMs) this.rateLimiter.setInterval(minMs);
    if (maxPerDay) this.rateLimiter.setMaxPerDay(maxPerDay);
  }

  getStats() {
    return this.rateLimiter.getStats();
  }
}
