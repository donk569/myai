import { EventEmitter } from 'node:events';
import type { WindowContext } from './types';

// active-win 的类型声明
interface ActiveWinResult {
  title: string;
  owner: {
    name: string;      // 进程名
    processId: number;
  };
}

export interface ActiveWindowMonitorEvents {
  'context-changed': (context: WindowContext) => void;
}

export class ActiveWindowMonitor extends EventEmitter {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastContext: WindowContext | null = null;
  private activeWinModule: (() => Promise<ActiveWinResult | undefined>) | null = null;
  private intervalMs: number;

  constructor(intervalMs = 5000) {
    super();
    this.intervalMs = intervalMs;
  }

  // 启动监控
  async start(): Promise<void> {
    try {
      // @ts-expect-error: active-win is an optional runtime dependency, no types bundled
      const mod = await import('active-win');
      this.activeWinModule = (mod.default || mod) as () => Promise<ActiveWinResult | undefined>;
    } catch {
      // active-win 不可用时降级为空实现
      console.warn('[Awareness] active-win module not available, running in degraded mode');
      this.activeWinModule = null;
    }

    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.poll();
    }, this.intervalMs);

    // 立刻执行一次
    await this.poll();
  }

  // 停止监控
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // 立即获取当前上下文
  async getCurrentContext(): Promise<WindowContext | null> {
    return this.fetchContext();
  }

  // 获取上次上下文
  getLastContext(): WindowContext | null {
    return this.lastContext;
  }

  // 轮询
  private async poll(): Promise<void> {
    const context = await this.fetchContext();
    if (!context) return;

    // 检测是否有变化
    const changed = !this.lastContext ||
      this.lastContext.title !== context.title ||
      this.lastContext.processName !== context.processName;

    if (changed) {
      this.lastContext = context;
      this.emit('context-changed', context);
    }
  }

  // 获取当前窗口信息
  private async fetchContext(): Promise<WindowContext | null> {
    try {
      if (!this.activeWinModule) return null;

      const win = (await this.activeWinModule()) as ActiveWinResult | undefined;
      if (!win || !win.title) return null;

      return {
        title: win.title,
        processName: win.owner?.name || '',
        appName: this.extractAppName(win.owner?.name || ''),
        url: undefined, // URL 提取由 BrowserURL 单独处理
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  private extractAppName(processName: string): string {
    const nameMap: Record<string, string> = {
      'chrome.exe': 'Google Chrome',
      'msedge.exe': 'Microsoft Edge',
      'firefox.exe': 'Firefox',
      'Code.exe': 'VS Code',
      'devenv.exe': 'Visual Studio',
      'explorer.exe': '文件资源管理器',
      'WeChat.exe': '微信',
      'notepad.exe': '记事本',
    };
    return nameMap[processName] || processName.replace('.exe', '');
  }
}
