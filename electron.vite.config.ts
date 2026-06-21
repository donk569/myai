import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'node:path';

const sharedAliases: Record<string, string> = {
  '@dudu/storage': resolve(__dirname, 'shared/storage/src'),
  '@dudu/character-system': resolve(__dirname, 'shared/character-system/src'),
  '@dudu/chat-engine': resolve(__dirname, 'shared/chat-engine/src'),
  '@dudu/memory-system': resolve(__dirname, 'shared/memory-system/src'),
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: sharedAliases },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'desktop/main/src/index.ts'),
        },
        external: ['better-sqlite3', 'active-win'],
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
});
