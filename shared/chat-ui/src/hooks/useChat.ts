import { create } from 'zustand';
import type { Message } from '../types';

interface ChatState {
  messages: Message[];
  loading: boolean;
  streamingContent: string;
  error: string | null;

  addMessage: (msg: Message) => void;
  setMessages: (msgs: Message[]) => void;
  setLoading: (loading: boolean) => void;
  appendStreamToken: (token: string) => void;
  commitStream: (msg: Message) => void;
  setError: (err: string | null) => void;
  clearMessages: () => void;
}

export const useChat = create<ChatState>((set, get) => ({
  messages: [],
  loading: false,
  streamingContent: '',
  error: null,

  addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setLoading: (loading) => set({ loading }),
  appendStreamToken: (token) => set(s => ({ streamingContent: s.streamingContent + token })),
  commitStream: (msg) => set(s => ({
    messages: [...s.messages, msg],
    streamingContent: '',
    loading: false,
  })),
  setError: (err) => set({ error: err, loading: false }),
  clearMessages: () => set({ messages: [], streamingContent: '', error: null }),
}));
