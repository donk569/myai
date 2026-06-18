import { BrowserWindow } from 'electron';
import { FloatingBallManager } from './floating-ball';
import { ChatWindowManager } from './chat-window';

export class WindowManager {
  private floatingBall: FloatingBallManager;
  private chat: ChatWindowManager;

  constructor() {
    this.floatingBall = new FloatingBallManager();
    this.chat = new ChatWindowManager();
  }

  initialize(): void {
    this.floatingBall.create();
    this.chat.create();

    // 加载悬浮球 UI
    const ballWindow = this.floatingBall.getWindow();
    if (ballWindow) {
      if (process.env.NODE_ENV === 'development') {
        ballWindow.loadURL('http://localhost:5173/floating-ball');
      } else {
        ballWindow.loadFile('out/renderer/floating-ball/index.html');
      }
    }

    // 加载聊天窗 UI
    const chatWindow = this.chat.getWindow();
    if (chatWindow) {
      if (process.env.NODE_ENV === 'development') {
        chatWindow.loadURL('http://localhost:5173/chat');
      } else {
        chatWindow.loadFile('out/renderer/chat/index.html');
      }
    }

    // 悬浮球点击 → 切换聊天窗
    const ballWin = this.floatingBall.getWindow();
    ballWin?.webContents.on('ipc-message', (_event: unknown, channel: string) => {
      if (channel === 'ball:click') {
        this.toggleChat();
      }
    });
  }

  toggleChat(): void {
    const ballWindow = this.floatingBall.getWindow();
    if (!ballWindow) return;

    const bounds = ballWindow.getBounds();
    const snapEdge = this.floatingBall.getSnapEdge();
    this.chat.toggle(bounds, snapEdge);
  }

  showBall(): void {
    this.floatingBall.show();
  }

  hideBall(): void {
    this.floatingBall.hide();
  }

  setBallExpression(expression: string): void {
    this.floatingBall.setExpression(expression);
  }

  showBubble(message: string): void {
    this.floatingBall.showBubble(message);
  }

  getChatWindow(): BrowserWindow | null {
    return this.chat.getWindow();
  }

  sendToChat(channel: string, ...args: unknown[]): void {
    this.chat.sendToRenderer(channel, ...args);
  }

  destroyAll(): void {
    this.floatingBall.destroy();
    this.chat.destroy();
  }
}
