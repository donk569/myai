import { BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'node:path';
import { FLOATING_BALL_SIZE } from './types';

export class FloatingBallManager {
  private window: BrowserWindow | null = null;
  private snapEnabled = false;
  public onMove: ((bounds: { x: number; y: number }) => void) | null = null;

  setSnapEnabled(v: boolean): void { this.snapEnabled = v; }

  create(): BrowserWindow {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    this.window = new BrowserWindow({
      width: FLOATING_BALL_SIZE,
      height: FLOATING_BALL_SIZE,
      x: screenWidth - FLOATING_BALL_SIZE - 20,
      y: Math.round(screenHeight / 2 - FLOATING_BALL_SIZE / 2),
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      hasShadow: false,
      type: 'toolbar',
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'floating-ball-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // 防止白屏闪烁：HTML 加载完成后再显示
    this.window.once('ready-to-show', () => {
      this.window?.show();
    });

    this.setupDragHandlers();
    console.log('[DUDU] Floating ball created');
    return this.window;
  }

  getWindow(): BrowserWindow | null { return this.window; }
  getPosition(): { x: number; y: number } {
    if (!this.window) return { x: 0, y: 0 };
    const [x, y] = this.window.getPosition();
    return { x, y };
  }
  getBounds(): { x: number; y: number; width: number; height: number } {
    if (!this.window) return { x: 0, y: 0, width: 0, height: 0 };
    return this.window.getBounds();
  }

  show(): void { this.window?.show(); }
  hide(): void { this.window?.hide(); }

  setExpression(expression: string): void {
    this.window?.webContents.send('ball:set-expression', expression);
  }

  showBubble(message: string, duration = 10000): void {
    this.window?.webContents.send('ball:show-bubble', { message, duration });
  }

  destroy(): void { this.window?.destroy(); this.window = null; }

  // ===========================================================================
  // 拖拽处理 — 增量移动，不吸边，自由停在任意位置
  // ===========================================================================
  private setupDragHandlers(): void {
    ipcMain.on('ball:move', (_event, data: { dx: number; dy: number }) => {
      if (!this.window) return;
      const [x, y] = this.window.getPosition();
      const newX = x + Math.round(data.dx);
      const newY = y + Math.round(data.dy);

      // 边界约束：至少留 10px 在可视区域内
      const display = screen.getDisplayNearestPoint({ x: newX, y: newY });
      const { x: waX, y: waY, width: waW, height: waH } = display.workArea;
      const clampedX = Math.max(waX - FLOATING_BALL_SIZE + 10, Math.min(waX + waW - 10, newX));
      const clampedY = Math.max(waY - FLOATING_BALL_SIZE + 10, Math.min(waY + waH - 10, newY));

      this.window.setPosition(clampedX, clampedY);

      // 通知聊天窗跟随
      const bounds = this.window.getBounds();
      this.onMove?.(bounds);
    });

    // 拖拽结束 → 如果开启吸附则吸边
    ipcMain.on('ball:drag-end', () => {
      console.log('[DUDU] Drag End (snap=' + this.snapEnabled + ')');
      if (this.snapEnabled) this.snapToEdge();
    });
  }

  private snapToEdge(): void {
    if (!this.window) return;
    const bounds = this.window.getBounds();
    const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
    const { x: waX, width: waW } = display.workArea;
    const centerX = waX + waW / 2;
    const ballCenterX = bounds.x + FLOATING_BALL_SIZE / 2;
    const snapX = ballCenterX < centerX ? waX + 10 : waX + waW - FLOATING_BALL_SIZE - 10;
    const minY = display.workArea.y + 10;
    const maxY = display.workArea.y + display.workAreaSize.height - FLOATING_BALL_SIZE - 10;
    this.window.setPosition(snapX, Math.max(minY, Math.min(maxY, bounds.y)));
  }
}
