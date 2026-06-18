import { create } from 'zustand';
import type { CharacterProfile, APIConfig } from '../types';

interface SettingsState {
  character: CharacterProfile;
  apiConfig: APIConfig;

  setCharacter: (profile: CharacterProfile) => void;
  setAPIConfig: (config: APIConfig) => void;
}

const defaultCharacter: CharacterProfile = {
  id: 'current',
  name: '嘟嘟',
  personality: '可爱、开朗、爱笑，有时感性，像猫一样的好奇心',
  avatarPath: null,
  speakingStyle: '说话亲切自然，偶尔带点撒娇的语气，喜欢用"喵~"结尾',
};

const defaultAPIConfig: APIConfig = {
  apiKey: '',
  apiBaseUrl: 'https://api.deepseek.com',
  temperature: 0.8,
  maxTokens: 2048,
};

export const useSettings = create<SettingsState>((set) => ({
  character: defaultCharacter,
  apiConfig: defaultAPIConfig,

  setCharacter: (profile) => set({ character: profile }),
  setAPIConfig: (config) => set({ apiConfig: config }),
}));
