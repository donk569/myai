package com.dudu.storage

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class DatabaseHelper(context: Context) : SQLiteOpenHelper(
    context,
    DATABASE_NAME,
    null,
    DATABASE_VERSION
) {
    companion object {
        const val DATABASE_NAME = "dudu.db"
        const val DATABASE_VERSION = 1
    }

    override fun onCreate(db: SQLiteDatabase) {
        initializeSchema(db)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // 未来版本迁移在此处理
    }

    fun initializeSchema(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """)

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                metadata TEXT
            )
        """)

        db.execSQL("""
            CREATE INDEX IF NOT EXISTS idx_messages_conv
            ON messages(conversation_id, timestamp)
        """)

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL CHECK(type IN ('fact', 'preference', 'event', 'pattern')),
                content TEXT NOT NULL,
                confidence REAL NOT NULL DEFAULT 1.0,
                source_conv_id TEXT,
                created_at INTEGER NOT NULL,
                last_recalled_at INTEGER NOT NULL
            )
        """)

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS character_profile (
                id TEXT PRIMARY KEY DEFAULT 'current',
                name TEXT NOT NULL,
                personality TEXT NOT NULL,
                avatar_path TEXT,
                speaking_style TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """)

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
    }
}
