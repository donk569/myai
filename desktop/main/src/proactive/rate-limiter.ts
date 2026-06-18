export interface RateLimiterConfig {
  minIntervalMs: number;    // 最小搭话间隔（默认5分钟）
  maxPerDay: number;        // 每天最多搭话次数（默认30次）
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  minIntervalMs: 5 * 60 * 1000,   // 5分钟
  maxPerDay: 30,
};

export class RateLimiter {
  private config: RateLimiterConfig;
  private lastSpeakTime: number = 0;
  private speakCountToday: number = 0;
  private todayDate: string = '';  // YYYY-MM-DD

  constructor(config?: Partial<RateLimiterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.todayDate = this.getToday();
  }

  // 检查是否可以搭话
  canSpeak(): { allowed: boolean; reason?: string } {
    // 重置每日计数器
    const today = this.getToday();
    if (today !== this.todayDate) {
      this.todayDate = today;
      this.speakCountToday = 0;
    }

    // 检查每日上限
    if (this.speakCountToday >= this.config.maxPerDay) {
      return { allowed: false, reason: '达到每日搭话上限' };
    }

    // 检查最小间隔
    const elapsed = Date.now() - this.lastSpeakTime;
    if (this.lastSpeakTime > 0 && elapsed < this.config.minIntervalMs) {
      const remainingMin = Math.ceil((this.config.minIntervalMs - elapsed) / 60000);
      return { allowed: false, reason: `距上次搭话仅${remainingMin}分钟，需等待` };
    }

    return { allowed: true };
  }

  // 记录一次搭话
  recordSpeak(): void {
    this.lastSpeakTime = Date.now();
    this.speakCountToday++;
  }

  // 更新配置
  setInterval(minMs: number): void {
    this.config.minIntervalMs = minMs;
  }

  setMaxPerDay(max: number): void {
    this.config.maxPerDay = max;
  }

  // 获取统计
  getStats(): { remaining: number; cooldownMs: number } {
    const remaining = Math.max(0, this.config.maxPerDay - this.speakCountToday);
    const cooldownMs = Math.max(0, this.config.minIntervalMs - (Date.now() - this.lastSpeakTime));
    return { remaining, cooldownMs };
  }

  private getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
