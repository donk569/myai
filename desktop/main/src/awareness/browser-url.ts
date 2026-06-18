import type { WindowContext } from './types';

const BROWSER_PROCESSES = ['chrome.exe', 'msedge.exe', 'firefox.exe', 'brave.exe'];

export class BrowserURLExtractor {
  // 判断是否为浏览器进程
  isBrowser(processName: string): boolean {
    return BROWSER_PROCESSES.includes(processName.toLowerCase());
  }

  // 从浏览器标题提取 URL 线索
  // 浏览器标题通常是 "Page Title - Profile - Browser Name" 或 "Page Title - Browser Name"
  // 无法直接获取完整 URL（需要 CDP），但可以提取页面标题作为上下文
  extract(context: WindowContext): WindowContext {
    if (!this.isBrowser(context.processName)) {
      return context;
    }

    const cleanedTitle = this.cleanTitle(context.title, context.processName);

    // 尝试从标题中提取看起来像 URL 的部分
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const matches = context.title.match(urlPattern);

    return {
      ...context,
      title: cleanedTitle,
      url: matches ? matches[0] : undefined,
    };
  }

  // 清理浏览器标题，去掉浏览器名字后缀
  private cleanTitle(title: string, processName: string): string {
    // 去掉常见的标题后缀
    let cleaned = title;

    const suffixes = [
      ' - Google Chrome',
      ' - Microsoft Edge',
      ' — Mozilla Firefox',
      ' - Chromium',
      ' - Brave',
    ];

    for (const suffix of suffixes) {
      if (cleaned.endsWith(suffix)) {
        cleaned = cleaned.slice(0, -suffix.length);
        break;
      }
    }

    return cleaned.trim();
  }
}
