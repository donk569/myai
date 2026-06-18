export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const FLOATING_BALL_SIZE = 80;
export const CHAT_WINDOW_WIDTH = 360;
export const CHAT_WINDOW_HEIGHT = 520;

export type SnapEdge = 'left' | 'right';
export type Expression = 'smile' | 'thinking' | 'surprised' | 'sleepy' | 'excited' | 'normal';

export interface IPCChannels {
  // 悬浮球 → 主进程
  'ball:click': void;
  'ball:drag-start': void;
  'ball:drag-end': { x: number; y: number };
  'ball:right-click': void;

  // 主进程 → 悬浮球
  'ball:set-expression': Expression;
  'ball:show-bubble': { message: string; duration: number };

  // 聊天窗 ↔ 主进程
  'chat:send-message': { content: string; conversationId: string };
  'chat:stream-token': { token: string };
  'chat:stream-complete': { messageId: string; content: string };
  'chat:stream-error': { error: string };
  'chat:close': void;
  'chat:load-conversation': { conversationId: string };
  'chat:load-messages': { conversationId: string };

  // 设置 ↔ 主进程
  'settings:save-character': Record<string, unknown>;
  'settings:load-character': void;
  'settings:save-api-config': Record<string, unknown>;
  'settings:load-api-config': void;

  // 隐私
  'privacy:toggle': void;
  'privacy:status': boolean;

  // 窗口控制
  'window:hide': void;
  'window:show': void;
  'window:quit': void;
}
