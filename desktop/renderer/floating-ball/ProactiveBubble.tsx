import React, { useEffect, useState } from 'react';

interface ProactiveBubbleProps {
  message: string;
  duration?: number;
  onDismiss?: () => void;
}

export const ProactiveBubble: React.FC<ProactiveBubbleProps> = ({
  message,
  duration = 10000,
  onDismiss,
}) => {
  const [phase, setPhase] = useState<'fadeIn' | 'show' | 'fadeOut' | 'done'>('fadeIn');

  useEffect(() => {
    const fadeInTimer = setTimeout(() => setPhase('show'), 3000);
    const fadeOutTimer = setTimeout(() => setPhase('fadeOut'), 3000 + duration - 3000);
    const doneTimer = setTimeout(() => {
      setPhase('done');
      onDismiss?.();
    }, 3000 + duration);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(doneTimer);
    };
  }, [duration, onDismiss]);

  if (phase === 'done') return null;

  const animStyle: React.CSSProperties =
    phase === 'fadeIn'
      ? { animation: 'bubbleFadeIn 0.5s ease-out forwards' }
      : phase === 'fadeOut'
      ? { animation: 'bubbleFadeOut 1s ease-in forwards' }
      : {};

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 14,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 16,
        padding: '10px 16px',
        maxWidth: 220,
        fontSize: 13,
        color: '#5d4037',
        boxShadow: '0 4px 20px rgba(240,98,146,0.2)',
        border: '1px solid rgba(244,143,177,0.3)',
        textAlign: 'center',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        pointerEvents: phase === 'show' ? 'auto' : 'none',
        ...animStyle,
      }}
    >
      {/* 小三角 */}
      <div
        style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop: '7px solid rgba(255,255,255,0.95)',
        }}
      />
      {message}
    </div>
  );
};
