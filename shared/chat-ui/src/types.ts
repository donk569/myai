export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  personality: string;
  avatarPath: string | null;
  speakingStyle: string;
}

export interface APIConfig {
  apiKey: string;
  apiBaseUrl: string;
  temperature: number;
  maxTokens: number;
}

export interface Memory {
  id: string;
  type: 'fact' | 'preference' | 'event' | 'pattern';
  content: string;
  confidence: number;
  createdAt: number;
}
