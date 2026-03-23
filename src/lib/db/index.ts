import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// DB ファイルのパスを解決
function getDatabasePath(): string {
  const dbUrl = process.env.DATABASE_URL || "./data/animehubs.db";
  return path.resolve(process.cwd(), dbUrl);
}

// DB ディレクトリが存在しない場合は作成
function ensureDbDirectory(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// シングルトンパターンでDB接続を管理
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqliteInstance: Database.Database | null = null;

export function getDb() {
  if (!dbInstance) {
    const dbPath = getDatabasePath();
    ensureDbDirectory(dbPath);
    sqliteInstance = new Database(dbPath);
    sqliteInstance.pragma("journal_mode = WAL");
    sqliteInstance.pragma("foreign_keys = ON");
    dbInstance = drizzle(sqliteInstance, { schema });
  }
  return dbInstance;
}

// テーブル作成（マイグレーションの代替: 開発用）
export function initializeDatabase(): void {
  const dbPath = getDatabasePath();
  ensureDbDirectory(dbPath);
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_sv TEXT NOT NULL,
      description_en TEXT NOT NULL,
      description_sv TEXT NOT NULL,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 1,
      category TEXT NOT NULL,
      condition TEXT NOT NULL,
      images TEXT NOT NULL DEFAULT '[]',
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      location TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_amount INTEGER NOT NULL,
      items TEXT NOT NULL,
      access_token TEXT NOT NULL DEFAULT '',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  sqlite.close();
}

export { schema };
