package com.dudu.bridge

import android.database.sqlite.SQLiteDatabase
import org.json.JSONArray
import org.json.JSONObject
import com.dudu.notification.LocalNotifier

class BridgeHandler(
    private val db: SQLiteDatabase,
    private val notifier: LocalNotifier
) {
    private var webView: android.webkit.WebView? = null

    fun setWebView(wv: android.webkit.WebView) {
        webView = wv
    }

    fun handle(method: String, params: JSONObject): JSONObject {
        return when (method) {
            "storage.get" -> handleStorageGet(params)
            "storage.set" -> handleStorageSet(params)
            "storage.query" -> handleStorageQuery(params)
            "storage.delete" -> handleStorageDelete(params)
            "notification.show" -> handleNotification(params)
            "notification.cancel" -> handleNotificationCancel(params)
            "chat.getConfig" -> handleGetConfig()
            "chat.saveConfig" -> handleSaveConfig(params)
            "character.get" -> handleGetCharacter()
            "character.save" -> handleSaveCharacter(params)
            else -> JSONObject().apply {
                put("error", "未知方法: $method")
            }
        }
    }

    private fun handleStorageGet(params: JSONObject): JSONObject {
        val key = params.getString("key")
        val cursor = db.rawQuery("SELECT value FROM config WHERE key = ?", arrayOf(key))
        return if (cursor.moveToFirst()) {
            val value = cursor.getString(0)
            cursor.close()
            JSONObject().apply { put("value", value) }
        } else {
            cursor.close()
            JSONObject().apply { put("value", JSONObject.NULL) }
        }
    }

    private fun handleStorageSet(params: JSONObject): JSONObject {
        val key = params.getString("key")
        val value = params.getString("value")
        db.execSQL("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", arrayOf(key, value))
        return JSONObject().apply { put("success", true) }
    }

    private fun handleStorageQuery(params: JSONObject): JSONObject {
        val sql = params.getString("sql")
        val argsJson = params.optJSONArray("args")
        val args = if (argsJson != null) {
            Array(argsJson.length()) { argsJson.getString(it) }
        } else {
            emptyArray()
        }
        val cursor = db.rawQuery(sql, args)
        val columns = cursor.columnNames
        val rows = JSONArray()
        while (cursor.moveToNext()) {
            val row = JSONObject()
            for (col in columns) {
                row.put(col, cursor.getString(cursor.getColumnIndexOrThrow(col)))
            }
            rows.put(row)
        }
        cursor.close()
        return JSONObject().apply { put("rows", rows) }
    }

    private fun handleStorageDelete(params: JSONObject): JSONObject {
        val key = params.getString("key")
        db.execSQL("DELETE FROM config WHERE key = ?", arrayOf(key))
        return JSONObject().apply { put("success", true) }
    }

    private fun handleNotification(params: JSONObject): JSONObject {
        val title = params.getString("title")
        val message = params.getString("message")
        val conversationId = params.optString("conversationId", "")
        notifier.show(title, message, conversationId)
        return JSONObject().apply { put("success", true) }
    }

    private fun handleNotificationCancel(params: JSONObject): JSONObject {
        val tag = params.optString("tag", "")
        notifier.cancel(tag)
        return JSONObject().apply { put("success", true) }
    }

    private fun handleGetConfig(): JSONObject {
        val cursor = db.rawQuery("SELECT * FROM config WHERE key LIKE 'api.%'", null)
        val config = JSONObject()
        while (cursor.moveToNext()) {
            val key = cursor.getString(cursor.getColumnIndexOrThrow("key"))
            val value = cursor.getString(cursor.getColumnIndexOrThrow("value"))
            config.put(key.removePrefix("api."), value)
        }
        cursor.close()
        return config
    }

    private fun handleSaveConfig(params: JSONObject): JSONObject {
        for (key in params.keys()) {
            val value = params.getString(key)
            db.execSQL(
                "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
                arrayOf("api.$key", value)
            )
        }
        return JSONObject().apply { put("success", true) }
    }

    private fun handleGetCharacter(): JSONObject {
        val cursor = db.rawQuery(
            "SELECT * FROM character_profile WHERE id = 'current'",
            null
        )
        return if (cursor.moveToFirst()) {
            val profile = JSONObject().apply {
                put("id", cursor.getString(cursor.getColumnIndexOrThrow("id")))
                put("name", cursor.getString(cursor.getColumnIndexOrThrow("name")))
                put("personality", cursor.getString(cursor.getColumnIndexOrThrow("personality")))
                put("speakingStyle", cursor.getString(cursor.getColumnIndexOrThrow("speaking_style")))
            }
            cursor.close()
            profile
        } else {
            cursor.close()
            JSONObject().apply { put("error", "角色未设置") }
        }
    }

    private fun handleSaveCharacter(params: JSONObject): JSONObject {
        val name = params.getString("name")
        val personality = params.getString("personality")
        val speakingStyle = params.getString("speakingStyle")
        val now = System.currentTimeMillis()
        db.execSQL(
            """INSERT OR REPLACE INTO character_profile
               (id, name, personality, speaking_style, created_at, updated_at)
               VALUES ('current', ?, ?, ?, ?, ?)""",
            arrayOf(name, personality, speakingStyle, now.toString(), now.toString())
        )
        return JSONObject().apply { put("success", true) }
    }

    fun postToWebView(js: String) {
        webView?.post {
            webView?.evaluateJavascript(js, null)
        }
    }

    fun cleanup() {
        db.close()
    }
}
