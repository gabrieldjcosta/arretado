// Registro do service worker e estado da atualização (AP-00, "Abrir sem rede"; T31).
// O service worker em si é `service-worker.js`, publicado como `sw.js` pelo build.

import { useSyncExternalStore } from 'react';

type Ouvinte = () => void;

interface FabricaDePoliticas {
  createPolicy(
    nome: string,
    regras: { createScriptURL: (url: string) => string },
  ): {
    createScriptURL(url: string): unknown;
  };
}

const ouvintes = new Set<Ouvinte>();
let registro: ServiceWorkerRegistration | null = null;
/** Há uma versão nova instalada, esperando todas as abas fecharem ou um toque em "Atualizar". */
let atualizacaoPronta = false;
/** Esta aba pediu a troca: só então o `controllerchange` recarrega. */
let pediuAtualizar = false;

function avisar() {
  for (const ouvinte of ouvintes) ouvinte();
}

function assinar(ouvinte: Ouvinte) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function marcarPronta() {
  if (atualizacaoPronta) return;
  atualizacaoPronta = true;
  avisar();
}

function vigiarInstalacao(reg: ServiceWorkerRegistration) {
  // Já havia uma esperando quando a página abriu (a pessoa fechou a aba antes de atualizar).
  if (reg.waiting && navigator.serviceWorker.controller) marcarPronta();
  reg.addEventListener('updatefound', () => {
    const nova = reg.installing;
    if (!nova) return;
    nova.addEventListener('statechange', () => {
      // Sem `controller`, é a primeira instalação neste aparelho: nada a avisar.
      if (nova.state === 'installed' && navigator.serviceWorker.controller) marcarPronta();
    });
  });
}

/**
 * A CSP exige Trusted Types para o endereço de um script (`require-trusted-types-for 'script'`); a
 * política `offline` só devolve o endereço fixo do service worker, e nada mais passa por ela.
 */
function enderecoDoServiceWorker(): string | URL {
  const fabrica = (window as unknown as { trustedTypes?: FabricaDePoliticas }).trustedTypes;
  if (!fabrica) return 'sw.js';
  try {
    const politica = fabrica.createPolicy('offline', { createScriptURL: (url) => url });
    return politica.createScriptURL('sw.js') as string;
  } catch {
    return 'sw.js';
  }
}

/** Confere se há versão nova; o navegador já faz isso ao abrir, e aqui também ao voltar à aba. */
function conferirAtualizacao() {
  if (document.visibilityState !== 'visible') return;
  void registro?.update().catch(() => undefined);
}

/**
 * Registra o service worker (`sw.js`, na pasta do app). Só no build publicado e onde há suporte;
 * qualquer falha é silenciosa: sem o service worker o app abre como sempre, pela rede.
 */
export async function registrarServiceWorker(): Promise<void> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    // `sw.js` relativo à página, como o `base: './'` do build; o escopo é a pasta do app.
    registro = await navigator.serviceWorker.register(enderecoDoServiceWorker(), {
      updateViaCache: 'none',
    });
    vigiarInstalacao(registro);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (pediuAtualizar) window.location.reload();
    });
    document.addEventListener('visibilitychange', conferirAtualizacao);
  } catch {
    // Sem rede na primeira abertura, navegador sem suporte ou bloqueado (E2E): o app segue pela rede.
  }
}

/** Há uma versão nova pronta neste aparelho? (reativo) */
export function useAtualizacaoPronta(): boolean {
  return useSyncExternalStore(
    assinar,
    () => atualizacaoPronta,
    () => false,
  );
}

/** A pessoa escolheu atualizar agora: a versão nova assume e esta aba recarrega. Nada local é apagado. */
export function aplicarAtualizacao(): void {
  const nova = registro?.waiting;
  if (!nova) {
    window.location.reload();
    return;
  }
  pediuAtualizar = true;
  nova.postMessage({ tipo: 'ativar' });
}

/** Só para testes: volta ao estado inicial. */
export function _reiniciarParaTestes(): void {
  registro = null;
  atualizacaoPronta = false;
  pediuAtualizar = false;
  ouvintes.clear();
}

/** Só para testes: liga o estado a um registro falso, sem `register`. */
export function _ligarParaTestes(reg: ServiceWorkerRegistration): void {
  registro = reg;
  vigiarInstalacao(reg);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (pediuAtualizar) window.location.reload();
  });
}
