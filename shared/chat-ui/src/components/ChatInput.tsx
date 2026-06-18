import React, { useState, useRef, useCallback } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false, loading = false }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled || loading) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, disabled, loading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: 8,
      padding: '10px 12px',
      borderTop: '1px solid rgba(244,143,177,0.2)',
      background: 'rgba(255,255,255,0.5)',
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(248,187,208,0.12)',
        borderRadius: 20,
        padding: '6px 16px',
      }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="说点什么..."
          rows={1}
          disabled={disabled}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            color: '#5d4037',
            resize: 'none',
            maxHeight: 100,
            fontFamily: 'inherit',
          }}
        />
        <span style={{ fontSize: 18, cursor: 'pointer', opacity: 0.5 }}>😊</span>
      </div>
      <button
        onClick={handleSend}
        disabled={disabled || loading || !text.trim()}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          background: disabled || !text.trim()
            ? '#e0e0e0'
            : 'linear-gradient(135deg, #f8bbd0, #f06292)',
          color: '#fff',
          fontSize: 16,
          cursor: disabled || !text.trim() ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      >
        {loading ? '⋯' : '➤'}
      </button>
    </div>
  );
};
