/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import pacote from './package.json' with { type: 'json' };

/**
 * CSP estrita (D18, T9). Só na versão construída: o servidor de desenvolvimento do Vite
 * injeta estilos em linha. O E2E roda sobre a versão construída e verifica violações.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  'trusted-types dompurify',
].join('; ');

function csp(): Plugin {
  return {
    name: 'arretado-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  plugins: [react(), csp()],
  define: {
    __VERSAO_APP__: JSON.stringify(pacote.version),
  },
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
    // App local-first baixado uma vez (~160 KB gzip); divisão por rota junto com o PWA (F4).
    chunkSizeWarningLimit: 700,
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
          include: [
            'src/**/*.test.{ts,tsx}',
            'scripts/**/*.test.ts',
            'eslint/**/*.test.ts',
            'supabase/**/*.test.ts',
          ],
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
