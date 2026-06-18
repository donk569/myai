import type { DuduDatabase } from '@dudu/storage';
import type { CharacterProfile, CharacterDefaults, ValidationError } from './types';
import type { CharacterProfileRow } from '@dudu/storage';

const DEFAULT_CHARACTER: CharacterDefaults = {
  name: '嘟嘟',
  personality: '可爱、开朗、爱笑，像猫一样充满好奇心。有时感性，喜欢撒娇。是用户的贴心AI伙伴，会记住关于用户的一切，用温暖的方式陪伴。天生乐观，偶尔犯点小迷糊，但总能用自己的方式让用户开心。喜欢粉色、甜食、阳光和一切可爱的事物。',
  speakingStyle: '说话亲切自然，带点俏皮的语气。偶尔用"喵~"结尾，喜欢用emoji和颜文字表达心情。当用户情绪低落时会特别温柔体贴，当用户开心时会一起雀跃。称呼用户为"你"，自称"嘟嘟"。句子长度适中，不啰嗦。',
};

export class CharacterStore {
  private db: DuduDatabase;

  constructor(db: DuduDatabase) {
    this.db = db;
  }

  // 获取当前角色，不存在则返回默认
  get(): CharacterProfile {
    const row = this.db.get<CharacterProfileRow>(
      "SELECT * FROM character_profile WHERE id = 'current'"
    );
    if (row) {
      return this.rowToProfile(row);
    }
    return this.createDefault();
  }

  // 保存/更新角色
  save(profile: Omit<CharacterProfile, 'id' | 'createdAt' | 'updatedAt'>): CharacterProfile {
    const now = Date.now();
    const existing = this.db.get<CharacterProfileRow>(
      "SELECT id FROM character_profile WHERE id = 'current'"
    );

    if (existing) {
      this.db.run(
        `UPDATE character_profile
         SET name = ?, personality = ?, avatar_path = ?, speaking_style = ?, updated_at = ?
         WHERE id = 'current'`,
        [profile.name, profile.personality, profile.avatarPath ?? null, profile.speakingStyle, now]
      );
    } else {
      this.db.run(
        `INSERT INTO character_profile (id, name, personality, avatar_path, speaking_style, created_at, updated_at)
         VALUES ('current', ?, ?, ?, ?, ?, ?)`,
        ['current', profile.name, profile.personality, profile.avatarPath ?? null, profile.speakingStyle, now, now]
      );
    }

    return this.get();
  }

  // 重置为默认角色
  reset(): CharacterProfile {
    this.db.run(
      "DELETE FROM character_profile WHERE id = 'current'"
    );
    return this.get();
  }

  // 更新单个字段
  updateField<K extends keyof Omit<CharacterProfile, 'id' | 'createdAt' | 'updatedAt'>>(
    field: K,
    value: CharacterProfile[K]
  ): CharacterProfile {
    const fieldMap: Record<string, string> = {
      name: 'name',
      personality: 'personality',
      avatarPath: 'avatar_path',
      speakingStyle: 'speaking_style',
    };

    const dbField = fieldMap[field as string] || field;
    this.db.run(
      `UPDATE character_profile SET ${dbField} = ?, updated_at = ? WHERE id = 'current'`,
      [value as string, Date.now()]
    );
    return this.get();
  }

  // 验证角色信息
  validate(profile: Partial<CharacterProfile>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (profile.name !== undefined) {
      if (!profile.name.trim()) errors.push({ field: 'name', message: '名字不能为空' });
      if (profile.name.length > 50) errors.push({ field: 'name', message: '名字不能超过50个字符' });
    }

    if (profile.personality !== undefined) {
      if (!profile.personality.trim()) errors.push({ field: 'personality', message: '性格描述不能为空' });
      if (profile.personality.length > 2000) errors.push({ field: 'personality', message: '性格描述不能超过2000个字符' });
    }

    if (profile.speakingStyle !== undefined) {
      if (!profile.speakingStyle.trim()) errors.push({ field: 'speakingStyle', message: '说话风格不能为空' });
      if (profile.speakingStyle.length > 2000) errors.push({ field: 'speakingStyle', message: '说话风格不能超过2000个字符' });
    }

    return errors;
  }

  // 获取默认角色信息（不存库）
  getDefaults(): CharacterDefaults {
    return { ...DEFAULT_CHARACTER };
  }

  private createDefault(): CharacterProfile {
    const now = Date.now();
    this.db.run(
      `INSERT INTO character_profile (id, name, personality, avatar_path, speaking_style, created_at, updated_at)
       VALUES ('current', ?, ?, NULL, ?, ?, ?)`,
      [DEFAULT_CHARACTER.name, DEFAULT_CHARACTER.personality, DEFAULT_CHARACTER.speakingStyle, now, now]
    );
    return {
      id: 'current',
      name: DEFAULT_CHARACTER.name,
      personality: DEFAULT_CHARACTER.personality,
      avatarPath: null,
      speakingStyle: DEFAULT_CHARACTER.speakingStyle,
      createdAt: now,
      updatedAt: now,
    };
  }

  private rowToProfile(row: CharacterProfileRow): CharacterProfile {
    return {
      id: row.id,
      name: row.name,
      personality: row.personality,
      avatarPath: row.avatar_path,
      speakingStyle: row.speaking_style,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
