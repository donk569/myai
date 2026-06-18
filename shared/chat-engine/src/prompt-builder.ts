import type { CharacterStore } from '@dudu/character-system';
import { generateSystemPrompt } from '@dudu/character-system';

export interface MemoryContext {
  id: string;
  type: string;
  content: string;
  confidence: number;
}

export function buildSystemPrompt(
  characterStore: CharacterStore,
  memories?: MemoryContext[],
  userContext?: string
): { role: 'system'; content: string } {
  const character = characterStore.get();

  let recentMemories: string | undefined;
  if (memories && memories.length > 0) {
    recentMemories = memories
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)
      .map(m => `- [${m.type}] ${m.content}`)
      .join('\n');
  }

  const content = generateSystemPrompt(character, {
    recentMemories,
    userContext,
    currentTime: new Date().toLocaleString('zh-CN'),
  });

  return { role: 'system', content };
}
