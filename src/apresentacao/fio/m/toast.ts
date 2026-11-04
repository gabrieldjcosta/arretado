// O aviso do quadro (o `#toast` do mockup): um texto curto que sobe, fica um pouco e desce, com "Desfazer"
// quando a ação pode voltar atrás. Um só por vez; o novo toma o lugar do anterior.
import { useSyncExternalStore } from 'react';
import type { CausaErro } from '../../../core/modelo';
import { COM_NAV, telaAtual } from './tela-atual';

export interface EstadoDoToast {
  /** Muda a cada aviso, para o React saber que é outro. */
  id: number;
  texto: string;
  desfazer: (() => void) | undefined;
  ligado: boolean;
  /** "Por que errei": as respostas de um toque, quando o aviso as oferece (ideia 7). */
  porque: ((causa: CausaErro) => void) | undefined;
  /** Sobe acima da nav (só o aviso com "Desfazer", nas telas que têm nav). */
  baixo: boolean;
}

/** Quanto o "errei porque" fica à vista: o de um aviso com ação, e mais um respiro. */
const PORQUE_FICA_MS = 7000;

let estado: EstadoDoToast = {
  id: 0,
  texto: '',
  desfazer: undefined,
  porque: undefined,
  ligado: false,
  baixo: false,
};
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
  mudar({
    id: estado.id + 1,
    texto,
    desfazer,
    porque: undefined,
    ligado: true,
    baixo: desfazer !== undefined && nav,
  });
  relogio = window.setTimeout(
    () => {
      mudar({ ...estado, ligado: false });
    },
    desfazer ? 3200 : 2300,
  );
}

/**
 * O aviso que oferece "errei porque..." depois de guardar uma Frase (ideia 7): três respostas de um toque, opcionais.
 * Fica mais que um aviso comum (dá tempo de ler e tocar) e some sozinho; não responder não custa nada.
 */
export function avisarComPorQue(texto: string, aoEscolher: (causa: CausaErro) => void): void {
  window.clearTimeout(relogio);
  mudar({
    id: estado.id + 1,
    texto,
    desfazer: undefined,
    porque: aoEscolher,
    ligado: true,
    baixo: false,
  });
  relogio = window.setTimeout(() => {
    mudar({ ...estado, ligado: false });
  }, PORQUE_FICA_MS);
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
