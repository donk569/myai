# 嘟嘟 Android 端

微信式聊天界面。原生 Kotlin 壳 + WebView 渲染 React 聊天 UI。

## 构建

1. 用 Android Studio 打开 `mobile/` 目录
2. Sync Gradle
3. Build APK

## 架构

- MainActivity: 全屏 WebView 宿主
- JSBridge: @JavascriptInterface 暴露原生能力给 JS
- BridgeHandler: 路由 JS 调用到具体处理逻辑
- DatabaseHelper: SQLite（与 PC 端相同 Schema）
- LocalNotifier: Android NotificationChannel 本地推送
