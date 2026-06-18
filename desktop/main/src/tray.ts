import { Tray, Menu, app } from 'electron';
import * as path from 'node:path';

export class TrayManager {
  private tray: Tray | null = null;
  private contextMenu: Menu | null = null;
  private callbacks: {
    onShow: () => void;
    onHide: () => void;
    onQuit: () => void;
    onTogglePrivacy: () => void;
  };

  constructor(callbacks: {
    onShow: () => void;
    onHide: () => void;
    onQuit: () => void;
    onTogglePrivacy: () => void;
  }) {
    this.callbacks = callbacks;
  }

  create(): void {
    // 使用简单的 16×16 托盘图标（用 emoji 或内置图标占位）
    this.tray = new Tray(this.getTrayIconPath());

    this.contextMenu = Menu.buildFromTemplate([
      {
        label: '显示/隐藏嘟嘟',
        click: () => {
          this.callbacks.onShow();
        },
      },
      { type: 'separator' },
      {
        label: '隐私开关',
        type: 'checkbox',
        checked: false,
        click: () => {
          this.callbacks.onTogglePrivacy();
        },
      },
      { type: 'separator' },
      {
        label: '退出嘟嘟',
        click: () => {
          this.callbacks.onQuit();
        },
      },
    ]);

    this.tray.setToolTip('嘟嘟 - AI 桌面伙伴');
    this.tray.setContextMenu(this.contextMenu);

    this.tray.on('double-click', () => {
      this.callbacks.onShow();
    });
  }

  setPrivacyChecked(checked: boolean): void {
    if (!this.contextMenu) return;
    const item = this.contextMenu.getMenuItemById('privacy')
      || this.contextMenu.items.find((i: Electron.MenuItem) => i.label === '隐私开关');
    if (item) item.checked = checked;
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
    this.contextMenu = null;
  }

  private getTrayIconPath(): string {
    // 返回一个占位托盘图标路径
    // 实际使用需要创建 .ico/.png 文件
    return path.join(__dirname, '..', '..', '..', 'resources', 'tray-icon.png');
  }
}
