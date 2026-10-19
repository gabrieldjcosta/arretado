import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { configure } from '@testing-library/react';
import { instalarMatchMedia, restaurarMovimento } from './movimento';

// O jsdom não implementa crypto.subtle; os testes usam o WebCrypto do Node (mesma API do navegador).
const atual = globalThis.crypto as { subtle?: unknown } | undefined;
if (!atual?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

// O jsdom não implementa rolagem nem <dialog> modal; no navegador real são nativos.
const prototipo = (globalThis as unknown as { Element?: { prototype: Record<string, unknown> } })
  .Element?.prototype;
if (prototipo && typeof prototipo.scrollIntoView !== 'function') {
  prototipo.scrollIntoView = () => undefined;
}

// O jsdom não implementa a rolagem da janela (o leitor abre no começo): sem isto, avisa "Not implemented".
if (typeof window !== 'undefined') window.scrollTo = () => undefined;

// O jsdom não implementa matchMedia: o padrão dos testes é o movimento reduzido (nada anda).
instalarMatchMedia();
afterEach(restaurarMovimento);

// Com a máquina ocupada, o 1 s padrão de findBy/waitFor estoura sem haver falha; só atrasa quando falha de fato.
configure({ asyncUtilTimeout: 10_000 });
