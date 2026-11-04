// O aviso do quadro (o `#toast` do mockup): um texto curto que sobe, fica um pouco e desce, com "Desfazer"
// quando a ação pode voltar atrás. Um só por vez; o novo toma o lugar do anterior.
import { useSyncExternalStore } from 'react';
import { COM_NAV, telaAtual } from './tela-atual';

export interface EstadoDoToast {
  /** Muda a cada aviso, para o React saber que é outro. */
  id: number;
  texto: string;
  desfazer: (() => void) | undefined;
  ligado: boolean;
  /** Sobe acima da nav (só o aviso com "Desfazer", nas telas que têm nav). */
  baixo: boolean;
}

let estado: EstadoDoToast = { id: 0, texto: '', desfazer: undefined, ligado: false, baixo: false };
let relogio: number | undefined;
const ouvintes = new Set<() => void>();

function mudar(proximo: EstadoDoToast) {
  estado = proximo;
  ouvintes.forEach((o) => {
    o();
  });
}

/** Mostra o aviso: 2,3 s, ou 3,2 s quando há "Desfazer" (o mockup: `toast(t, desfazer)`). */
export function avisar(texto: string, desfazer?: () => void): void {
  window.clearTimeout(relogio);
  const nav = COM_NAV.has(telaAtual() ?? '');
  mudar({ id: estado.id + 1, texto, desfazer, ligado: true, baixo: desfazer !== undefined && nav });
  relogio = window.setTimeout(
    () => {
      mudar({ ...estado, ligado: false });
    },
    desfazer ? 3200 : 2300,
  );
}

export function esconderAviso(): void {
  window.clearTimeout(relogio);
  if (estado.ligado) mudar({ ...estado, ligado: false });
}

const assinar = (avisar_: () => void) => {
  ouvintes.add(avisar_);
  return () => {
    ouvintes.delete(avisar_);
  };
};

export const useToast = (): EstadoDoToast =>
  useSyncExternalStore(
    assinar,
    () => estado,
    () => estado,
  );
