/**
 * 嘟嘟 (Dudu) — 应用集成层
 * 连接所有模块：DB → 角色 → 引擎 → 记忆 → 桌面感知 → IPC → 渲染器
 */
import * as path from 'node:path';
import { app } from 'electron';
import { DuduDatabase, runMigrations, FileStore } from '@dudu/storage';
import { CharacterStore } from '@dudu/character-system';
import { DeepSeekClient, ConversationManager, buildSystemPrompt } from '@dudu/chat-engine';
import { MemoryStore, MemoryExtractor, MemorySummarizer } from '@dudu/memory-system';
import { WindowManager } from './window-manager';
import { TrayManager } from './tray';
import { registerIPCHandlers } from './ipc-handlers';
import { ActiveWindowMonitor } from './awareness/active-window';
import { BrowserURLExtractor } from './awareness/browser-url';
import { PrivacySwitch } from './awareness/privacy-switch';
import { ProactiveEngine } from './proactive/decision-engine';
import type { DeepSeekConfig } from '@dudu/chat-engine';

export interface AppContext {
  db: DuduDatabase;
  fileStore: FileStore;
  characterStore: CharacterStore;
  aiClient: DeepSeekClient;
  conversationManager: ConversationManager;
  memoryStore: MemoryStore;
  memoryExtractor: MemoryExtractor;
  memorySummarizer: MemorySummarizer;
  windowManager: WindowManager;
  trayManager: TrayManager;
  awareness: ActiveWindowMonitor;
  browserExtractor: BrowserURLExtractor;
  privacySwitch: PrivacySwitch;
  proactive: ProactiveEngine;
}

export function createAppContext(): AppContext {
  // --- 1. 存储层 ---
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'dudu.db');
  const db = new DuduDatabase({ dbPath });

  // 运行数据库迁移
  runMigrations(db);

  const fileStore = new FileStore(path.join(userDataPath, 'files'));

  // --- 2. 角色系统 ---
  const characterStore = new CharacterStore(db);

  // --- 3. AI 引擎 ---
  // 从 config 表读取 API 配置，无则用默认值
  const apiKey = getConfig(db, 'api.key', '');
  const apiBaseUrl = getConfig(db, 'api.base_url', 'https://api.deepseek.com');
  const temperature = parseFloat(getConfig(db, 'api.temperature', '0.8'));
  const maxTokens = parseInt(getConfig(db, 'api.max_tokens', '2048'), 10);

  const aiConfig: DeepSeekConfig = {
    apiKey,
    baseUrl: apiBaseUrl,
    model: 'deepseek-chat',
    temperature,
    maxTokens,
  };
  const aiClient = new DeepSeekClient(aiConfig);

  // 对话管理
  const conversationManager = new ConversationManager(db);

  // --- 4. 记忆系统 ---
  const memoryStore = new MemoryStore(db);
  const memoryExtractor = new MemoryExtractor(aiClient);
  const memorySummarizer = new MemorySummarizer();

  // --- 5. 桌面感知 ---
  const awareness = new ActiveWindowMonitor(5000);
  const browserExtractor = new BrowserURLExtractor();
  const privacySwitch = new PrivacySwitch();

  // --- 6. 主动搭话 ---
  const proactive = new ProactiveEngine(
    awareness,
    browserExtractor,
    privacySwitch,
    aiClient,
    memoryStore,
    characterStore,
  );

  // --- 7. 窗口管理 ---
  const windowManager = new WindowManager();

  // --- 8. 系统托盘 ---
  const trayManager = new TrayManager({
    onShow: () => windowManager.showBall(),
    onHide: () => windowManager.hideBall(),
    onQuit: () => app.quit(),
    onTogglePrivacy: () => {
      const newState = privacySwitch.toggle();
      trayManager.setPrivacyChecked(newState);
    },
  });

  return {
    db, fileStore,
    characterStore,
    aiClient, conversationManager,
    memoryStore, memoryExtractor, memorySummarizer,
    windowManager, trayManager,
    awareness, browserExtractor, privacySwitch,
    proactive,
  };
}

function getConfig(db: DuduDatabase, key: string, defaultValue: string): string {
  const row = db.get<{ value: string }>('SELECT value FROM config WHERE key = ?', [key]);
  return row?.value ?? defaultValue;
}
