/**
 * 嘟嘟 (Dudu) — Electron 主进程入口
 * 启动顺序：DB → 角色 → 引擎 → 记忆 → 桌面感知 → 窗口 → IPC → 托盘
 */
import { app, BrowserWindow } from 'electron';
import { createAppContext } from './integration';
import { registerIPCHandlers } from './ipc-handlers';
import type { AppContext } from './integration';

// ========== 单实例锁 ==========
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  console.log('[APP] Existing Instance Found — Focus Existing Window');
  app.quit();
} else {
  console.log('[APP] Main Instance Started');
}

let ctx: AppContext | null = null;

// ========== 安全模式 ==========
const SAFE_MODE = process.argv.includes('--safe-mode');
if (SAFE_MODE) {
  console.log('[SAFE MODE] 安全模式已启用 — 仅保留聊天、设置、托盘');
}

// 第二实例启动 → 激活已有窗口
app.on('second-instance', () => {
  console.log('[APP] Existing Instance Found — Focus Existing Window');
  if (ctx) {
    ctx.windowManager.showAll();
  }
});

function bootstrap(): void {
  // 1. 创建所有模块实例并连接
  ctx = createAppContext();

  // 2. 注册 IPC（连接渲染器 ↔ 引擎）
  registerIPCHandlers({
    windowManager: ctx.windowManager,
    conversationManager: ctx.conversationManager,
    characterStore: ctx.characterStore,
    aiClient: ctx.aiClient,
    memoryStore: ctx.memoryStore,
    memoryExtractor: ctx.memoryExtractor,
    privacySwitch: ctx.privacySwitch,
    db: ctx.db,
    settingsManager: ctx.settingsManager,
  });

  // 3. 创建窗口（悬浮球 + 聊天窗）
  ctx.windowManager.initialize();

  // 3.5 恢复视觉状态（主题 — 等窗口加载完成后）
  setTimeout(() => {
    ctx!.settingsManager.applyStartup();
  }, 1500);

  // 4. 创建系统托盘
  ctx.trayManager.create();

  // 4.5 注册全局快捷键
  const hotkeyResult = ctx.hotkeyManager.registerAll();
  if (!hotkeyResult.success) {
    console.warn('[HOTKEY] 部分快捷键未注册: ' + hotkeyResult.conflicts.join(', '));
  }

  // 5. 启动桌面感知 + 主动搭话（后台）— 安全模式下跳过
  if (!SAFE_MODE) {
    ctx.awareness.start().catch((err: Error) => {
      console.warn('[Dudu] Awareness start failed:', err.message);
    });

    ctx.proactive.start();

    ctx.proactive.on('should-speak', (data: { message: string }) => {
      ctx!.windowManager.showBubble(data.message);
    });
  } else {
    console.log('[SAFE MODE] 桌面感知和主动搭话已禁用');
  }

  // 6. 定期记忆衰减（每小时）
  setInterval(() => {
    ctx?.memoryStore.applyDecay();
  }, 60 * 60 * 1000);

  console.log('[APP] Startup Complete');
  console.log('[APP] Config Loaded — keys=' + Object.keys(ctx.settingsManager.getAll()).length);
  console.log('[APP] Config Applied');
}

// ========== App 生命周期 ==========

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  // 不退出，悬浮球始终在桌面
});

app.on('activate', () => {
  ctx?.windowManager.showBall();
});

app.on('before-quit', () => {
  ctx?.hotkeyManager.unregisterAll();
  ctx?.windowManager.saveAllState?.();
  ctx?.awareness.stop();
  ctx?.proactive.stop();
  ctx?.trayManager.destroy();
  ctx?.windowManager.destroyAll();
  ctx?.db.close();
});
