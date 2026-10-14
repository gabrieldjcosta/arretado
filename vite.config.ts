/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import pacote from './package.json' with { type: 'json' };
import { CSP, cabecalhosHospedagem } from './config/seguranca';

/**
 * CSP estrita (D18, T9). Só na versão construída: o servidor de desenvolvimento do Vite
 * injeta estilos em linha. O E2E roda sobre a versão construída e verifica violações.
 * A versão construída também leva o `_headers` da hospedagem (Cloudflare Workers, T18).
 */
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
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: cabecalhosHospedagem() });
    },
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
    // Bibliotecas em pacotes próprios: o cache do navegador sobrevive a um deploy que só muda o app.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            { name: 'vendor-dexie', test: /node_modules[\\/]dexie[\\/]/ },
            { name: 'vendor-zod', test: /node_modules[\\/]zod[\\/]/ },
          ],
        },
      },
    },
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
            'worker/**/*.test.ts',
            'eslint/**/*.test.ts',
            'supabase/**/*.test.ts',
            'config/**/*.test.ts',
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
