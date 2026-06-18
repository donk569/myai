package com.dudu

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebSettings
import androidx.appcompat.app.AppCompatActivity
import com.dudu.bridge.BridgeHandler
import com.dudu.bridge.JSBridge
import com.dudu.storage.DatabaseHelper
import com.dudu.notification.LocalNotifier

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var bridgeHandler: BridgeHandler
    private lateinit var jsBridge: JSBridge

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 初始化数据库
        val dbHelper = DatabaseHelper(this)
        val db = dbHelper.writableDatabase
        dbHelper.initializeSchema(db)

        // 初始化通知
        val notifier = LocalNotifier(this)

        // 初始化 JSBridge
        bridgeHandler = BridgeHandler(db, notifier)
        jsBridge = JSBridge(bridgeHandler)

        // 创建 WebView
        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
                setSupportZoom(false)
                builtInZoomControls = false
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
            }

            // 注册 JSBridge
            addJavascriptInterface(jsBridge, "DuduNative")

            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    // 页面加载完成后通知 JS 侧就绪
                    jsBridge.notifyReady()
                }
            }
        }

        // 设置 BridgeHandler 的 WebView 引用
        bridgeHandler.setWebView(webView)

        setContentView(webView)

        // 加载 URL：开发环境用 localhost，生产环境用 asset
        val isDev = intent.getBooleanExtra("dev_mode", false)
        if (isDev) {
            webView.loadUrl("http://10.0.2.2:5173")
        } else {
            webView.loadUrl("file:///android_asset/webview/index.html")
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        bridgeHandler.cleanup()
        super.onDestroy()
    }
}
