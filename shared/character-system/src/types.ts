export interface CharacterProfile {
  id: string;
  name: string;
  personality: string;
  avatarPath: string | null;
  speakingStyle: string;
  createdAt: number;
  updatedAt: number;
}

export interface CharacterDefaults {
  name: string;
  personality: string;
  speakingStyle: string;
}

export interface ValidationError {
  field: string;
  message: string;
}
