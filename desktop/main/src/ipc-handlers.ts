import { ipcMain } from 'electron';
import type { WindowManager } from './window-manager';
import type { ConversationManager } from '@dudu/chat-engine';
import type { CharacterStore } from '@dudu/character-system';

interface IPCDependencies {
  windowManager: WindowManager;
  conversationManager: ConversationManager;
  characterStore: CharacterStore;
  memoryStore: unknown;
}

export function registerIPCHandlers(deps: IPCDependencies): void {
  const { windowManager, conversationManager, characterStore } = deps;

  // === 聊天相关 ===
  ipcMain.handle('chat:load-conversations', async () => {
    return conversationManager.listConversations();
  });

  ipcMain.handle('chat:create-conversation', async () => {
    return conversationManager.createConversation();
  });

  ipcMain.handle('chat:delete-conversation', async (_event: unknown, id: string) => {
    conversationManager.deleteConversation(id);
    return true;
  });

  ipcMain.handle('chat:load-messages', async (_event: unknown, conversationId: string) => {
    return conversationManager.getMessages(conversationId);
  });

  // === 角色设置 ===
  ipcMain.handle('settings:load-character', async () => {
    return characterStore.get();
  });

  ipcMain.handle('settings:save-character', async (_event: unknown, profile: unknown) => {
    return characterStore.save(profile as Parameters<typeof characterStore.save>[0]);
  });

  // === API 配置 ===
  ipcMain.handle('settings:load-api-config', async () => {
    // 从 config 表读取，由 ChatEngine 处理
    return {};
  });

  ipcMain.handle('settings:save-api-config', async (_event: unknown, config: unknown) => {
    // 存到 config 表
    return true;
  });

  // === 窗口控制 ===
  ipcMain.on('chat:close', () => {
    windowManager.toggleChat();
  });

  ipcMain.on('window:hide', () => {
    windowManager.hideBall();
  });

  // === 隐私开关 ===
  ipcMain.handle('privacy:status', async () => {
    return false; // 默认关闭
  });

  ipcMain.handle('privacy:toggle', async () => {
    return true;
  });
}
