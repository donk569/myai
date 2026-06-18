import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('duduAPI', {
  // 悬浮球交互
  onClick: () => ipcRenderer.send('ball:click'),
  onDragStart: () => ipcRenderer.send('ball:drag-start'),
  onDragEnd: (x: number, y: number) => ipcRenderer.send('ball:drag-end', { x, y }),
  onRightClick: () => ipcRenderer.send('ball:right-click'),

  // 监听主进程事件
  onExpressionChanged: (callback: (expression: string) => void) => {
    ipcRenderer.on('ball:set-expression', (_event: unknown, expression: string) => callback(expression));
  },
  onShowBubble: (callback: (data: { message: string; duration: number }) => void) => {
    ipcRenderer.on('ball:show-bubble', (_event: unknown, data: { message: string; duration: number }) => callback(data));
  },

  // 窗口控制
  hideWindow: () => ipcRenderer.send('window:hide'),
  togglePrivacy: () => ipcRenderer.send('privacy:toggle'),
});
