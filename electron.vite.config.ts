import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'desktop/main/src/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          'floating-ball-preload': resolve(__dirname, 'desktop/preload/floating-ball-preload.ts'),
          'chat-preload': resolve(__dirname, 'desktop/preload/chat-preload.ts'),
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          'floating-ball': resolve(__dirname, 'desktop/renderer/floating-ball/index.html'),
          chat: resolve(__dirname, 'desktop/renderer/chat/index.html'),
          settings: resolve(__dirname, 'desktop/renderer/settings/index.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@dudu/chat-ui': resolve(__dirname, 'shared/chat-ui/src'),
      },
    },
  },
});
