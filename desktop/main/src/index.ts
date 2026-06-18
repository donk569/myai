/**
 * 嘟嘟 (Dudu) — Electron 主进程入口
 * 启动顺序：DB → 角色 → 引擎 → 记忆 → 桌面感知 → 窗口 → IPC → 托盘
 */
import { app } from 'electron';
import { createAppContext } from './integration';
import { registerIPCHandlers } from './ipc-handlers';
import type { AppContext } from './integration';

let ctx: AppContext | null = null;

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
  });

  // 3. 创建窗口（悬浮球 + 聊天窗）
  ctx.windowManager.initialize();

  // 4. 创建系统托盘
  ctx.trayManager.create();

  // 5. 启动桌面感知 + 主动搭话（后台）
  ctx.awareness.start().catch((err: Error) => {
    console.warn('[Dudu] Awareness start failed:', err.message);
  });

  ctx.proactive.start();

  // 监听搭话事件 → 悬浮球上方气泡
  ctx.proactive.on('should-speak', (data: { message: string }) => {
    ctx!.windowManager.showBubble(data.message);
  });

  // 6. 定期记忆衰减（每小时）
  setInterval(() => {
    ctx?.memoryStore.applyDecay();
  }, 60 * 60 * 1000);
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
  ctx?.awareness.stop();
  ctx?.proactive.stop();
  ctx?.trayManager.destroy();
  ctx?.windowManager.destroyAll();
  ctx?.db.close();
});
