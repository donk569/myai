import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('duduAPI', {
  // 对话管理
  loadConversations: () => ipcRenderer.invoke('chat:load-conversations'),
  createConversation: () => ipcRenderer.invoke('chat:create-conversation'),
  deleteConversation: (id: string) => ipcRenderer.invoke('chat:delete-conversation', id),
  loadMessages: (conversationId: string) => ipcRenderer.invoke('chat:load-messages', conversationId),

  // 聊天
  sendMessage: (content: string, conversationId: string) =>
    ipcRenderer.send('chat:send-message', { content, conversationId }),

  // 流式响应
  onStreamToken: (cb: (token: string) => void) => {
    ipcRenderer.on('chat:stream-token', (_e, t: string) => cb(t));
  },
  onStreamComplete: (cb: (data: { messageId: string; content: string }) => void) => {
    ipcRenderer.on('chat:stream-complete', (_e, d: { messageId: string; content: string }) => cb(d));
  },
  onStreamError: (cb: (err: string) => void) => {
    ipcRenderer.on('chat:stream-error', (_e, err: string) => cb(err));
  },

  // ========== 设置中心 ==========

  loadAllSettings: () => ipcRenderer.invoke('settings:load-all'),
  saveSettings: (cfg: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:save', cfg),
  applySettings: (cfg: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:apply', cfg),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  setAutoStart: (enabled: boolean) =>
    ipcRenderer.invoke('settings:auto-start', enabled),

  // API 配置
  loadAPIConfig: () => ipcRenderer.invoke('settings:load-api-config'),
  saveAPIConfig: (cfg: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:save-api-config', cfg),

  // 角色
  loadCharacter: () => ipcRenderer.invoke('settings:load-character'),
  saveCharacter: (profile: unknown) => ipcRenderer.invoke('settings:save-character', profile),

  // 记忆
  loadMemories: () => ipcRenderer.invoke('settings:load-memories'),
  deleteMemory: (id: string) => ipcRenderer.invoke('settings:delete-memory', id),
  clearMemories: () => ipcRenderer.invoke('settings:clear-memories'),
  exportMemories: () => ipcRenderer.invoke('settings:export-memories'),

  // 调试
  dumpConfig: () => ipcRenderer.invoke('settings:dump'),

  // 主题
  onDarkModeChanged: (cb: (dark: boolean) => void) => {
    ipcRenderer.on('settings:dark-mode', (_e, dark: boolean) => cb(dark));
  },

  // 数据管理
  importConfig: () => ipcRenderer.invoke('file:import-config'),
  clearAllChatHistory: () => ipcRenderer.invoke('chat:clear-all'),
  clearAllData: () => ipcRenderer.invoke('data:clear-all'),

  // 监听
  onClearDOM: (cb: () => void) => {
    ipcRenderer.on('chat:clear-dom', () => cb());
  },
  onSettingsReload: (cb: () => void) => {
    ipcRenderer.on('settings:reload', () => cb());
  },

  // 窗口控制
  closeChat: () => ipcRenderer.send('chat:close'),
  closeSettings: () => ipcRenderer.send('settings:close'),
});
