import { BrowserWindow, screen } from 'electron';
import * as path from 'node:path';
import { CHAT_WINDOW_WIDTH, CHAT_WINDOW_HEIGHT, FLOATING_BALL_SIZE } from './types';

const GAP = 14; // 嘟嘟与聊天窗间距

export class ChatWindowManager {
  private window: BrowserWindow | null = null;

  create(): BrowserWindow {
    this.window = new BrowserWindow({
      width: CHAT_WINDOW_WIDTH,
      height: CHAT_WINDOW_HEIGHT,
      show: false,
      frame: false,
      transparent: false,
      backgroundColor: '#fff5f7',
      resizable: true,
      skipTaskbar: true,
      hasShadow: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'chat-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // 失焦关闭
    this.window.on('blur', () => {
      if (this.window && !this.window.isDestroyed()) {
        console.log('[CHAT] Close (blur)');
        this.hide();
      }
    });

    console.log('[CHAT] Created');
    return this.window;
  }

  getWindow(): BrowserWindow | null { return this.window; }

  isOpen(): boolean {
    return !!(this.window && !this.window.isDestroyed() && this.window.isVisible());
  }

  // ===========================================================================
  // 智能位置计算
  // ===========================================================================
  reposition(ballBounds: { x: number; y: number; width?: number }): void {
    if (!this.window || this.window.isDestroyed()) return;

    const ballWidth = ballBounds.width || FLOATING_BALL_SIZE;
    const ballHeight = FLOATING_BALL_SIZE;

    // 获取嘟嘟所在屏幕的工作区
    const ballCenterX = ballBounds.x + ballWidth / 2;
    const ballCenterY = ballBounds.y + ballHeight / 2;
    const display = screen.getDisplayNearestPoint({ x: ballCenterX, y: ballCenterY });
    const { x: waX, y: waY, width: waW, height: waH } = display.workArea;

    // 嘟嘟在屏幕中的相对位置
    const leftDist   = ballCenterX - waX;
    const rightDist  = waX + waW - ballCenterX;
    const topDist    = ballCenterY - waY;
    const bottomDist = waY + waH - ballCenterY;

    let chatX: number, chatY: number;
    let direction: string;

    // 决定聊天窗弹出方向：哪边剩余空间大就放哪边
    if (leftDist > rightDist && leftDist > CHAT_WINDOW_WIDTH + GAP) {
      // 嘟嘟靠右 → 聊天窗放左边
      direction = 'Left';
      chatX = ballBounds.x - CHAT_WINDOW_WIDTH - GAP;
    } else if (rightDist > leftDist && rightDist > CHAT_WINDOW_WIDTH + GAP) {
      // 嘟嘟靠左 → 聊天窗放右边
      direction = 'Right';
      chatX = ballBounds.x + ballWidth + GAP;
    } else if (leftDist >= rightDist) {
      // 空间都不够 → 优先放左边（嘟嘟靠右）
      direction = 'Left';
      chatX = waX + 8;
    } else {
      // 空间都不够 → 放右边
      direction = 'Right';
      chatX = waX + waW - CHAT_WINDOW_WIDTH - 8;
    }

    // 竖直方向：聊天窗中心对齐嘟嘟中心
    chatY = ballBounds.y + ballHeight / 2 - CHAT_WINDOW_HEIGHT / 2;

    // 边界约束
    if (chatX < waX) chatX = waX + 8;
    if (chatX + CHAT_WINDOW_WIDTH > waX + waW) chatX = waX + waW - CHAT_WINDOW_WIDTH - 8;
    if (chatY < waY) chatY = waY + 8;
    if (chatY + CHAT_WINDOW_HEIGHT > waY + waH) chatY = waY + waH - CHAT_WINDOW_HEIGHT - 8;

    this.window.setPosition(Math.round(chatX), Math.round(chatY));
    console.log(`[CHAT] Position Update — direction=${direction} ball=(${Math.round(ballBounds.x)},${Math.round(ballBounds.y)}) chat=(${Math.round(chatX)},${Math.round(chatY)})`);
  }

  // ===========================================================================
  // 打开聊天窗
  // ===========================================================================
  open(ballBounds: { x: number; y: number; width?: number }): void {
    if (!this.window || this.window.isDestroyed()) {
      console.log('[CHAT] Window destroyed, recreating');
      this.create();
    }
    if (!this.window) return;

    this.reposition(ballBounds);
    this.window.show();
    this.window.focus();
    this.window.moveTop();
    console.log('[CHAT] Open');
  }

  close(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
      console.log('[CHAT] Hide');
    }
  }

  hide(): void {
    this.window?.hide();
    console.log('[CHAT] Hide');
  }
  hideAll(): void { this.window?.hide(); }

  sendToRenderer(channel: string, ...args: unknown[]): void {
    this.window?.webContents.send(channel, ...args);
  }

  destroy(): void { this.window?.destroy(); this.window = null; }
}
