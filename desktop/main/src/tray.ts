import { Tray, Menu, app } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';

export class TrayManager {
  private tray: Tray | null = null;
  private contextMenu: Menu | null = null;
  private callbacks: {
    onShow: () => void;
    onHide: () => void;
    onOpenChat: () => void;
    onOpenSettings: () => void;
    onRestart: () => void;
    onQuit: () => void;
    onTogglePrivacy: () => void;
  };

  constructor(callbacks: {
    onShow: () => void;
    onHide: () => void;
    onOpenChat: () => void;
    onOpenSettings: () => void;
    onRestart: () => void;
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
        label: '💬 显示嘟嘟',
        click: () => {
          console.log('[TRAY] Action: Show Dudu');
          this.callbacks.onShow();
        },
      },
      {
        label: '👁 隐藏嘟嘟',
        click: () => {
          console.log('[TRAY] Action: Hide Dudu');
          this.callbacks.onHide();
        },
      },
      { type: 'separator' },
      {
        label: '💬 打开聊天',
        click: () => {
          console.log('[TRAY] Action: Open Chat');
          this.callbacks.onOpenChat();
        },
      },
      {
        label: '⚙ 打开设置',
        click: () => {
          console.log('[TRAY] Action: Open Settings');
          this.callbacks.onOpenSettings();
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
        label: '🔁 重启助手',
        click: () => {
          console.log('[TRAY] Action: Restart');
          this.callbacks.onRestart();
        },
      },
      {
        label: '⏻ 退出程序',
        click: () => {
          console.log('[TRAY] Action: Quit');
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
    // 托盘图标：开发模式用 resources/，生产模式用 userData
    const isDev = !app.isPackaged;
    const baseDir = isDev
      ? path.join(__dirname, '..', '..')
      : app.getPath('userData');
    const iconPath = path.join(baseDir, 'resources', 'tray-icon.png');

    if (fs.existsSync(iconPath)) {
      return iconPath;
    }

    // 确保目录存在
    const dir = path.dirname(iconPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 生成 16x16 粉色托盘图标 — 手写最小 PNG
    const rawPNG = makePinkTrayPNG();
    fs.writeFileSync(iconPath, rawPNG);
    return iconPath;
  }
}

// 纯 JS 生成 16x16 粉色圆角矩形 PNG
function makePinkTrayPNG(): Buffer {
  const W = 16, H = 16;
  // 粉色 #f48fb1 = R:244 G:143 B:177
  const R = 244, G = 143, B = 177;
  const center = 7.5, radius = 6.5;

  // 构建 RGBA 像素数据
  const raw: number[] = [];
  for (let y = 0; y < H; y++) {
    raw.push(0); // filter byte
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        raw.push(R, G, B, 255); // 粉色不透明
      } else {
        raw.push(0, 0, 0, 0); // 透明
      }
    }
  }
  const rawBuf = Buffer.from(raw);

  // PNG 编码 (压缩用 zlib)
  const zlib = require('zlib');
  const deflated = zlib.deflateSync(rawBuf);

  function crc32(buf: Buffer): number {
    let c = 0xFFFFFFFF;
    const table: number[] = [];
    for (let n = 0; n < 256; n++) {
      let k = n;
      for (let j = 0; j < 8; j++) k = (k & 1) ? (0xEDB88320 ^ (k >>> 1)) : (k >>> 1);
      table[n] = k;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeB, data]);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([len, typeB, data, crcVal]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflated),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
