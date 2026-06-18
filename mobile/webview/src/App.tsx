import React, { useEffect, useCallback, useState } from 'react';
import { MessageBubble, ChatInput, ConversationList } from '@dudu/chat-ui';
import { useChat, useConversations } from '@dudu/chat-ui';
import type { Message, Conversation } from '@dudu/chat-ui';
import { callNative, setupBridgeCallbacks } from './bridge/native';

// 初始化桥接回调
setupBridgeCallbacks();

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

  // 加载对话列表
  useEffect(() => {
    loadConversations();
    setReady(true);
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
    } catch {
      // 首次使用，无数据
    }
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

  // 切换对话加载消息
  useEffect(() => {
    if (!selectedId) { clearMessages(); return; }
    loadMessages(selectedId);
  }, [selectedId]);

  const handleSend = useCallback(async (content: string) => {
    if (!selectedId) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversationId: selectedId,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    // 保存用户消息到本地数据库
    await callNative('storage.query', {
      sql: 'INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
      args: [userMsg.id, selectedId, 'user', content, String(Date.now())],
    });

    // TODO: 调 DeepSeek API（复用 chat-engine 的逻辑）
    // 这里简化处理，实际应通过 JSBridge 调用 Kotlin 侧的 HTTP 客户端
  }, [selectedId]);

  const handleCreateConv = useCallback(async () => {
    const id = crypto.randomUUID();
    const now = Date.now();
    await callNative('storage.query', {
      sql: 'INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
      args: [id, '新对话', String(now), String(now)],
    });
    const conv: Conversation = { id, title: '新对话', createdAt: now, updatedAt: now };
    addConversation(conv);
    selectConversation(id);
  }, []);

  const handleDeleteConv = useCallback(async (id: string) => {
    await callNative('storage.delete', { key: id });
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
      background: '#fff5f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
