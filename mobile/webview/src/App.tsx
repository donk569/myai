import React, { useEffect, useCallback, useState } from 'react';
import { MessageBubble, ChatInput, ConversationList } from '@dudu/chat-ui';
import { useChat, useConversations } from '@dudu/chat-ui';
import type { Message, Conversation } from '@dudu/chat-ui';
import { callNative, setupBridgeCallbacks } from './bridge/native';

// 初始化桥接回调
setupBridgeCallbacks();

// === DeepSeek 流式请求（WebView 内直接 fetch） ===
interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: string) => void;
}

async function streamDeepSeek(
  apiKey: string,
  apiBaseUrl: string,
  messages: Array<{ role: string; content: string }>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const response = await fetch(`${apiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.8,
        max_tokens: 2048,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      if (response.status === 401) throw new Error('API Key 无效，请检查设置');
      if (response.status === 429) throw new Error('请求过于频繁，请稍后重试');
      throw new Error(`API 错误 (${response.status}): ${text}`);
    }

    if (!response.body) throw new Error('响应体为空');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          callbacks.onComplete(fullContent);
          return;
        }

        try {
          const parsed = JSON.parse(data) as {
            choices: Array<{ delta: { content?: string }; finish_reason: string | null }>;
          };
          for (const choice of parsed.choices) {
            const token = choice.delta.content || '';
            if (token) {
              fullContent += token;
              callbacks.onToken(token);
            }
          }
        } catch { /* skip unparseable lines */ }
      }
    }

    callbacks.onComplete(fullContent);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      callbacks.onError('请求已取消');
      return;
    }
    callbacks.onError((error as Error).message || '请求失败');
  }
}

// === 构建 System Prompt（移动端版本，不依赖 Node.js 模块） ===
function buildMobileSystemPrompt(
  character: { name: string; personality: string; speakingStyle: string },
  memories: Array<{ type: string; content: string }>,
): { role: 'system'; content: string } {
  const memoryText = memories.length > 0
    ? '\n## 你记得关于用户的事情\n' + memories.map(m => `- [${m.type}] ${m.content}`).join('\n')
    : '';

  return {
    role: 'system',
    content: `你叫${character.name}，是一个AI桌面伙伴。

## 你是谁
${character.personality}

## 说话风格
${character.speakingStyle}

## 当前时间
${new Date().toLocaleString('zh-CN')}
${memoryText}

## 行为准则
- 你是用户的朋友，不是助手。自然地聊天。
- 用中文回复，回复简洁，一般不超过200字。
- 主动关心用户，但不过度。
- 记住用户说的话，以后可以提起。`,
  };
}

// === App 组件 ===
const App: React.FC = () => {
  const {
    messages, loading, streamingContent,
    addMessage, setMessages, commitStream, appendStreamToken, setError, clearMessages,
  } = useChat();

  const {
    conversations, selectedId,
    setConversations, addConversation, deleteConversation, selectConversation,
  } = useConversations();

  const [ready, setReady] = useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  // 加载对话列表
  useEffect(() => {
    loadConversations().then(() => setReady(true));
  }, []);

  const loadConversations = async () => {
    try {
      const result = await callNative('storage.query', {
        sql: 'SELECT * FROM conversations ORDER BY updated_at DESC',
        args: [],
      }) as { rows: Conversation[] };
      if (result?.rows) {
        setConversations(result.rows);
        if (result.rows.length > 0) selectConversation(result.rows[0].id);
      }
    } catch { /* 首次使用 */ }
  };

  const loadMessages = async (convId: string) => {
    try {
      const result = await callNative('storage.query', {
        sql: 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
        args: [convId],
      }) as { rows: Message[] };
      if (result?.rows) setMessages(result.rows);
    } catch {
      clearMessages();
    }
  };

  // 切换对话
  useEffect(() => {
    if (!selectedId) { clearMessages(); return; }
    loadMessages(selectedId);
  }, [selectedId]);

  // 发送消息 — 完整 DeepSeek 流式对话
  const handleSend = useCallback(async (content: string) => {
    if (!selectedId) return;

    // 1. 保存用户消息
    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversationId: selectedId,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    await callNative('storage.query', {
      sql: 'INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
      args: [userMsg.id, selectedId, 'user', content, String(Date.now())],
    });

    // 2. 获取 API 配置 + 角色 + 记忆
    const [apiConfig, character, memoriesResult] = await Promise.all([
      callNative('chat.getConfig', {}).catch(() => ({ apiKey: '', base_url: 'https://api.deepseek.com' })) as Promise<Record<string, string>>,
      callNative('character.get', {}).catch(() => ({
        name: '嘟嘟', personality: '可爱的AI伙伴', speakingStyle: '亲切自然',
      })) as Promise<{ name: string; personality: string; speakingStyle: string }>,
      callNative('storage.query', {
        sql: 'SELECT type, content FROM memories ORDER BY confidence DESC LIMIT 10',
        args: [],
      }).catch(() => ({ rows: [] })) as Promise<{ rows: Array<{ type: string; content: string }> }>,
    ]);

    const apiKey = apiConfig.apiKey || apiConfig.api_key || '';
    const apiBaseUrl = apiConfig.base_url || 'https://api.deepseek.com';

    if (!apiKey) {
      setError('请先在设置中配置 DeepSeek API Key');
      return;
    }

    // 3. 构建消息列表
    const systemMsg = buildMobileSystemPrompt(character, memoriesResult.rows || []);
    const messagesForAPI = [
      systemMsg,
      ...(messages.slice(-20).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))),
      { role: 'user' as const, content },
    ];

    // 4. 流式请求
    const abortController = new AbortController();
    abortRef.current = abortController;

    let fullContent = '';
    await streamDeepSeek(apiKey, apiBaseUrl, messagesForAPI, {
      onToken: (token) => {
        fullContent += token;
        appendStreamToken(token);
      },
      onComplete: async () => {
        const aiMsg: Message = {
          id: crypto.randomUUID(),
          conversationId: selectedId,
          role: 'assistant',
          content: fullContent,
          timestamp: Date.now(),
        };
        commitStream(aiMsg);

        // 保存 AI 回复到 DB
        await callNative('storage.query', {
          sql: 'INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
          args: [aiMsg.id, selectedId, 'assistant', fullContent, String(Date.now())],
        });

        // 更新对话时间
        await callNative('storage.query', {
          sql: 'UPDATE conversations SET updated_at = ? WHERE id = ?',
          args: [String(Date.now()), selectedId],
        });

        abortRef.current = null;
      },
      onError: (error) => {
        setError(error);
        abortRef.current = null;
      },
    }, abortController.signal);
  }, [selectedId, messages, addMessage, appendStreamToken, commitStream, setError]);

  const handleCreateConv = useCallback(async () => {
    const id = crypto.randomUUID();
    const now = Date.now();
    await callNative('storage.query', {
      sql: 'INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
      args: [id, '新对话', String(now), String(now)],
    }).catch(() => {});
    const conv: Conversation = { id, title: '新对话', createdAt: now, updatedAt: now };
    addConversation(conv);
    selectConversation(id);
  }, []);

  const handleDeleteConv = useCallback(async (id: string) => {
    await callNative('storage.query', {
      sql: 'DELETE FROM conversations WHERE id = ?',
      args: [id],
    }).catch(() => {});
    deleteConversation(id);
  }, []);

  if (!ready) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#fff5f7', color: '#c2185b', fontSize: 18,
      }}>
        🐱 嘟嘟
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#fff5f7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* 头部 */}
      <div style={{
        background: 'linear-gradient(135deg, #f8bbd0, #f48fb1)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 2px 12px rgba(240,98,146,0.2)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #fff5f7, #f48fb1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>🐱</div>
        <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>嘟嘟</span>
      </div>

      {/* 对话列表 + 聊天区 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {conversations.length > 1 && (
          <div style={{ width: 140, borderRight: '1px solid rgba(244,143,177,0.15)', flexShrink: 0 }}>
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={(id) => selectConversation(id)}
              onDelete={handleDeleteConv}
              onCreate={handleCreateConv}
            />
          </div>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!selectedId ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              <div style={{ fontSize: 48 }}>🐱</div>
              <div style={{ color: '#bcaaa4', fontSize: 14 }}>开始和嘟嘟聊天吧~</div>
              <button onClick={handleCreateConv} style={{
                marginTop: 8, padding: '10px 32px',
                borderRadius: 24, border: 'none',
                background: 'linear-gradient(135deg, #f8bbd0, #f06292)',
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>新建对话</button>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {loading && streamingContent && (
                  <div style={{ padding: '10px 16px', color: '#5d4037', fontSize: 14 }}>
                    {streamingContent}<span>|</span>
                  </div>
                )}
              </div>
              <ChatInput onSend={handleSend} loading={loading} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
