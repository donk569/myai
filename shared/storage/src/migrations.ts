import type { DuduDatabase } from './database';
import type { Migration } from './types';

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'create_initial_schema',
    up: `
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, timestamp);

      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('fact', 'preference', 'event', 'pattern')),
        content TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        source_conv_id TEXT,
        created_at INTEGER NOT NULL,
        last_recalled_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_recalled ON memories(last_recalled_at);

      CREATE TABLE IF NOT EXISTS character_profile (
        id TEXT PRIMARY KEY DEFAULT 'current',
        name TEXT NOT NULL,
        personality TEXT NOT NULL,
        avatar_path TEXT,
        speaking_style TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `
  }
];

export function runMigrations(db: DuduDatabase): void {
  // Create migrations table first (needed before any migration runs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);

  const applied = db.query<{ version: number }>(
    'SELECT version FROM migrations ORDER BY version'
  );
  const appliedVersions = new Set(applied.map(r => r.version));

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      db.exec(migration.up);
      db.run(
        'INSERT INTO migrations (version, name) VALUES (?, ?)',
        [migration.version, migration.name]
      );
    }
  }
}
