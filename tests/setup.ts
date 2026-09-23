// IndexedDB em memória para testes de repositório, log e pacote (T11).
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// `globals` está desligado, então a limpeza automática da Testing Library não roda sozinha.
afterEach(cleanup);
