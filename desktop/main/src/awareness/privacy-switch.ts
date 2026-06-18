export class PrivacySwitch {
  private enabled: boolean = true; // 默认开启（允许桌面感知）
  private changedAt: number = Date.now();

  // 获取当前状态
  isEnabled(): boolean {
    return this.enabled;
  }

  // 启用
  enable(): void {
    if (!this.enabled) {
      this.enabled = true;
      this.changedAt = Date.now();
    }
  }

  // 禁用
  disable(): void {
    if (this.enabled) {
      this.enabled = false;
      this.changedAt = Date.now();
    }
  }

  // 切换状态，返回新状态
  toggle(): boolean {
    this.enabled = !this.enabled;
    this.changedAt = Date.now();
    return this.enabled;
  }

  // 获取状态变更时间
  getChangedAt(): number {
    return this.changedAt;
  }

  // 获取状态快照
  getState(): { enabled: boolean; changedAt: number } {
    return {
      enabled: this.enabled,
      changedAt: this.changedAt,
    };
  }
}
