import React, { useEffect, useCallback, useState, useRef } from 'react';
import { MessageBubble, ChatInput, ConversationList } from '@dudu/chat-ui';
import { useChat, useConversations } from '@dudu/chat-ui';
import type { Message, Conversation } from '@dudu/chat-ui';
import type { ChatWindowAPI } from '../global';

const api = window.duduAPI as ChatWindowAPI | undefined;

const App: React.FC = () => {
  const {
    messages, loading, streamingContent,
    addMessage, setMessages, setLoading,
    appendStreamToken, commitStream, setError, clearMessages,
  } = useChat();

  const {
    conversations, selectedId,
    setConversations, addConversation, deleteConversation, selectConversation,
  } = useConversations();

  const [ready, setReady] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  // 初始化
  useEffect(() => {
    api?.loadConversations().then((convs) => {
      const list = convs as Conversation[];
      setConversations(list);
      if (list.length > 0) selectConversation(list[0].id);
      setReady(true);
    });
  }, []);

  // 切换对话加载消息
  useEffect(() => {
    if (!selectedId) { clearMessages(); return; }
    api?.loadMessages(selectedId).then((msgs) => setMessages(msgs as Message[]));
  }, [selectedId]);

  // 流式响应（注册一次，通过 ref 获取当前 conversationId）
  useEffect(() => {
    api?.onStreamToken((token: string) => appendStreamToken(token));
    api?.onStreamComplete((data: { messageId: string; content: string }) => {
      commitStream({
        id: data.messageId,
        conversationId: selectedIdRef.current || '',
        role: 'assistant',
        content: data.content,
        timestamp: Date.now(),
      });
    });
    api?.onStreamError((err: string) => setError(err));
  }, []);

  const handleSend = useCallback((content: string) => {
    if (!selectedId) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversationId: selectedId,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    api?.sendMessage(content, selectedId);
  }, [selectedId]);

  const handleCreateConv = useCallback(async () => {
    const conv = await api?.createConversation() as Conversation | undefined;
    if (conv) { addConversation(conv); selectConversation(conv.id); }
  }, []);

  const handleDeleteConv = useCallback(async (id: string) => {
    await api?.deleteConversation(id);
    deleteConversation(id);
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'rgba(255,245,247,0.92)', backdropFilter: 'blur(20px)',
      borderRadius: 20, overflow: 'hidden',
      border: '1px solid rgba(244,143,177,0.3)',
      boxShadow: '0 8px 40px rgba(240,98,146,0.2)',
    }}>
      {/* 头部 */}
      <div style={{
        background: 'linear-gradient(135deg, #f8bbd0, #f48fb1)',
        padding: '10px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #fff5f7, #f48fb1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>🐱</div>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>嘟嘟</span>
        </div>
        <button onClick={() => api?.closeChat()} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none',
          borderRadius: '50%', width: 24, height: 24,
          color: '#fff', fontSize: 12, cursor: 'pointer',
        }}>✕</button>
      </div>

      {/* 主体 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 对话列表 */}
        <div style={{
          width: 140, borderRight: '1px solid rgba(244,143,177,0.15)',
          flexShrink: 0, overflow: 'auto',
        }}>
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={(id) => selectConversation(id)}
            onDelete={handleDeleteConv}
            onCreate={handleCreateConv}
          />
        </div>

        {/* 聊天区 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!selectedId ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#bcaaa4', fontSize: 14,
            }}>
              🐱 选择对话或创建新对话
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
