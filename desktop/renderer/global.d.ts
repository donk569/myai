export interface FloatingBallAPI {
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
  onExpressionChanged: (cb: (exp: string) => void) => void;
  onShowBubble: (cb: (data: { message: string; duration: number }) => void) => void;
  hideWindow: () => void;
}

export interface ChatWindowAPI {
  loadConversations: () => Promise<unknown[]>;
  createConversation: () => Promise<unknown>;
  deleteConversation: (id: string) => Promise<boolean>;
  loadMessages: (convId: string) => Promise<unknown[]>;
  sendMessage: (content: string, convId: string) => void;
  onStreamToken: (cb: (token: string) => void) => void;
  onStreamComplete: (cb: (data: { messageId: string; content: string }) => void) => void;
  onStreamError: (cb: (error: string) => void) => void;
  closeChat: () => void;
}

export interface SettingsWindowAPI {
  loadCharacter: () => Promise<unknown>;
  saveCharacter: (profile: unknown) => Promise<unknown>;
  loadAPIConfig: () => Promise<unknown>;
  saveAPIConfig: (config: unknown) => Promise<unknown>;
  loadMemories: () => Promise<unknown[]>;
  deleteMemory: (id: string) => Promise<boolean>;
  clearMemories: () => Promise<boolean>;
  exportMemories: () => Promise<unknown[]>;
}

declare global {
  interface Window {
    duduAPI?: FloatingBallAPI | ChatWindowAPI | SettingsWindowAPI;
  }
}
