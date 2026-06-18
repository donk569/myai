import { create } from 'zustand';
import type { Conversation } from '../types';

interface ConversationsState {
  conversations: Conversation[];
  selectedId: string | null;

  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  selectConversation: (id: string | null) => void;
}

export const useConversations = create<ConversationsState>((set) => ({
  conversations: [],
  selectedId: null,

  setConversations: (convs) => set({ conversations: convs }),
  addConversation: (conv) => set(s => ({ conversations: [conv, ...s.conversations] })),
  updateConversation: (id, updates) => set(s => ({
    conversations: s.conversations.map(c => c.id === id ? { ...c, ...updates } : c),
  })),
  deleteConversation: (id) => set(s => ({
    conversations: s.conversations.filter(c => c.id !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),
  selectConversation: (id) => set({ selectedId: id }),
}));
