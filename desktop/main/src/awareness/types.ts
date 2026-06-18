export interface WindowContext {
  title: string;           // 窗口标题
  processName: string;     // 进程名 (e.g. "chrome.exe", "Code.exe")
  appName: string;         // 应用友好名 (e.g. "Google Chrome", "VS Code")
  url?: string;            // 如果是浏览器，提取的 URL
  timestamp: number;       // 检测时间
}

export interface AwarenessState {
  enabled: boolean;
  lastContext: WindowContext | null;
  contextChangedAt: number;
}

export interface PrivacySwitchState {
  enabled: boolean;
  changedAt: number;
}
