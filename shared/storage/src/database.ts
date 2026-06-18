import Database from 'better-sqlite3';
import type { DatabaseOptions } from './types';

export class DuduDatabase {
  private db: Database.Database | null = null;
  private options: DatabaseOptions;

  constructor(options: DatabaseOptions) {
    this.options = options;
    this.open();
  }

  open(): void {
    this.db = new Database(this.options.dbPath, {
      readonly: this.options.readonly ?? false,
    });
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  exec(sql: string): void {
    this.ensureOpen();
    this.db!.exec(sql);
  }

  query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    this.ensureOpen();
    return this.db!.prepare(sql).all(...params) as T[];
  }

  get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
    this.ensureOpen();
    return this.db!.prepare(sql).get(...params) as T | undefined;
  }

  run(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number | bigint } {
    this.ensureOpen();
    const result = this.db!.prepare(sql).run(...params);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  }

  transaction<T>(fn: () => T): T {
    this.ensureOpen();
    const txn = this.db!.transaction(fn);
    return txn();
  }

  private ensureOpen(): void {
    if (!this.db) throw new Error('数据库未打开');
  }
}
