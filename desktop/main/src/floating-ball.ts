import { BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'node:path';
import { FLOATING_BALL_SIZE } from './types';
import type { SnapEdge } from './types';

export class FloatingBallManager {
  private window: BrowserWindow | null = null;
  private snapEdge: SnapEdge = 'right';
  private isDragging = false;
  private dragStartPoint = { x: 0, y: 0 };
  private windowStartPoint = { x: 0, y: 0 };

  create(): BrowserWindow {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    this.window = new BrowserWindow({
      width: FLOATING_BALL_SIZE,
      height: FLOATING_BALL_SIZE,
      x: screenWidth - FLOATING_BALL_SIZE - 10,
      y: Math.round(screenHeight / 2 - FLOATING_BALL_SIZE / 2),
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      type: 'toolbar',
      webPreferences: {
        preload: path.join(__dirname, '..', '..', 'preload', 'floating-ball-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.setupDragHandlers();
    this.setupIPCHandlers();
    return this.window;
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  getSnapEdge(): SnapEdge {
    return this.snapEdge;
  }

  show(): void {
    this.window?.show();
  }

  hide(): void {
    this.window?.hide();
  }

  setExpression(expression: string): void {
    this.window?.webContents.send('ball:set-expression', expression);
  }

  showBubble(message: string, duration = 10000): void {
    this.window?.webContents.send('ball:show-bubble', { message, duration });
  }

  destroy(): void {
    this.window?.destroy();
    this.window = null;
  }

  private setupDragHandlers(): void {
    if (!this.window) return;

    // mousedown: 开始拖拽
    this.window.webContents.on('ipc-message', (_event: unknown, channel: string) => {
      if (channel === 'ball:drag-start') {
        this.isDragging = true;
        const bounds = this.window!.getBounds();
        this.windowStartPoint = { x: bounds.x, y: bounds.y };
        this.dragStartPoint = screen.getCursorScreenPoint();
      }
    });

    // 鼠标移动: 更新窗口位置
    this.window.on('move', () => {
      if (!this.isDragging) return;
      const cursor = screen.getCursorScreenPoint();
      const dx = cursor.x - this.dragStartPoint.x;
      const dy = cursor.y - this.dragStartPoint.y;
      this.windowStartPoint.x += dx;
      this.windowStartPoint.y += dy;
      this.dragStartPoint = cursor;
      this.window?.setPosition(this.windowStartPoint.x, this.windowStartPoint.y);
    });

    // mouseup: 结束拖拽，吸边
    ipcMain.on('ball:drag-end', () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.snapToEdge();
    });
  }

  private setupIPCHandlers(): void {
    ipcMain.on('ball:click', () => {
      // 由 WindowManager 处理
    });
  }

  private snapToEdge(): void {
    if (!this.window) return;
    const bounds = this.window.getBounds();
    const display = screen.getPrimaryDisplay();
    const screenWidth = display.workAreaSize.width;
    const centerX = screenWidth / 2;

    const snapX = bounds.x + FLOATING_BALL_SIZE / 2 < centerX
      ? 10
      : screenWidth - FLOATING_BALL_SIZE - 10;

    // 限制 Y 不出屏
    const minY = 10;
    const maxY = display.workAreaSize.height - FLOATING_BALL_SIZE - 10;
    const snapY = Math.max(minY, Math.min(maxY, bounds.y));

    this.snapEdge = snapX < centerX ? 'left' : 'right';
    this.window.setPosition(snapX, snapY);
  }
}
