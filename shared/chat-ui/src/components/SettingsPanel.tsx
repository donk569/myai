import React, { useState } from 'react';
import type { CharacterProfile, APIConfig, Memory } from '../types';

interface SettingsPanelProps {
  character: CharacterProfile;
  onCharacterSave: (profile: CharacterProfile) => void;
  memories: Memory[];
  onMemoryDelete: (id: string) => void;
  onMemoriesClear: () => void;
  onMemoriesExport: () => void;
  apiConfig: APIConfig;
  onAPIConfigSave: (config: APIConfig) => void;
}

type Tab = 'character' | 'memory' | 'api';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  character, onCharacterSave,
  memories, onMemoryDelete, onMemoriesClear, onMemoriesExport,
  apiConfig, onAPIConfigSave,
}) => {
  const [tab, setTab] = useState<Tab>('character');
  const [name, setName] = useState(character.name);
  const [personality, setPersonality] = useState(character.personality);
  const [speakingStyle, setSpeakingStyle] = useState(character.speakingStyle);
  const [apiKey, setApiKey] = useState(apiConfig.apiKey);
  const [apiBaseUrl, setApiBaseUrl] = useState(apiConfig.apiBaseUrl);
  const [temperature, setTemperature] = useState(apiConfig.temperature);
  const [maxTokens, setMaxTokens] = useState(apiConfig.maxTokens);
  const [memorySearch, setMemorySearch] = useState('');

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'character', label: '角色', emoji: '🎀' },
    { key: 'memory', label: '记忆', emoji: '🧠' },
    { key: 'api', label: 'API', emoji: '🔑' },
  ];

  const filteredMemories = memories.filter(m =>
    m.content.toLowerCase().includes(memorySearch.toLowerCase())
  );

  const tabContent: Record<Tab, React.ReactNode> = {
    character: (
      <div>
        <label style={labelStyle}>名字</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="嘟嘟" />
        <label style={labelStyle}>性格</label>
        <textarea value={personality} onChange={e => setPersonality(e.target.value)} style={textareaStyle} placeholder="可爱、开朗、爱笑..." rows={3} />
        <label style={labelStyle}>说话风格</label>
        <textarea value={speakingStyle} onChange={e => setSpeakingStyle(e.target.value)} style={textareaStyle} placeholder="亲切自然、偶尔撒娇..." rows={3} />
        <button onClick={() => onCharacterSave({ ...character, name, personality, speakingStyle })} style={saveBtnStyle}>
          保存角色
        </button>
      </div>
    ),
    memory: (
      <div>
        <input value={memorySearch} onChange={e => setMemorySearch(e.target.value)} style={inputStyle} placeholder="搜索记忆..." />
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={onMemoriesExport} style={smallBtnStyle}>📥 导出</button>
          <button onClick={onMemoriesClear} style={{ ...smallBtnStyle, background: '#ffcdd2', color: '#c62828' }}>🗑 清空</button>
        </div>
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          {filteredMemories.map(m => (
            <div key={m.id} style={memoryItemStyle}>
              <span style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 8,
                background: typeColor(m.type),
                color: '#fff',
                marginRight: 8,
              }}>{typeLabel(m.type)}</span>
              <span style={{ flex: 1, fontSize: 13, color: '#5d4037' }}>{m.content}</span>
              <button onClick={() => onMemoryDelete(m.id)} style={deleteBtnStyle}>✕</button>
            </div>
          ))}
        </div>
      </div>
    ),
    api: (
      <div>
        <label style={labelStyle}>API Key</label>
        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} style={inputStyle} placeholder="sk-..." />
        <label style={labelStyle}>API Base URL</label>
        <input value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)} style={inputStyle} placeholder="https://api.deepseek.com" />
        <label style={labelStyle}>Temperature: {temperature}</label>
        <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} style={{ width: '100%' }} />
        <label style={labelStyle}>Max Tokens</label>
        <input type="number" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))} style={inputStyle} />
        <button onClick={() => onAPIConfigSave({ apiKey, apiBaseUrl, temperature, maxTokens })} style={saveBtnStyle}>
          保存配置
        </button>
      </div>
    ),
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#fff5f7',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(244,143,177,0.2)',
        background: 'rgba(255,255,255,0.8)',
      }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1,
            padding: '12px 0',
            border: 'none',
            background: tab === t.key ? 'rgba(248,187,208,0.2)' : 'transparent',
            color: tab === t.key ? '#c2185b' : '#bcaaa4',
            fontSize: 14,
            fontWeight: tab === t.key ? 600 : 400,
            cursor: 'pointer',
            borderBottom: tab === t.key ? '2px solid #f48fb1' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>{t.emoji} {t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {tabContent[tab]}
      </div>
    </div>
  );
};

// 辅助函数
function typeColor(type: string): string {
  const colors: Record<string, string> = { fact: '#42a5f5', preference: '#ab47bc', event: '#ff7043', pattern: '#66bb6a' };
  return colors[type] || '#999';
}
function typeLabel(type: string): string {
  const labels: Record<string, string> = { fact: '事实', preference: '偏好', event: '事件', pattern: '模式' };
  return labels[type] || type;
}

// 样式常量
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: '#8d6e63', marginTop: 12, marginBottom: 4, fontWeight: 500 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(244,143,177,0.3)', fontSize: 14, color: '#5d4037', outline: 'none', background: '#fff', boxSizing: 'border-box' };
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' };
const saveBtnStyle: React.CSSProperties = { marginTop: 16, width: '100%', padding: '10px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg, #f8bbd0, #f06292)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const smallBtnStyle: React.CSSProperties = { padding: '6px 14px', borderRadius: 14, border: 'none', background: '#fce4ec', color: '#c2185b', fontSize: 12, cursor: 'pointer' };
const memoryItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(244,143,177,0.1)', fontSize: 13 };
const deleteBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#bcaaa4', cursor: 'pointer', fontSize: 14, padding: '0 4px' };
