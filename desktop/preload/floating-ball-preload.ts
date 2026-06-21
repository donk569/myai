import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('duduAPI', {
  // 悬浮球交互
  onBallClick: () => ipcRenderer.send('ball:click'),
  onDoubleClick: () => ipcRenderer.send('ball:double-click'),
  onBallDragMove: (dx: number, dy: number) => ipcRenderer.send('ball:move', { dx, dy }),
  onBallDragEnd: (snap: boolean) => ipcRenderer.send('ball:drag-end', { snap }),

  // 右键菜单
  showContextMenu: () => ipcRenderer.send('ball:right-click'),
  menuHide: () => ipcRenderer.send('window:hide'),

  // 监听主进程事件
  onExpressionChanged: (callback: (expression: string) => void) => {
    ipcRenderer.on('ball:set-expression', (_event, expression: string) => callback(expression));
  },
  onDarkModeChanged: (callback: (dark: boolean) => void) => {
    ipcRenderer.on('settings:dark-mode', (_event, dark: boolean) => callback(dark));
  },
  onShowBubble: (callback: (data: { message: string; duration: number }) => void) => {
    ipcRenderer.on('ball:show-bubble', (_event, data: { message: string; duration: number }) => {
      callback(data);
    });
  },

  // 窗口控制
  hideWindow: () => ipcRenderer.send('window:hide'),
  togglePrivacy: () => ipcRenderer.send('privacy:toggle'),

  // 调试
  getScreenSize: () => ipcRenderer.invoke('debug:screen-size'),
});
