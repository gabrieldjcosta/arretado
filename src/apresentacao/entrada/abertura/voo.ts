// A viagem da luz (contrato do Zé, §9): o ponto do nome sai do braço do cacto e pousa no ponto de luz
// do cabeçalho, num arco curto (0,45 s a 0,5 s). Aqui só a conta e o relógio de quadros; a Abertura mede
// os dois pontos na tela.
import { criarCurva } from '../../movimento';

export interface Ponto {
  x: number;
  y: number;
}

export interface Viagem {
  de: Ponto;
  para: Ponto;
  /** O raio da luz na saída e na chegada: acompanha o tamanho do nome e o da marca do cabeçalho. */
  raioDe: number;
  raioPara: number;
}

/** A curva da viagem do kit da marca: arranca devagar, corre no meio e assenta no ponto. */
export const curvaDaViagem = criarCurva(0.45, 0, 0.2, 1);

/** O ponto de controle do arco: ao lado do meio do caminho, para a luz curvar em vez de ir reta. */
export function pontoDeControle(de: Ponto, para: Ponto): Ponto {
  const dx = para.x - de.x;
  const dy = para.y - de.y;
  return { x: (de.x + para.x) / 2 - dy * 0.25, y: (de.y + para.y) / 2 + dx * 0.25 };
}

/** Onde a luz está e o quanto ela mede em `progresso` (0 a 1, já na curva da viagem): uma Bézier quadrática. */
export function luzNaViagem(viagem: Viagem, progresso: number): Ponto & { raio: number } {
  const { de, para } = viagem;
  const meio = pontoDeControle(de, para);
  const a = (1 - progresso) * (1 - progresso);
  const b = 2 * (1 - progresso) * progresso;
  const c = progresso * progresso;
  return {
    x: a * de.x + b * meio.x + c * para.x,
    y: a * de.y + b * meio.y + c * para.y,
    raio: viagem.raioDe + (viagem.raioPara - viagem.raioDe) * progresso,
  };
}

/**
 * Chama `quadro` a cada quadro, de 0 a 1 em `duracaoMs`, já na `curva`. Resolve ao fim, ou na hora
 * em que o `sinal` aborta (quem chama confere `sinal.aborted`). O último quadro é sempre o 1.
 */
export function andar(
  duracaoMs: number,
  curva: (progresso: number) => number,
  quadro: (valor: number) => void,
  sinal: AbortSignal,
): Promise<void> {
  return new Promise((resolver) => {
    if (sinal.aborted) {
      resolver();
      return;
    }
    let inicio: number | null = null;
    let pedido = 0;
    const acabar = () => {
      cancelAnimationFrame(pedido);
      sinal.removeEventListener('abort', acabar);
      resolver();
    };
    const passo = (agora: number) => {
      inicio ??= agora;
      const progresso = Math.min(1, (agora - inicio) / duracaoMs);
      quadro(curva(progresso));
      if (progresso < 1) pedido = requestAnimationFrame(passo);
      else acabar();
    };
    sinal.addEventListener('abort', acabar, { once: true });
    pedido = requestAnimationFrame(passo);
  });
}
