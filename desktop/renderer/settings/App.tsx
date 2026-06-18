import React, { useEffect, useState, useCallback } from 'react';
import { SettingsPanel } from '@dudu/chat-ui';
import type { CharacterProfile, APIConfig, Memory } from '@dudu/chat-ui';
import type { SettingsWindowAPI } from '../global';

const api = window.duduAPI as SettingsWindowAPI | undefined;

const App: React.FC = () => {
  const [character, setCharacter] = useState<CharacterProfile | null>(null);
  const [apiConfig, setAPIConfig] = useState<APIConfig | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    api?.loadCharacter().then((c) => setCharacter(c as CharacterProfile));
    api?.loadAPIConfig().then((c) => setAPIConfig(c as APIConfig));
    api?.loadMemories?.().then((m) => setMemories(m as Memory[]));
  }, []);

  const handleCharacterSave = useCallback(async (profile: CharacterProfile) => {
    const saved = await api?.saveCharacter(profile) as CharacterProfile | undefined;
    if (saved) setCharacter(saved);
  }, []);

  const handleAPISave = useCallback(async (config: APIConfig) => {
    const saved = await api?.saveAPIConfig(config) as APIConfig | undefined;
    if (saved) setAPIConfig(saved);
  }, []);

  const handleMemoryDelete = useCallback(async (id: string) => {
    await api?.deleteMemory?.(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleMemoriesClear = useCallback(async () => {
    await api?.clearMemories?.();
    setMemories([]);
  }, []);

  const handleMemoriesExport = useCallback(async () => {
    await api?.exportMemories?.();
  }, []);

  if (!character || !apiConfig) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff5f7', color: '#bcaaa4', fontSize: 14,
      }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#fff5f7', padding: 4 }}>
      <SettingsPanel
        character={character}
        onCharacterSave={handleCharacterSave}
        memories={memories}
        onMemoryDelete={handleMemoryDelete}
        onMemoriesClear={handleMemoriesClear}
        onMemoriesExport={handleMemoriesExport}
        apiConfig={apiConfig}
        onAPIConfigSave={handleAPISave}
      />
    </div>
  );
};

export default App;
