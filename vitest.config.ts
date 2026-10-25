import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'astro:content': path.resolve(__dirname, './src/test/astro-content-mock.ts'),
    },
  },
  test: {
    environment: 'node',
  },
});
