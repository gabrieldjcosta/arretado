import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';

// O jsdom não implementa crypto.subtle; os testes usam o WebCrypto do Node (mesma API do navegador).
const atual = globalThis.crypto as { subtle?: unknown } | undefined;
if (!atual?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
