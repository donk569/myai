package com.dudu.bridge

import android.webkit.JavascriptInterface
import org.json.JSONObject

/**
 * JS ↔ Kotlin 桥接
 * 暴露给 WebView 的 JS 侧调用：window.DuduNative.call(method, paramsJson, callbackId)
 */
class JSBridge(private val handler: BridgeHandler) {
    private var readyCallback: (() -> Unit)? = null

    @JavascriptInterface
    fun call(method: String, paramsJson: String, callbackId: String) {
        try {
            val params = if (paramsJson.isNotEmpty()) JSONObject(paramsJson) else JSONObject()
            val result = handler.handle(method, params)

            // 通过 evaluateJavascript 回调结果给 JS
            val resultJson = result.toString()
            val js = buildString {
                append("if(window.DuduNative && window.DuduNative.__callback){")
                append("window.DuduNative.__callback('$callbackId', '$resultJson')")
                append("}")
            }
            handler.postToWebView(js)
        } catch (e: Exception) {
            val errorJs = buildString {
                append("if(window.DuduNative && window.DuduNative.__callbackError){")
                append("window.DuduNative.__callbackError('$callbackId', '${e.message}')")
                append("}")
            }
            handler.postToWebView(errorJs)
        }
    }

    fun notifyReady() {
        readyCallback?.invoke()
    }

    fun onReady(callback: () -> Unit) {
        readyCallback = callback
    }
}
