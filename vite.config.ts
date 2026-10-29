/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import pacote from './package.json' with { type: 'json' };
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cabecalhosHospedagem, montarCSP, origensDoBuild } from './config/seguranca';
import { entraNoPrecache, montarServiceWorker, nomeDoCache } from './config/offline';

/**
 * CSP estrita (D18, T9). Só na versão construída: o servidor de desenvolvimento do Vite
 * injeta estilos em linha. O E2E roda sobre a versão construída e verifica violações.
 * A versão construída também leva o `_headers` da hospedagem (Cloudflare Workers, T18).
 */
function csp(contas: boolean): Plugin {
  const CSP = montarCSP(origensDoBuild(contas));
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
      this.emitFile({ type: 'asset', fileName: '_headers', source: cabecalhosHospedagem(CSP) });
    },
  };
}

/**
 * Tela de carregamento (D-D10, Apêndice F do contrato do Zé): o Zé do index.html aparece antes de o pacote chegar.
 * O CSS principal bloqueia a primeira pintura e é o último a chegar; posto logo depois do fragmento, a pintura não o
 * espera (o #raiz, que vem depois, continua esperando por ele). Medido no 3G: primeira pintura de 1,3 s para 0,6 s.
 */
function carregamento(): Plugin {
  return {
    name: 'arretado-carregamento',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const ligacao =
          /\s*<link rel="stylesheet" crossorigin href="(\.\/assets\/index-[^"]+\.css)">/.exec(html);
        if (!ligacao)
          throw new Error('arretado-carregamento: link do CSS principal não achado no index.html');
        return html
          .replace(ligacao[0], '')
          .replace(
            '<div id="raiz"></div>',
            `<link rel="stylesheet" crossorigin href="${ligacao[1]}">\n    <div id="raiz"></div>`,
          );
      },
    },
  };
}

/**
 * Abrir sem rede (AP-00, T31): publica `sw.js` com a lista do que guardar no aparelho. Roda depois dos
 * outros plugins (`enforce: 'post'`) para ver todos os arquivos do build; os de `public/` (ícones,
 * manifesto, acervo) não passam pelo bundle, então entram pela lista fixa abaixo.
 */
function offline(): Plugin {
  const slugsDoCatalogo: string[] = (
    JSON.parse(readFileSync('corpus/catalogo/index.json', 'utf8')) as {
      carreiras: { slug: string }[];
    }
  ).carreiras.map((c) => c.slug);
  const DE_PUBLIC = [
    'manifest.webmanifest',
    'favicon.ico',
    'icone.svg',
    'icone-192.png',
    'icone-512.png',
    'icone-maskable-512.png',
    'apple-touch-icon.png',
    'carregamento.css',
  ];
  return {
    name: 'arretado-offline',
    apply: 'build',
    enforce: 'post',
    generateBundle(_opcoes, saida) {
      const doBundle = Object.keys(saida).filter((f) => entraNoPrecache(f, slugsDoCatalogo));
      const precache = [...DE_PUBLIC, ...doBundle];
      // A marca muda com qualquer arquivo do build: nome novo de cache a cada publicação.
      const marca = createHash('sha256')
        .update(precache.sort().join('\n'))
        .digest('hex')
        .slice(0, 12);
      const fonte = readFileSync('src/offline/service-worker.js', 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: montarServiceWorker(fonte, {
          cache: nomeDoCache(pacote.version, marca),
          precache,
        }),
      });
    },
  };
}

// `VITE_CONTA=1` no ambiente do build liga a F4-A (padrão desligado; mesma chave que o app lê).
const contas = process.env.VITE_CONTA === '1';

export default defineConfig({
  plugins: [react(), csp(contas), carregamento(), offline()],
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
    // Os testes de desempenho medem tempo: com todos os núcleos ocupados estouram o orçamento sem haver falha.
    maxWorkers: 3,
    projects: [
      {
        extends: true,
        test: {
          name: 'unidade',
          // Com a máquina ocupada (Orca, vários agentes) os 5 s padrão estouram sem haver falha real.
          testTimeout: 30_000,
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
