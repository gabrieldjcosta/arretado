import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';

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
