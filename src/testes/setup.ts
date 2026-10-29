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

// O jsdom não implementa showModal(). Desde o 30.1.3 ele também nega foco a quem está dentro de um
// <dialog> fechado, e o autoFocus do React roda antes de o <dialog> abrir. Aqui o showModal() faz o que
// o navegador faz: abre e foca o primeiro controle (nos diálogos do app, o campo com autoFocus).
if (
  typeof HTMLDialogElement !== 'undefined' &&
  typeof HTMLDialogElement.prototype.showModal !== 'function'
) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
    this.querySelector<HTMLElement>(
      'input, textarea, select, button, a[href], [tabindex]',
    )?.focus();
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}

// O jsdom não implementa a rolagem da janela (o leitor abre no começo): sem isto, avisa "Not implemented".
if (typeof window !== 'undefined') window.scrollTo = () => undefined;

// O jsdom não implementa matchMedia: o padrão dos testes é o movimento reduzido (nada anda).
instalarMatchMedia();
afterEach(restaurarMovimento);

// A Chegada, a Entrada do Dia e a Abertura (a escrita do nome em tela cheia) abrem na primeira abertura do
// aparelho e na primeira de cada Dia; um <dialog> modal deixa o resto da tela inerte, e a Abertura engole o
// primeiro toque ou tecla. Por isso todo teste começa como um aparelho que já viu as três (as mesmas chaves de
// `entrada/regras.ts` e de `componentes/escrita/frequencia.ts`, conferidas nos testes de cada um); quem testa a
// abertura apaga as chaves. `localStorage.clear()`, que vários testes chamam, semeia de novo.
const ABERTURA_JA_VISTA: Record<string, string> = {
  'arretado:chegada:v1': '{"vista":true}',
  'arretado:entrada-do-dia:v1': '{"dia":"9999-12-31"}',
  'arretado:escrita-do-nome:v1': '{"dia":"9999-12-31"}',
};
function semearAberturaJaVista() {
  try {
    for (const [chave, valor] of Object.entries(ABERTURA_JA_VISTA)) {
      window.localStorage.setItem(chave, valor);
    }
  } catch {
    /* sem armazenamento: o teste que o quebra de propósito sabe o que faz */
  }
}
if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/unbound-method -- chamado logo abaixo, com `.call(this)`
  const limparDeVerdade = Storage.prototype.clear;
  Storage.prototype.clear = function (this: Storage) {
    limparDeVerdade.call(this);
    if (this === window.localStorage) semearAberturaJaVista();
  };
  beforeEach(semearAberturaJaVista);
}

// Com a máquina ocupada, o 1 s padrão de findBy/waitFor estoura sem haver falha; só atrasa quando falha de fato.
configure({ asyncUtilTimeout: 10_000 });
