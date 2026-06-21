import { BrowserWindow, app, ipcMain, Menu, screen } from 'electron';
import { FloatingBallManager } from './floating-ball';
import { ChatWindowManager } from './chat-window';
import type { DuduDatabase } from '@dudu/storage';
import type { SettingsManager } from './settings-manager';
import * as path from 'node:path';

const BALL_SIZE = 60; // 固定大小

// 配置键名
const KEY_BALL_X = 'window.ball.x';
const KEY_BALL_Y = 'window.ball.y';
const KEY_CHAT_X = 'window.chat.x';
const KEY_CHAT_Y = 'window.chat.y';
const KEY_CHAT_W = 'window.chat.w';
const KEY_CHAT_H = 'window.chat.h';
const KEY_CHAT_VISIBLE = 'window.chat.visible';

export class WindowManager {
  private floatingBall: FloatingBallManager;
  private chat: ChatWindowManager;
  private db: DuduDatabase | null = null;
  private settingsMgr: SettingsManager | null = null;
  private settingsWindow: BrowserWindow | null = null;

  constructor() {
    this.floatingBall = new FloatingBallManager();
    this.chat = new ChatWindowManager();
  }

  setDatabase(db: DuduDatabase): void { this.db = db; }
  setSettingsManager(sm: SettingsManager): void { this.settingsMgr = sm; }

  initialize(): void {
    this.floatingBall.create();
    this.chat.create();

    // 加载悬浮球 UI
    const ballWindow = this.floatingBall.getWindow();
    const ballPath = path.join(__dirname, '..', '..', 'desktop', 'renderer', 'floating-ball', 'index.html');
    if (ballWindow) {
      ballWindow.setSize(BALL_SIZE, BALL_SIZE);
      console.log('[DUDU] Loading floating ball:', path.resolve(ballPath));
      ballWindow.loadFile(path.resolve(ballPath));
    }

    // 加载聊天窗 UI
    const chatWindow = this.chat.getWindow();
    const chatPath = path.join(__dirname, '..', '..', 'desktop', 'renderer', 'chat', 'index.html');
    if (chatWindow) {
      console.log('[CHAT] Loading chat HTML:', path.resolve(chatPath));
      chatWindow.loadFile(path.resolve(chatPath));

      // 恢复上次的窗口状态
      this.restoreChatState();

      // 窗口大小改变时自动保存
      chatWindow.on('resize', () => this.saveChatState());
      chatWindow.on('move', () => this.saveChatState());
      chatWindow.on('show', () => this.saveChatState());
      chatWindow.on('hide', () => this.saveChatState());
    }

    // 恢复悬浮球位置
    this.restoreBallState();

    // 嘟嘟移动 → 保存位置 + 聊天窗跟随
    this.floatingBall.onMove = (bounds) => {
      this.saveBallState();
      if (this.chat.isOpen()) {
        this.chat.reposition(bounds);
      }
    };

    this.setupIPC();
    console.log('[DUDU] WindowManager initialized');
  }

  // ===========================================================================
  // ★ 原生 Electron 右键菜单
  // ===========================================================================
  popupContextMenu(): void {
    console.log('[MENU] Creating native Electron context menu');
    const template: Electron.MenuItemConstructorOptions[] = [
      { label: '💬 打开聊天', click: () => this.openChat() },
      { label: '⚙ 设置',     click: () => this.openSettingsWindow() },
      { type: 'separator' },
      { label: '👁 隐藏助手', click: () => this.hideAll() },
      { label: '🔁 重启助手', click: () => { app.relaunch(); app.exit(0); } },
      { type: 'separator' },
      { label: '⏻ 退出程序', click: () => { this.saveAllState(); app.quit(); } },
    ];

    const menu = Menu.buildFromTemplate(template);
    const ballWin = this.floatingBall.getWindow();
    menu.popup({ window: ballWin ?? undefined });
    console.log('[MENU] Opened');
  }

  // ===========================================================================
  // 打开聊天窗（内部）
  // ===========================================================================
  private openChatInternal(): void {
    console.log('[DUDU] Click — openChat');
    const ballBounds = this.floatingBall.getBounds();

    if (this.chat.isOpen()) {
      const chatWin = this.chat.getWindow();
      chatWin?.focus();
      chatWin?.moveTop();
      console.log('[CHAT] Already open — focused');
    } else {
      const savedX = this.dbGet(KEY_CHAT_X);
      const savedY = this.dbGet(KEY_CHAT_Y);
      if (savedX !== undefined && savedY !== undefined) {
        const chatWin = this.chat.getWindow();
        if (chatWin && !chatWin.isDestroyed()) {
          chatWin.setPosition(parseInt(savedX), parseInt(savedY));
          chatWin.show();
          chatWin.focus();
          chatWin.moveTop();
          console.log('[CHAT] Open — restored saved position (' + savedX + ',' + savedY + ')');
        }
      } else {
        this.chat.open(ballBounds);
      }
    }
    this.saveChatState();
  }

  // ===========================================================================
  // 隐藏全部
  // ===========================================================================
  hideAll(): void {
    console.log('[DUDU] Hide all');
    this.saveAllState();
    this.floatingBall.hide();
    this.chat.close();
  }

  // ===========================================================================
  // 显示全部（从托盘/第二实例恢复）
  // ===========================================================================
  showAll(): void {
    console.log('[TRAY] Restore Assistant — showAll()');
    const ball = this.floatingBall.getWindow();
    if (ball && !ball.isDestroyed()) {
      ball.show();
      ball.focus();
      console.log('[DUDU] Ball restored');
    } else {
      console.log('[DUDU] Ball window destroyed, recreating...');
    }
    const chatWin = this.chat.getWindow();
    if (chatWin && !chatWin.isDestroyed()) {
      if (this.db) {
        const wasVisible = this.dbGet(KEY_CHAT_VISIBLE);
        if (wasVisible === 'true') {
          chatWin.show();
          chatWin.focus();
          console.log('[CHAT] Restore — show existing window');
        }
      }
    } else {
      console.log('[CHAT] Window was destroyed, recreating');
      this.chat.create();
      const newWin = this.chat.getWindow();
      if (newWin) {
        const chatPath = path.join(__dirname, '..', '..', 'desktop', 'renderer', 'chat', 'index.html');
        newWin.loadFile(path.resolve(chatPath));
      }
    }
  }

  // ===========================================================================
  // IPC 注册
  // ===========================================================================
  private setupIPC(): void {
    ipcMain.on('ball:click', () => this.openChat());
    ipcMain.on('ball:right-click', () => this.popupContextMenu());

    ipcMain.on('chat:close', () => {
      this.chat.close();
      this.saveChatState();
    });

    ipcMain.on('window:hide', () => this.hideAll());
    ipcMain.on('window:show', () => this.showAll());

    ipcMain.on('menu:quit', () => {
      this.saveAllState();
      app.quit();
    });

    ipcMain.on('menu:restart', () => {
      this.saveAllState();
      app.relaunch();
      app.exit(0);
    });

    ipcMain.on('menu:open-settings', () => this.openSettingsWindow());

    ipcMain.handle('debug:screen-size', async () => {
      const display = screen.getPrimaryDisplay();
      return { workArea: display.workArea, bounds: display.bounds };
    });

    // 导入配置
    ipcMain.handle('file:import-config', async (_e) => {
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog({
        title: '导入配置',
        filters: [{ name: 'JSON 配置文件', extensions: ['json'] }],
        properties: ['openFile'],
      });
      if (result.canceled || result.filePaths.length === 0) {
        console.log('[CONFIG] Import Cancelled');
        return { success: false, error: '用户取消' };
      }
      try {
        const raw = require('fs').readFileSync(result.filePaths[0], 'utf-8');
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') {
          throw new Error('配置文件格式无效：不是有效的 JSON 对象');
        }
        const cfg = data.settings || data;
        if (typeof cfg !== 'object') {
          throw new Error('配置文件格式无效：缺少 settings 字段');
        }
        const knownKeys = [
          'autoStart', 'showOnStart', 'alwaysOnTop', 'autoHide',
          'animEnabled', 'debugMode', 'darkMode',
          'doubleClickAction', 'dragEnabled', 'snapEnabled', 'clickThrough',
          'apiProvider', 'apiKey', 'apiBaseUrl', 'apiModel',
          'apiTemperature', 'apiMaxTokens',
        ];
        const partial: Record<string, unknown> = {};
        for (const k of knownKeys) {
          if (k in cfg) partial[k] = cfg[k];
        }
        if (Object.keys(partial).length === 0) {
          throw new Error('配置文件中没有可识别的设置项');
        }
        await this.settingsMgr?.save(partial);
        this.settingsWindow?.webContents.send('settings:reload');
        console.log('[CONFIG] Import Success — keys=' + Object.keys(partial).join(','));
        return { success: true, count: Object.keys(partial).length };
      } catch (e: any) {
        console.log('[CONFIG] Import Failed — ' + e.message);
        return { success: false, error: e.message };
      }
    });
  }

  // ===========================================================================
  // 状态持久化 — SQLite config 表
  // ===========================================================================
  private dbGet(key: string): string | undefined {
    if (!this.db) return undefined;
    const row = this.db.get<{ value: string }>('SELECT value FROM config WHERE key = ?', [key]);
    return row?.value;
  }
  private dbSet(key: string, value: string): void {
    if (!this.db) return;
    this.db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, value]);
  }

  saveBallState(): void {
    const bounds = this.floatingBall.getBounds();
    this.dbSet(KEY_BALL_X, String(Math.round(bounds.x)));
    this.dbSet(KEY_BALL_Y, String(Math.round(bounds.y)));
  }

  saveChatState(): void {
    const win = this.chat.getWindow();
    if (!win || win.isDestroyed()) return;
    const b = win.getBounds();
    this.dbSet(KEY_CHAT_X, String(Math.round(b.x)));
    this.dbSet(KEY_CHAT_Y, String(Math.round(b.y)));
    this.dbSet(KEY_CHAT_W, String(Math.round(b.width)));
    this.dbSet(KEY_CHAT_H, String(Math.round(b.height)));
    this.dbSet(KEY_CHAT_VISIBLE, win.isVisible() ? 'true' : 'false');
    console.log('[STATE] Chat saved:', { x: b.x, y: b.y, w: b.width, h: b.height, visible: win.isVisible() });
  }

  saveAllState(): void {
    this.saveBallState();
    this.saveChatState();
    console.log('[STATE] All state saved');
  }

  restoreBallState(): void {
    const sx = this.dbGet(KEY_BALL_X);
    const sy = this.dbGet(KEY_BALL_Y);
    if (sx === undefined || sy === undefined) return;

    let x = parseInt(sx, 10);
    let y = parseInt(sy, 10);

    const clamped = this.clampToAnyScreen(x, y, BALL_SIZE, BALL_SIZE);
    const win = this.floatingBall.getWindow();
    if (win) {
      win.setPosition(clamped.x, clamped.y);
      console.log('[STATE] Ball restored:', clamped);
    }
  }

  restoreChatState(): void {
    const sx = this.dbGet(KEY_CHAT_X);
    const sy = this.dbGet(KEY_CHAT_Y);
    const sw = this.dbGet(KEY_CHAT_W);
    const sh = this.dbGet(KEY_CHAT_H);
    if (sx === undefined || sy === undefined || sw === undefined || sh === undefined) return;

    let x = parseInt(sx, 10);
    let y = parseInt(sy, 10);
    const w = parseInt(sw, 10);
    const h = parseInt(sh, 10);

    const clamped = this.clampToAnyScreen(x, y, w, h);
    const win = this.chat.getWindow();
    if (win && !win.isDestroyed()) {
      win.setBounds({ x: clamped.x, y: clamped.y, width: w, height: h });
      console.log('[STATE] Chat restored:', { ...clamped, w, h });
    }
  }

  private clampToAnyScreen(x: number, y: number, w: number, h: number): { x: number; y: number } {
    const displays = screen.getAllDisplays();

    for (const d of displays) {
      const wa = d.workArea;
      if (x >= wa.x && y >= wa.y &&
          x + w <= wa.x + wa.width &&
          y + h <= wa.y + wa.height) {
        return { x, y };
      }
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const wa = primaryDisplay.workArea;

    const clampedX = Math.max(wa.x, Math.min(x, wa.x + wa.width - Math.min(w, wa.width)));
    const clampedY = Math.max(wa.y, Math.min(y, wa.y + wa.height - Math.min(h, wa.height)));

    console.log('[STATE] Clamped from (' + x + ',' + y + ') to (' + clampedX + ',' + clampedY + ')');
    return { x: clampedX, y: clampedY };
  }

  // ===========================================================================
  // 设置窗口
  // ===========================================================================
  private openSettingsWindow(): void {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.show();
      this.settingsWindow.focus();
      console.log('[WINDOW] Settings Reused');
      return;
    }

    const settingsPath = path.join(__dirname, '..', '..', 'desktop', 'renderer', 'settings', 'index.html');
    this.settingsWindow = new BrowserWindow({
      width: 420, height: 560,
      resizable: false, frame: true, title: '嘟嘟设置',
      webPreferences: {
        nodeIntegration: false, contextIsolation: true,
        preload: path.join(__dirname, '..', 'preload', 'chat-preload.js'),
      },
    });

    this.settingsWindow.on('close', (e) => {
      e.preventDefault();
      this.settingsWindow?.hide();
      console.log('[WINDOW] Settings Hidden');
    });

    this.settingsWindow.loadFile(path.resolve(settingsPath));
    console.log('[WINDOW] Settings Created');
  }

  // ========== Settings Apply Methods ==========
  setAlwaysOnTop(on: boolean): void {
    const bw = this.floatingBall.getWindow();
    const cw = this.chat.getWindow();
    bw?.setAlwaysOnTop(on);
    cw?.setAlwaysOnTop(on);
  }

  setDarkMode(dark: boolean): void {
    this.floatingBall.getWindow()?.webContents.send('settings:dark-mode', dark);
    this.chat.getWindow()?.webContents.send('settings:dark-mode', dark);
  }

  setChatSize(w: number, h: number): void {
    const win = this.chat.getWindow();
    if (win && !win.isDestroyed()) {
      win.setSize(w, h);
      this.saveChatState();
    }
  }

  setSnapEnabled(enabled: boolean): void {
    this.floatingBall.setSnapEnabled(enabled);
  }

  setAnimEnabled(enabled: boolean): void {
    this.floatingBall.getWindow()?.webContents.send('settings:anim-enabled', enabled);
  }

  setClickThrough(enabled: boolean): void {
    const win = this.floatingBall.getWindow();
    if (win) win.setIgnoreMouseEvents(enabled, { forward: true });
  }

  // ========== Public API ==========
  showBall(): void    { this.floatingBall.show(); }
  hideBall(): void    { this.floatingBall.hide(); }

  /** 切换悬浮球显示/隐藏 */
  toggleBall(): void {
    const ball = this.floatingBall.getWindow();
    if (ball && !ball.isDestroyed() && ball.isVisible()) {
      this.hideBall();
    } else {
      this.showBall();
    }
  }

  /** 切换聊天窗口打开/关闭 */
  toggleChat(): void {
    if (this.chat.isOpen()) {
      this.chat.close();
    } else {
      this.openChatInternal();
    }
  }

  showBubble(msg: string): void { this.floatingBall.showBubble(msg); }
  openChat(): void    { this.openChatInternal(); }
  openSettingsInternal(): void { this.openSettingsWindow(); }
  getChatWindow(): BrowserWindow | null { return this.chat.getWindow(); }

  sendToChat(channel: string, ...args: unknown[]): void {
    this.chat.sendToRenderer(channel, ...args);
  }

  sendToSettingsWindow(channel: string, ...args: unknown[]): void {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.webContents.send(channel, ...args);
    }
  }

  destroyAll(): void {
    this.saveAllState();
    this.floatingBall.destroy();
    this.chat.destroy();
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.destroy();
    }
  }
}
