/**
 * SettingsManager — 所有设置的读写、应用、持久化中心
 */
import type { DuduDatabase } from '@dudu/storage';
import type { WindowManager } from './window-manager';
import type { DeepSeekClient } from '@dudu/chat-engine';

export interface AllSettings {
  autoStart: boolean;
  showOnStart: boolean;
  alwaysOnTop: boolean;
  autoHide: boolean;
  animEnabled: boolean;
  debugMode: boolean;
  darkMode: boolean;
  doubleClickAction: string;
  dragEnabled: boolean;
  snapEnabled: boolean;
  clickThrough: boolean;
  apiProvider: string;
  apiKey: string;
  apiBaseUrl: string;
  apiModel: string;
  apiTemperature: number;
  apiMaxTokens: number;
}

const DEFAULTS: AllSettings = {
  autoStart: false, showOnStart: true, alwaysOnTop: true,
  autoHide: false,
  animEnabled: true, debugMode: true, darkMode: false,
  doubleClickAction: 'chat', dragEnabled: true,
  snapEnabled: false, clickThrough: false,
  apiProvider: 'deepseek', apiKey: '',
  apiBaseUrl: 'https://api.deepseek.com', apiModel: 'deepseek-chat',
  apiTemperature: 0.8, apiMaxTokens: 2048,
};

export class SettingsManager {
  private db: DuduDatabase;
  private wm: WindowManager | null = null;
  private aiClient: DeepSeekClient | null = null;
  private cache: AllSettings = { ...DEFAULTS };

  constructor(db: DuduDatabase) { this.db = db; this.loadAll(); }
  setWindowManager(wm: WindowManager): void { this.wm = wm; }
  setAIClient(c: DeepSeekClient): void { this.aiClient = c; }

  /** 启动时恢复视觉状态 */
  applyStartup(): void {
    this.apply({ darkMode: this.cache.darkMode });
  }

  loadAll(): AllSettings {
    for (const [k, v] of Object.entries(DEFAULTS)) {
      const row = this.db.get<{ value: string }>('SELECT value FROM config WHERE key = ?', ['settings.' + k]);
      if (row) {
        const val: unknown = typeof v === 'boolean' ? row.value === 'true' : typeof v === 'number' ? parseFloat(row.value) : row.value;
        (this.cache as unknown as Record<string, unknown>)[k] = val;
      }
    }
    return { ...this.cache };
  }

  getAll(): AllSettings { return { ...this.cache }; }

  async save(partial: Partial<AllSettings>): Promise<boolean> {
    for (const [k, v] of Object.entries(partial)) {
      if (!(k in DEFAULTS)) continue;
      (this.cache as unknown as Record<string, unknown>)[k] = v;
      this.db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', ['settings.' + k, String(v)]);
    }
    this.apply(partial);
    return true;
  }

  reset(): AllSettings {
    this.cache = { ...DEFAULTS };
    this.db.exec("DELETE FROM config WHERE key LIKE 'settings.%'");
    this.apply(this.cache);
    return this.getAll();
  }

  apply(settings: Partial<AllSettings>): void {
    if ('alwaysOnTop' in settings && this.wm) this.wm.setAlwaysOnTop(settings.alwaysOnTop!);
    if ('darkMode' in settings && this.wm) this.wm.setDarkMode(settings.darkMode!);
    if ('snapEnabled' in settings && this.wm) this.wm.setSnapEnabled(settings.snapEnabled!);
    if ('animEnabled' in settings && this.wm) this.wm.setAnimEnabled(settings.animEnabled!);
    if ('clickThrough' in settings && this.wm) this.wm.setClickThrough(settings.clickThrough!);
    if (this.aiClient) {
      const apiChanged = settings.apiKey !== undefined || settings.apiBaseUrl !== undefined || settings.apiModel !== undefined || settings.apiTemperature !== undefined || settings.apiMaxTokens !== undefined;
      if (apiChanged) this.aiClient.updateConfig({ apiKey: this.cache.apiKey, baseUrl: this.cache.apiBaseUrl, model: this.cache.apiModel, temperature: this.cache.apiTemperature, maxTokens: this.cache.apiMaxTokens });
    }
  }

  async setAutoStart(enabled: boolean): Promise<boolean> {
    try {
      const { app } = require('electron');
      app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath });
      await this.save({ autoStart: enabled });
      return true;
    } catch (err) { return false; }
  }
}
