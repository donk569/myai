import { ipcMain } from 'electron';
import type { WindowManager } from './window-manager';
import type { ConversationManager, DeepSeekClient } from '@dudu/chat-engine';
import type { buildSystemPrompt } from '@dudu/chat-engine';
import type { CharacterStore } from '@dudu/character-system';
import type { MemoryStore, MemoryExtractor } from '@dudu/memory-system';
import type { PrivacySwitch } from './awareness/privacy-switch';
import type { DuduDatabase } from '@dudu/storage';

interface IPCDeps {
  windowManager: WindowManager;
  conversationManager: ConversationManager;
  characterStore: CharacterStore;
  aiClient: DeepSeekClient;
  memoryStore: MemoryStore;
  memoryExtractor: MemoryExtractor;
  privacySwitch: PrivacySwitch;
  db: DuduDatabase;
}

export function registerIPCHandlers(deps: IPCDeps): void {
  const {
    windowManager, conversationManager, characterStore,
    aiClient, memoryStore, memoryExtractor, privacySwitch, db,
  } = deps;

  // ========== 对话管理 ==========

  ipcMain.handle('chat:load-conversations', async () => {
    return conversationManager.listConversations();
  });

  ipcMain.handle('chat:create-conversation', async () => {
    return conversationManager.createConversation();
  });

  ipcMain.handle('chat:delete-conversation', async (_e, id: string) => {
    conversationManager.deleteConversation(id);
    return true;
  });

  ipcMain.handle('chat:load-messages', async (_e, convId: string) => {
    return conversationManager.getMessages(convId);
  });

  // ========== 核心聊天流 ==========

  ipcMain.on('chat:send-message', async (event, payload: { content: string; conversationId: string }) => {
    const { content, conversationId } = payload;
    const chatWindow = windowManager.getChatWindow();
    if (!chatWindow) return;

    try {
      // 1. 保存用户消息到 DB
      const userMsg = conversationManager.addMessage(conversationId, 'user', content);

      // 自动更新对话标题（首次消息）
      const conv = conversationManager.getConversation(conversationId);
      if (conv && (!conv.title || conv.title === '新对话')) {
        const title = content.length > 20 ? content.slice(0, 20) + '...' : content;
        conversationManager.updateTitle(conversationId, title);
      }

      // 2. 构建 system prompt（角色 + 记忆）
      const character = characterStore.get();
      const recentMemories = memoryStore.getRecent(10);
      const memoryContext = recentMemories.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content,
        confidence: m.confidence,
      }));

      // 动态 import buildSystemPrompt
      const { buildSystemPrompt: buildPrompt } = await import('@dudu/chat-engine');
      const systemMsg = buildPrompt(characterStore, memoryContext, undefined);

      // 3. 获取最近对话上下文
      const context = conversationManager.getRecentContext(conversationId, 3000);
      const messages = [
        systemMsg,
        ...context.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content },
      ];

      // 4. 调 DeepSeek API（流式）
      let fullContent = '';
      await aiClient.chatStream(messages, {
        onToken: (token: string) => {
          fullContent += token;
          chatWindow.webContents.send('chat:stream-token', { token });
        },
        onComplete: async (response) => {
          // 5. 保存 AI 回复到 DB
          const aiMsg = conversationManager.addMessage(
            conversationId, 'assistant', fullContent || response.content,
          );
          chatWindow.webContents.send('chat:stream-complete', {
            messageId: aiMsg.id,
            content: fullContent || response.content,
          });

          // 6. 后台提取记忆
          try {
            const allMessages = conversationManager.getMessages(conversationId);
            const extracted = await memoryExtractor.extract(
              allMessages.map(m => ({ role: m.role, content: m.content })),
              10,
            );
            if (extracted.length > 0) {
              memoryStore.saveExtracted(extracted, conversationId);
            }
          } catch {
            // 记忆提取失败不影响聊天
          }
        },
        onError: (error: Error) => {
          chatWindow.webContents.send('chat:stream-error', {
            error: error.message || 'AI 回复失败',
          });
        },
      });
    } catch (error) {
      chatWindow.webContents.send('chat:stream-error', {
        error: (error as Error).message || '发送消息失败',
      });
    }
  });

  // ========== 角色设置 ==========

  ipcMain.handle('settings:load-character', async () => {
    return characterStore.get();
  });

  ipcMain.handle('settings:save-character', async (_e, profile) => {
    return characterStore.save(profile as Parameters<typeof characterStore.save>[0]);
  });

  // ========== API 配置 ==========

  ipcMain.handle('settings:load-api-config', async () => {
    const rows = db.query<{ key: string; value: string }>(
      "SELECT key, value FROM config WHERE key LIKE 'api.%'",
    );
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key.replace('api.', '')] = row.value;
    }
    return config;
  });

  ipcMain.handle('settings:save-api-config', async (_e, config: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(config)) {
      db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
        `api.${k}`,
        String(v),
      ]);
    }
    // 更新 AI 客户端配置
    const apiKey = (config.apiKey as string) || '';
    const baseUrl = (config.baseUrl as string) || 'https://api.deepseek.com';
    const temperature = parseFloat((config.temperature as string) || '0.8');
    const maxTokens = parseInt((config.maxTokens as string) || '2048', 10);
    aiClient.updateConfig({ apiKey, baseUrl, temperature, maxTokens });
    return true;
  });

  // ========== 记忆管理 ==========

  ipcMain.handle('settings:load-memories', async () => {
    return memoryStore.getAll();
  });

  ipcMain.handle('settings:delete-memory', async (_e, id: string) => {
    return memoryStore.delete(id);
  });

  ipcMain.handle('settings:clear-memories', async () => {
    memoryStore.clear();
    return true;
  });

  ipcMain.handle('settings:export-memories', async () => {
    return memoryStore.export();
  });

  // ========== 隐私开关 ==========

  ipcMain.handle('privacy:status', async () => {
    return privacySwitch.isEnabled();
  });

  ipcMain.handle('privacy:toggle', async () => {
    return privacySwitch.toggle();
  });

  // ========== 窗口控制 ==========

  ipcMain.on('chat:close', () => {
    windowManager.toggleChat();
  });

  ipcMain.on('window:hide', () => {
    windowManager.hideBall();
  });

  ipcMain.on('window:show', () => {
    windowManager.showBall();
  });
}
