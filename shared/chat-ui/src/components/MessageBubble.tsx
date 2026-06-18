import React from 'react';
import type { Message } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 16,
      paddingLeft: isUser ? 40 : 0,
      paddingRight: isUser ? 0 : 40,
    }}>
      {!isUser && (
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #fff5f7, #f48fb1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(240,98,146,0.25)',
        }}>
          🐱
        </div>
      )}
      <div style={{
        maxWidth: isUser ? '70%' : '65%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}>
        <div style={{
          background: isUser
            ? 'linear-gradient(135deg, #f8bbd0, #f48fb1)'
            : '#ffffff',
          color: isUser ? '#ffffff' : '#5d4037',
          padding: '10px 16px',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          fontSize: 14,
          lineHeight: 1.6,
          boxShadow: isUser ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
          wordBreak: 'break-word',
        }}>
          {isUser ? message.content : <MarkdownRenderer content={message.content} />}
        </div>
        <span style={{
          fontSize: 10,
          color: '#bcaaa4',
          marginTop: 4,
          paddingLeft: isUser ? 0 : 4,
          paddingRight: isUser ? 4 : 0,
        }}>
          {time}
        </span>
      </div>
    </div>
  );
};
