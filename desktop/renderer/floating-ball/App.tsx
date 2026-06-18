import React, { useState, useEffect, useCallback } from 'react';
import { Character } from './Character';
import { ProactiveBubble } from './ProactiveBubble';
import type { Expression } from './Character';
import type { FloatingBallAPI } from '../global';

const App: React.FC = () => {
  const [expression, setExpression] = useState<Expression>('normal');
  const [bubble, setBubble] = useState<{ message: string; key: number } | null>(null);

  useEffect(() => {
    const api = window.duduAPI as FloatingBallAPI | undefined;
    api?.onExpressionChanged?.((exp: string) => {
      setExpression(exp as Expression);
    });
    api?.onShowBubble?.((data: { message: string; duration: number }) => {
      setBubble({ message: data.message, key: Date.now() });
    });
  }, []);

  const api2 = window.duduAPI as FloatingBallAPI | undefined;

  const handleClick = useCallback(() => {
    api2?.onClick?.();
  }, []);

  const handleMouseDown = useCallback(() => {
    api2?.onDragStart?.();
  }, []);

  const handleDismissBubble = useCallback(() => {
    setBubble(null);
  }, []);

  return (
    <div className="floating-ball-container">
      {bubble && (
        <ProactiveBubble
          key={bubble.key}
          message={bubble.message}
          onDismiss={handleDismissBubble}
        />
      )}
      <div
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        <Character expression={expression} size={80} />
      </div>
    </div>
  );
};

export default App;
