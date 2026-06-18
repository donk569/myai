export type MemoryType = 'fact' | 'preference' | 'event' | 'pattern';

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  confidence: number;
  sourceConvId: string | null;
  createdAt: number;
  lastRecalledAt: number;
}

export interface ExtractedMemory {
  type: MemoryType;
  content: string;
  confidence: number;
}

export interface BehaviorPattern {
  category: string;
  summary: string;
  evidence: string[];
  confidence: number;
}

export interface ExtractionResult {
  memories: ExtractedMemory[];
  error?: string;
}

export interface DecayConfig {
  decayThresholdDays: number;
  decayAmount: number;
  cleanupThreshold: number;
}
