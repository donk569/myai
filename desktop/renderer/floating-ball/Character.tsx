import React, { useEffect, useState } from 'react';

export type Expression = 'normal' | 'smile' | 'thinking' | 'surprised' | 'sleepy' | 'excited';

interface CharacterProps {
  expression?: Expression;
  size?: number;
}

export const Character: React.FC<CharacterProps> = ({ expression = 'normal', size = 80 }) => {
  const [blinking, setBlinking] = useState(false);
  const [earWiggle, setEarWiggle] = useState(false);

  // 自动眨眼
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // 猫耳偶尔抖动
  useEffect(() => {
    const wiggleInterval = setInterval(() => {
      setEarWiggle(true);
      setTimeout(() => setEarWiggle(false), 400);
    }, 5000 + Math.random() * 5000);
    return () => clearInterval(wiggleInterval);
  }, []);

  const scale = size / 80;

  return (
    <div style={{
      width: size,
      height: size,
      position: 'relative',
      animation: 'breathe 3s ease-in-out infinite',
    }}>
      {/* 脸部圆形背景 */}
      <div style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #fff5f7, #ffccbc, #ffab91)',
        boxShadow: `
          0 4px 24px rgba(255,138,101,0.35),
          inset 0 -4px 8px rgba(255,138,101,0.15),
          0 0 0 3px rgba(255,255,255,0.3)
        `,
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow 0.3s',
      }}>
        {/* 左猫耳 */}
        <div style={{
          position: 'absolute',
          top: -6 * scale,
          left: 14 * scale,
          width: 0, height: 0,
          borderLeft: `${9 * scale}px solid transparent`,
          borderRight: `${9 * scale}px solid transparent`,
          borderBottom: `${16 * scale}px solid #3a3a3a`,
          borderRadius: '40%',
          transform: `rotate(-15deg) ${earWiggle ? 'scale(1.05)' : ''}`,
          transition: 'transform 0.2s ease',
        }}>
          <div style={{
            position: 'absolute', top: 3 * scale, left: -4.5 * scale,
            width: 0, height: 0,
            borderLeft: `${5 * scale}px solid transparent`,
            borderRight: `${5 * scale}px solid transparent`,
            borderBottom: `${9 * scale}px solid #f48fb1`,
            borderRadius: '40%',
          }} />
        </div>

        {/* 右猫耳 */}
        <div style={{
          position: 'absolute',
          top: -6 * scale,
          right: 14 * scale,
          width: 0, height: 0,
          borderLeft: `${9 * scale}px solid transparent`,
          borderRight: `${9 * scale}px solid transparent`,
          borderBottom: `${16 * scale}px solid #3a3a3a`,
          borderRadius: '40%',
          transform: `rotate(15deg) ${earWiggle ? 'scale(1.05)' : ''}`,
          transition: 'transform 0.2s ease',
        }}>
          <div style={{
            position: 'absolute', top: 3 * scale, left: -4.5 * scale,
            width: 0, height: 0,
            borderLeft: `${5 * scale}px solid transparent`,
            borderRight: `${5 * scale}px solid transparent`,
            borderBottom: `${9 * scale}px solid #f48fb1`,
            borderRadius: '40%',
          }} />
        </div>

        {/* 刘海 */}
        <div style={{
          position: 'absolute', top: 8 * scale, left: '15%', width: '70%', height: 20 * scale,
          background: '#4a2c2a', borderRadius: '60% 60% 0 0',
        }} />

        {/* 眼睛 */}
        <div style={{
          position: 'absolute', top: 25 * scale, width: '100%',
          display: 'flex', justifyContent: 'center', gap: 14 * scale,
        }}>
          {/* 左眼 */}
          <div style={{
            width: 4.5 * scale,
            height: getEyeHeight(expression, blinking) * scale,
            background: '#3e2723',
            borderRadius: getEyeShape(expression, blinking),
            transition: 'all 0.15s',
            position: 'relative',
            boxShadow: expression === 'excited' ? '0 0 6px rgba(255,255,200,0.6)' : 'none',
          }}>
            {!blinking && expression !== 'sleepy' && (
              <>
                <div style={{ position: 'absolute', top: 1.5 * scale, left: 1 * scale, width: 1.5 * scale, height: 1.5 * scale, background: 'white', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', top: 3 * scale, left: 2.5 * scale, width: 0.8 * scale, height: 0.8 * scale, background: 'white', borderRadius: '50%' }} />
              </>
            )}
          </div>
          {/* 右眼 */}
          <div style={{
            width: 4.5 * scale,
            height: getEyeHeight(expression, blinking) * scale,
            background: '#3e2723',
            borderRadius: getEyeShape(expression, blinking),
            transition: 'all 0.15s',
            position: 'relative',
            boxShadow: expression === 'excited' ? '0 0 6px rgba(255,255,200,0.6)' : 'none',
          }}>
            {!blinking && expression !== 'sleepy' && (
              <>
                <div style={{ position: 'absolute', top: 1.5 * scale, left: 1 * scale, width: 1.5 * scale, height: 1.5 * scale, background: 'white', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', top: 3 * scale, left: 2.5 * scale, width: 0.8 * scale, height: 0.8 * scale, background: 'white', borderRadius: '50%' }} />
              </>
            )}
          </div>
        </div>

        {/* 腮红 */}
        <div style={{
          position: 'absolute', top: 33 * scale, left: 10 * scale,
          width: 11 * scale, height: 6 * scale,
          background: '#f48fb1', borderRadius: '50%',
          opacity: expression === 'excited' ? 0.7 : 0.45,
          transition: 'opacity 0.3s',
        }} />
        <div style={{
          position: 'absolute', top: 33 * scale, right: 10 * scale,
          width: 11 * scale, height: 6 * scale,
          background: '#f48fb1', borderRadius: '50%',
          opacity: expression === 'excited' ? 0.7 : 0.45,
          transition: 'opacity 0.3s',
        }} />

        {/* 鼻子 */}
        <div style={{
          position: 'absolute', top: 33 * scale, left: '50%', transform: 'translateX(-50%)',
          width: 3 * scale, height: 2 * scale,
          background: '#f48fb1', borderRadius: '50%',
        }} />

        {/* 嘴巴 */}
        <div style={{
          position: 'absolute', top: 38 * scale, left: '50%', transform: 'translateX(-50%)',
          fontSize: 10 * scale, color: '#e57373', transition: 'all 0.2s',
        }}>
          {getMouthEmoji(expression)}
        </div>

        {/* 胡须 */}
        {[
          { top: 36, left: -3, rot: -8 },
          { top: 38, left: -3, rot: 0, width: 12 },
          { top: 36, right: -3, rot: 8 },
          { top: 38, right: -3, rot: 0, width: 12 },
        ].map((w, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: w.top * scale,
            [w.right !== undefined ? 'right' : 'left']: (w.right ?? w.left!) * scale,
            width: (w.width || 14) * scale,
            height: 1 * scale,
            background: '#bcaaa4', borderRadius: 1,
            transform: `rotate(${w.rot}deg)`,
            opacity: 0.5,
          }} />
        ))}

        {/* 项圈 */}
        <div style={{
          position: 'absolute', bottom: 14 * scale, left: '50%', transform: 'translateX(-50%)',
          width: 28 * scale, height: 5 * scale,
          background: '#e91e63', borderRadius: 3 * scale,
        }} />
        {/* 铃铛 */}
        <div style={{
          position: 'absolute', bottom: 12 * scale, left: '50%', transform: 'translateX(-50%)',
          width: 7 * scale, height: 7 * scale,
          background: 'radial-gradient(circle at 40% 35%, #fff9c4, #ffd54f, #ffb300)',
          borderRadius: '50%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          animation: expression === 'excited' ? 'bellRing 0.3s ease-in-out 3' : 'none',
        }} />

        {/* 呆毛（excited） */}
        {expression === 'excited' && (
          <div style={{
            position: 'absolute', top: -8 * scale, left: '50%',
            width: 2 * scale, height: 12 * scale,
            background: '#4a2c2a', borderRadius: '50%',
            transformOrigin: 'bottom',
            animation: 'ahoge 0.5s ease-in-out infinite',
          }} />
        )}

        {/* 问号（thinking） */}
        {expression === 'thinking' && (
          <div style={{
            position: 'absolute', top: -10 * scale, right: -5 * scale,
            fontSize: 14 * scale, color: '#f48fb1',
            animation: 'thinkingFloat 1.5s ease-in-out infinite',
            opacity: 0.8,
          }}>?</div>
        )}
      </div>
    </div>
  );
};

function getEyeHeight(expr: string, blinking: boolean): number {
  if (blinking) return 0.5;
  switch (expr) {
    case 'surprised': case 'excited': return 5;
    case 'sleepy': return 2;
    default: return 4;
  }
}

function getEyeShape(expr: string, blinking: boolean): string {
  if (blinking) return '0%';
  switch (expr) {
    case 'smile': return '50% 50% 10% 10%';
    case 'surprised': case 'excited': return '50%';
    case 'sleepy': return '50% 50% 10% 10%';
    default: return '50%';
  }
}

function getMouthEmoji(expr: string): string {
  switch (expr) {
    case 'smile': return '◡';
    case 'thinking': return '~';
    case 'surprised': return '○';
    case 'sleepy': return '~';
    case 'excited': return '▽';
    default: return 'ω';
  }
}
