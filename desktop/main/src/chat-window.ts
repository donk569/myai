import { BrowserWindow, screen } from 'electron';
import * as path from 'node:path';
import { CHAT_WINDOW_WIDTH, CHAT_WINDOW_HEIGHT, FLOATING_BALL_SIZE } from './types';
import type { SnapEdge } from './types';

export class ChatWindowManager {
  private window: BrowserWindow | null = null;

  create(): BrowserWindow {
    this.window = new BrowserWindow({
      width: CHAT_WINDOW_WIDTH,
      height: CHAT_WINDOW_HEIGHT,
      show: false,
      frame: false,
      transparent: true,
      resizable: true,
      skipTaskbar: true,
      hasShadow: true,
      webPreferences: {
        preload: path.join(__dirname, '..', '..', 'preload', 'chat-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    this.window.on('blur', () => {
      this.hide();
    });

    return this.window;
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  toggle(ballBounds: { x: number; y: number }, snapEdge: SnapEdge): void {
    if (!this.window) return;

    if (this.window.isVisible()) {
      this.hide();
    } else {
      this.show(ballBounds, snapEdge);
    }
  }

  show(ballBounds: { x: number; y: number }, snapEdge: SnapEdge): void {
    if (!this.window) return;

    const display = screen.getPrimaryDisplay();
    const screenWidth = display.workAreaSize.width;
    const screenHeight = display.workAreaSize.height;

    // 悬浮球旁弹出
    let chatX: number;
    if (snapEdge === 'left') {
      chatX = ballBounds.x + FLOATING_BALL_SIZE + 8;
    } else {
      chatX = ballBounds.x - CHAT_WINDOW_WIDTH - 8;
    }

    // 确保不超出屏幕
    chatX = Math.max(0, Math.min(chatX, screenWidth - CHAT_WINDOW_WIDTH));
    const chatY = Math.max(0, Math.min(
      ballBounds.y + FLOATING_BALL_SIZE / 2 - CHAT_WINDOW_HEIGHT / 2,
      screenHeight - CHAT_WINDOW_HEIGHT
    ));

    this.window.setPosition(chatX, chatY);
    this.window.show();
    this.window.focus();
  }

  hide(): void {
    this.window?.hide();
  }

  sendToRenderer(channel: string, ...args: unknown[]): void {
    this.window?.webContents.send(channel, ...args);
  }

  destroy(): void {
    this.window?.destroy();
    this.window = null;
  }
}
