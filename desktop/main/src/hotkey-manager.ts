/**
 * HotkeyManager — 全局快捷键管理
 * 使用 Electron globalShortcut API，系统级别响应
 */
import { globalShortcut } from 'electron';

export interface HotkeyCallbacks {
  toggleDudu: () => void;
  toggleChat: () => void;
  openSettings: () => void;
}

interface HotkeyEntry {
  accelerator: string;
  action: string;
  handler: () => void;
}

export class HotkeyManager {
  private callbacks: HotkeyCallbacks;
  private registered: HotkeyEntry[] = [];
  private enabled = false;

  constructor(callbacks: HotkeyCallbacks) {
    this.callbacks = callbacks;
  }

  /** 注册所有快捷键，返回注册结果 */
  registerAll(): { success: boolean; conflicts: string[] } {
    if (this.enabled) return { success: true, conflicts: [] };

    const shortcuts: HotkeyEntry[] = [
      {
        accelerator: 'CommandOrControl+Shift+D',
        action: 'Toggle Dudu',
        handler: () => {
          console.log('[HOTKEY] Toggle Dudu');
          this.callbacks.toggleDudu();
        },
      },
      {
        accelerator: 'CommandOrControl+Shift+C',
        action: 'Toggle Chat',
        handler: () => {
          console.log('[HOTKEY] Toggle Chat');
          this.callbacks.toggleChat();
        },
      },
      {
        accelerator: 'CommandOrControl+Shift+S',
        action: 'Open Settings',
        handler: () => {
          console.log('[HOTKEY] Open Settings');
          this.callbacks.openSettings();
        },
      },
    ];

    const conflicts: string[] = [];

    for (const entry of shortcuts) {
      const ok = globalShortcut.register(entry.accelerator, entry.handler);
      if (ok) {
        this.registered.push(entry);
        console.log(`[HOTKEY] Registered: ${entry.accelerator} → ${entry.action}`);
      } else {
        conflicts.push(entry.accelerator);
        console.warn(`[HOTKEY] FAILED: ${entry.accelerator} (可能被其他程序占用)`);
      }
    }

    this.enabled = this.registered.length > 0;
    console.log(`[HOTKEY] ${this.registered.length}/${shortcuts.length} 快捷键注册成功`);
    return { success: this.enabled, conflicts };
  }

  /** 检查某个快捷键是否已注册 */
  isRegistered(accelerator: string): boolean {
    return globalShortcut.isRegistered(accelerator);
  }

  /** 释放所有快捷键 */
  unregisterAll(): void {
    globalShortcut.unregisterAll();
    this.registered = [];
    this.enabled = false;
    console.log('[HOTKEY] All unregistered');
  }
}
