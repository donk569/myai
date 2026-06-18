import React from 'react';
import type { Conversation } from '../types';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  onDelete,
  onCreate,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(244,143,177,0.2)',
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#c2185b' }}>消息</span>
        <button onClick={onCreate} style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #f8bbd0, #f06292)',
          color: '#fff',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>+</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {conversations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#bcaaa4',
            padding: 40,
            fontSize: 14,
          }}>
            🐱 还没有对话<br/>开始聊天吧~
          </div>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                background: selectedId === conv.id ? 'rgba(248,187,208,0.2)' : 'transparent',
                borderLeft: selectedId === conv.id ? '3px solid #f48fb1' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#5d4037' }}>
                  {conv.title || '新对话'}
                </span>
                <span style={{ fontSize: 11, color: '#bcaaa4' }}>
                  {new Date(conv.updatedAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              {conv.lastMessage && (
                <div style={{
                  fontSize: 12,
                  color: '#8d6e63',
                  marginTop: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {conv.lastMessage}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
