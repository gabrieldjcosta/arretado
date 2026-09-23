/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/testes/setup.ts'],
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unidade',
          include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'eslint/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'carga',
          include: ['scripts/**/*.carga.ts'],
          testTimeout: 300_000,
        },
      },
    ],
  },
});
