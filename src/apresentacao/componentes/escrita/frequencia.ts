import { dataCivil } from '../../../core/datas';
import { movimentoAgora } from '../../movimento';
import { gravarJson, lerJson } from '../../plano/armazenamento';

/**
 * Quanto do nome se escreve numa abertura: o nome inteiro (2,64 s), só a virada com o nome já escrito
 * (1,2 s) ou o lockup parado.
 */
export type Escrita = 'completa' | 'curta' | 'parada';

/**
 * A frequência da escrita do nome (D-D9, suposição 2: a escolha é do Gabriel e segue aberta). Uma
 * constante só, da abertura mais rara à mais comum: trocar uma palavra aqui muda o produto.
 */
export const FREQUENCIA: Record<'primeiraVez' | 'primeiraDoDia' | 'demais', Escrita> = {
  primeiraVez: 'completa',
  primeiraDoDia: 'curta',
  demais: 'parada',
};

// Só o Dia da última escrita, no aparelho: sem esquema, sem rede, sem dado de estudo.
const CHAVE = 'arretado:escrita-do-nome:v1';

function diaDaUltimaEscrita(): string | null {
  const bruto = lerJson(CHAVE);
  const dia = typeof bruto === 'object' && bruto !== null ? (bruto as { dia?: unknown }).dia : null;
  return typeof dia === 'string' ? dia : null;
}

/**
 * Como o nome se escreve nesta abertura. Movimento reduzido do sistema: sempre parado (e a primeira
 * vez fica guardada para quando a pessoa deixar de reduzir). Só lê; quem escreve de fato grava o Dia
 * com `lembrarDaEscrita`. O Dia é a data civil do app (T14), a mesma do Hoje. Um Dia guardado igual ou
 * posterior ao de hoje vale como já escrito hoje, como na Entrada do Dia: o relógio andou para trás, ou
 * estava adiantado quando o nome foi escrito, e então a Abertura do Dia fica calada até a data passar
 * (é decoração, inofensivo). A semente do E2E usa um Dia no futuro por isso (`e2e/apoio.ts`).
 */
export function escritaDaAbertura(agora: Date): Escrita {
  if (movimentoAgora() === 'reduzido') return 'parada';
  const visto = diaDaUltimaEscrita();
  if (visto === null) return FREQUENCIA.primeiraVez;
  return visto >= dataCivil(agora) ? FREQUENCIA.demais : FREQUENCIA.primeiraDoDia;
}

/** Guarda que o nome foi escrito hoje. Sem armazenamento, segue sem guardar (`gravarJson` engole). */
export function lembrarDaEscrita(agora: Date): void {
  gravarJson(CHAVE, { dia: dataCivil(agora) });
}

/**
 * A Abertura (a camada de tela cheia) toma a escrita desta abertura do aplicativo: lê o que a
 * frequência pede e guarda o Dia, para que o nome se escreva uma vez, ou na tela cheia ou no cabeçalho,
 * nunca nos dois (o `Marca` do cabeçalho nasce parado quando ela toma). Devolve o que ela vai escrever;
 * `parada` não toma nada e não guarda nada.
 */
export function tomarEscrita(agora: Date): Escrita {
  const escrita = escritaDaAbertura(agora);
  if (escrita !== 'parada') lembrarDaEscrita(agora);
  return escrita;
}
