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

  // 流式响应监听
  onStreamToken: (callback: (token: string) => void) => {
    ipcRenderer.on('chat:stream-token', (_event: unknown, token: string) => callback(token));
  },
  onStreamComplete: (callback: (data: { messageId: string; content: string }) => void) => {
    ipcRenderer.on('chat:stream-complete', (_event: unknown, data: { messageId: string; content: string }) => callback(data));
  },
  onStreamError: (callback: (error: string) => void) => {
    ipcRenderer.on('chat:stream-error', (_event: unknown, error: string) => callback(error));
  },

  // 设置
  loadCharacter: () => ipcRenderer.invoke('settings:load-character'),
  saveCharacter: (profile: unknown) => ipcRenderer.invoke('settings:save-character', profile),
  loadAPIConfig: () => ipcRenderer.invoke('settings:load-api-config'),
  saveAPIConfig: (config: unknown) => ipcRenderer.invoke('settings:save-api-config', config),

  // 关闭聊天窗
  closeChat: () => ipcRenderer.send('chat:close'),
});
