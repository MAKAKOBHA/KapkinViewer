/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/KapkinViewer/' : '/',
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 3000,
  },
  preview: {
    port: 3030,
  },
  css: {
    postcss: {
      plugins: [autoprefixer({})],
    },
  },
  resolve: {
    alias: {
      components: '/src/components',
      hooks: '/src/hooks',
      assets: '/src/assets',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));
