import { ipcMain } from 'electron';
import type { WindowManager } from './window-manager';
import type { ConversationManager, DeepSeekClient } from '@dudu/chat-engine';
import type { buildSystemPrompt } from '@dudu/chat-engine';
import type { CharacterStore } from '@dudu/character-system';
import type { MemoryStore, MemoryExtractor } from '@dudu/memory-system';
import type { PrivacySwitch } from './awareness/privacy-switch';
import type { DuduDatabase } from '@dudu/storage';
import type { SettingsManager } from './settings-manager';

interface IPCDeps {
  windowManager: WindowManager;
  conversationManager: ConversationManager;
  characterStore: CharacterStore;
  aiClient: DeepSeekClient;
  memoryStore: MemoryStore;
  memoryExtractor: MemoryExtractor;
  privacySwitch: PrivacySwitch;
  db: DuduDatabase;
  settingsManager: SettingsManager;
}

export function registerIPCHandlers(deps: IPCDeps): void {
  const {
    windowManager, conversationManager, characterStore,
    aiClient, memoryStore, memoryExtractor, privacySwitch, db,
    settingsManager,
  } = deps;

  // ========== Debug 日志 ==========
  const DEBUG = process.env.DUDU_DEBUG === '1' || true;
  function log(tag: string, msg: string, data?: unknown): void {
    if (!DEBUG) return;
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[DUDU|${ts}|${tag}] ${msg}`, data !== undefined ? JSON.stringify(data).slice(0, 200) : '');
  }

  log('IPC', 'IPC 处理器注册开始');

  // ========== 对话管理 ==========

  ipcMain.handle('chat:load-conversations', async () => {
    const result = conversationManager.listConversations();
    log('IPC', '加载对话列表', { count: result.length });
    return result;
  });

  ipcMain.handle('chat:create-conversation', async () => {
    const conv = conversationManager.createConversation();
    log('IPC', '创建新对话', { id: conv.id });
    return conv;
  });

  ipcMain.handle('chat:delete-conversation', async (_e, id: string) => {
    conversationManager.deleteConversation(id);
    return true;
  });

  ipcMain.handle('chat:load-messages', async (_e, convId: string) => {
    const msgs = conversationManager.getMessages(convId);
    log('IPC', '加载消息', { convId, count: msgs.length });
    return msgs;
  });

  // ========== 核心聊天流 ==========

  ipcMain.on('chat:send-message', async (event, payload: { content: string; conversationId: string }) => {
    const { content, conversationId } = payload;
    log('IPC', '收到用户消息', { convId: conversationId, len: content.length });
    const chatWindow = windowManager.getChatWindow();
    if (!chatWindow) { log('IPC', '聊天窗口不存在，无法发送'); return; }

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

      const { buildSystemPrompt: buildPrompt } = await import('@dudu/chat-engine');
      const systemMsg = buildPrompt(characterStore, memoryContext, undefined);

      // 3. 获取最近对话上下文（capped at 3000 tokens）
      const context = conversationManager.getRecentContext(conversationId, 3000);
      const systemTokens = Math.ceil(systemMsg.content.length / 2);
      const contextTokens = context.reduce((sum, m) => sum + Math.ceil(m.content.length / 2), 0);
      const newTokens = Math.ceil(content.length / 2);
      const totalTokens = systemTokens + contextTokens + newTokens;

      log('IPC', 'Token统计', {
        systemTokens, contextTokens, newTokens, totalTokens,
        contextRounds: context.length,
      });
      console.log(`[TOKEN] System:${systemTokens} | Context:${contextTokens} | New:${newTokens} | Total:${totalTokens} | Rounds:${context.length}`);

      if (context.length >= 40) {
        console.log('[TOKEN] Context approaching cap — consider enabling summarization');
      }

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
          chatWindow.webContents.send('chat:stream-token', token);
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
          chatWindow.webContents.send('chat:stream-error', error.message || 'AI 回复失败');
        },
      });
    } catch (error) {
      chatWindow.webContents.send('chat:stream-error', (error as Error).message || '发送消息失败');
    }
  });

  // ========== 角色设置 ==========

  ipcMain.handle('settings:load-character', async () => {
    return characterStore.get();
  });

  ipcMain.handle('settings:save-character', async (_e, profile) => {
    return characterStore.save(profile as Parameters<typeof characterStore.save>[0]);
  });

  // ========== 设置中心（通过 SettingsManager）=================

  ipcMain.handle('settings:load-all', async () => {
    return settingsManager.getAll();
  });

  ipcMain.handle('settings:save', async (_e, cfg: Record<string, unknown>) => {
    log('IPC', '保存设置', cfg);
    return settingsManager.save(cfg as Parameters<typeof settingsManager.save>[0]);
  });

  ipcMain.handle('settings:apply', async (_e, cfg: Record<string, unknown>) => {
    log('IPC', '应用设置（不保存）', cfg);
    settingsManager.apply(cfg as Parameters<typeof settingsManager.save>[0]);
    return true;
  });

  ipcMain.handle('settings:reset', async () => {
    return settingsManager.reset();
  });

  ipcMain.handle('settings:auto-start', async (_e, enabled: boolean) => {
    return settingsManager.setAutoStart(enabled);
  });

  ipcMain.handle('settings:dump', async () => {
    const settings = settingsManager.getAll();
    const conversations = conversationManager.listConversations();
    const apiConfig = {
      key_len: settings.apiKey ? settings.apiKey.length : 0,
      baseUrl: settings.apiBaseUrl,
      model: settings.apiModel,
    };
    return { settings, apiConfig, conversationCount: conversations.length };
  });

  // ========== API 配置（兼容旧接口）=================

  ipcMain.handle('settings:load-api-config', async () => {
    const s = settingsManager.getAll();
    return {
      apiKey: s.apiKey,
      api_key: s.apiKey,
      baseUrl: s.apiBaseUrl,
      base_url: s.apiBaseUrl,
      model: s.apiModel,
      temperature: String(s.apiTemperature),
      maxTokens: String(s.apiMaxTokens),
      max_tokens: String(s.apiMaxTokens),
    };
  });

  ipcMain.handle('settings:save-api-config', async (_e, config: Record<string, unknown>) => {
    const partial: Record<string, unknown> = {};
    if (config.apiKey !== undefined) partial.apiKey = config.apiKey;
    if (config.baseUrl !== undefined) partial.apiBaseUrl = config.baseUrl;
    if (config.model !== undefined) partial.apiModel = config.model;
    if (config.temperature !== undefined) partial.apiTemperature = parseFloat(config.temperature as string);
    if (config.maxTokens !== undefined) partial.apiMaxTokens = parseInt(config.maxTokens as string, 10);
    return settingsManager.save(partial);
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

  // ========== 双击行为 ==========

  ipcMain.on('ball:double-click', () => {
    const action = settingsManager.getAll().doubleClickAction;
    console.log('[DOUBLE_CLICK] Action =', action);
    switch (action) {
      case 'hide':
        console.log('[DOUBLE_CLICK] Hide Assistant');
        windowManager.hideAll();
        break;
      case 'settings':
        windowManager.openSettingsInternal();
        break;
      case 'none':
        console.log('[DOUBLE_CLICK] No Action');
        break;
      case 'chat':
      default:
        windowManager.openChat();
    }
  });

  // ========== 清空聊天记录 ==========

  ipcMain.handle('chat:clear-all', async () => {
    try {
      const count = conversationManager.clearAllConversations();
      const chatWin = windowManager.getChatWindow();
      if (chatWin && !chatWin.isDestroyed()) {
        chatWin.webContents.send('chat:clear-dom');
      }
      log('IPC', '清空所有聊天记录', { conversationsDeleted: count });
      return { success: true, count };
    } catch (e: any) {
      log('IPC', '清空聊天失败', { error: e.message });
      return { success: false, error: e.message };
    }
  });

  // ========== 清空所有数据（含记忆）==========

  ipcMain.handle('data:clear-all', async () => {
    try {
      const convCount = conversationManager.clearAllConversations();
      log('IPC', '已清空对话', { count: convCount });

      const memCount = memoryStore.clear();
      log('IPC', '已清空记忆', { count: memCount });

      settingsManager.reset();
      log('IPC', '已重置设置');

      const chatWin = windowManager.getChatWindow();
      if (chatWin && !chatWin.isDestroyed()) {
        chatWin.webContents.send('chat:clear-dom');
      }

      windowManager.sendToSettingsWindow?.('settings:reload');

      console.log('[DATA] All data cleared — conversations:' + convCount + ' memories:' + memCount);
      return { success: true, conversations: convCount, memories: memCount };
    } catch (e: any) {
      log('IPC', '清空全部数据失败', { error: e.message });
      return { success: false, error: e.message };
    }
  });

  // ========== 窗口控制 ==========

  ipcMain.on('chat:close', () => {
    windowManager.getChatWindow()?.hide();
  });

  ipcMain.on('window:hide', () => {
    windowManager.hideBall();
  });

  ipcMain.on('window:show', () => {
    windowManager.showBall();
  });
}
