// 嘟嘟 Android Native Bridge — JS 侧封装

interface NativeCallback {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

const pendingCallbacks = new Map<string, NativeCallback>();
const TIMEOUT_MS = 5000;

// 调用原生方法
export function callNative(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const callbackId = generateId();

    // 设置超时
    const timeout = setTimeout(() => {
      pendingCallbacks.delete(callbackId);
      reject(new Error(`Native call "${method}" timed out after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);

    pendingCallbacks.set(callbackId, {
      resolve: (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });

    try {
      // @ts-expect-error: DuduNative 由 Kotlin JSBridge 注入
      window.DuduNative?.call(method, JSON.stringify(params), callbackId);
    } catch (error) {
      clearTimeout(timeout);
      pendingCallbacks.delete(callbackId);
      reject(error);
    }
  });
}

// 由 Kotlin 侧回调（挂在 window 上供 evaluateJavascript 调用）
export function setupBridgeCallbacks(): void {
  // @ts-expect-error: 全局回调注册
  window.DuduNative = window.DuduNative || {};

  // @ts-expect-error
  window.DuduNative.__callback = (callbackId: string, resultJson: string) => {
    const cb = pendingCallbacks.get(callbackId);
    if (cb) {
      pendingCallbacks.delete(callbackId);
      try {
        const result = JSON.parse(resultJson);
        cb.resolve(result);
      } catch {
        cb.resolve(resultJson);
      }
    }
  };

  // @ts-expect-error
  window.DuduNative.__callbackError = (callbackId: string, errorMessage: string) => {
    const cb = pendingCallbacks.get(callbackId);
    if (cb) {
      pendingCallbacks.delete(callbackId);
      cb.reject(new Error(errorMessage));
    }
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
