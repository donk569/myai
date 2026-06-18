import { app } from 'electron';
import { WindowManager } from './window-manager';
import { TrayManager } from './tray';

let windowManager: WindowManager;
let trayManager: TrayManager;

function createApp(): void {
  windowManager = new WindowManager();

  trayManager = new TrayManager({
    onShow: () => windowManager.showBall(),
    onHide: () => windowManager.hideBall(),
    onQuit: () => app.quit(),
    onTogglePrivacy: () => {
      // Privacy switch handled via IPC
    },
  });

  // IPC 占位 — 实际依赖在 ChatEngine/CharacterSystem 等模块创建后注入
  // registerIPCHandlers({ ... });

  windowManager.initialize();
  trayManager.create();
}

app.whenReady().then(createApp);

app.on('window-all-closed', () => {
  // 不退出，悬浮球始终运行
});

app.on('activate', () => {
  windowManager?.showBall();
});

app.on('before-quit', () => {
  trayManager?.destroy();
  windowManager?.destroyAll();
});
