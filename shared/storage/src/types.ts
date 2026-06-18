// 数据库行类型
export interface ConversationRow {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata: string | null; // JSON
}

export interface MemoryRow {
  id: string;
  type: 'fact' | 'preference' | 'event' | 'pattern';
  content: string;
  confidence: number;
  source_conv_id: string | null;
  created_at: number;
  last_recalled_at: number;
}

export interface CharacterProfileRow {
  id: string;
  name: string;
  personality: string;
  avatar_path: string | null;
  speaking_style: string;
  created_at: number;
  updated_at: number;
}

export interface ConfigRow {
  key: string;
  value: string;
}

export interface DatabaseOptions {
  dbPath: string;
  readonly?: boolean;
}

export interface Migration {
  version: number;
  name: string;
  up: string; // SQL
}
