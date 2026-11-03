import { dataCivil } from '../../../core/datas';
import { movimentoAgora } from '../../movimento';
import { gravarJson, lerJson } from '../../plano/armazenamento';

/**
 * Quanto do nome se escreve no cabeçalho numa abertura: o nome inteiro (2,64 s), só a virada em cacto
 * com o nome já escrito (1,2 s) ou o lockup parado.
 */
export type Escrita = 'completa' | 'curta' | 'parada';

/**
 * A frequência da escrita do nome no cabeçalho (D-D9, suposição 2), para quando a tela cheia não abre
 * (movimento reduzido, "só estudo", Sessão aberta): o cabeçalho escreve como sempre escreveu, uma vez por
 * Dia. Uma constante só, da abertura mais rara à mais comum: trocar uma palavra aqui muda o produto.
 */
export const FREQUENCIA: Record<'primeiraVez' | 'primeiraDoDia' | 'demais', Escrita> = {
  primeiraVez: 'completa',
  primeiraDoDia: 'curta',
  demais: 'parada',
};

/**
 * Quanto do nome se escreve na tela cheia (D-D14, contrato do Zé v10h, §9): sempre o mesmo desenho, em
 * três tempos. `completa` é a primeira vez no aparelho (com "Pular" e, se a Chegada vem, o voo ao Zé),
 * `doDia` a primeira abertura de cada Dia e `depressa` as demais.
 */
export type EscritaNaTela = 'completa' | 'doDia' | 'depressa';

/**
 * A frequência da escrita na tela cheia (decisão do Gabriel de 03/11/2026): toda abertura do aplicativo
 * escreve o nome. A escolha de tempo é só `NOME_NA_TELA_MS`.
 */
export const FREQUENCIA_NA_TELA: Record<'primeiraVez' | 'primeiraDoDia' | 'demais', EscritaNaTela> =
  {
    primeiraVez: 'completa',
    primeiraDoDia: 'doDia',
    demais: 'depressa',
  };

/** O tempo que o CSS gerado do kit leva para escrever o nome inteiro e parar a luz no braço do cacto. */
export const NOME_INTEIRO_MS = 2640;

/**
 * Em quantos milissegundos o nome se escreve em cada tempo da tela cheia (contrato do Zé v10h, §9: 2,4 s
 * e 1,6 s são de partida, o Gabriel confirma depois de uma semana de uso). É o botão para quem achar
 * longo (menos) ou curto (mais): o CSS do kit escala toda a linha do tempo por `--k`.
 */
export const NOME_NA_TELA_MS: Record<EscritaNaTela, number> = {
  completa: NOME_INTEIRO_MS,
  doDia: 2400,
  depressa: 1600,
};

/** A escala da linha do tempo do kit (`--k`) de cada tempo: 1 é o nome inteiro em 2,64 s. */
export const escalaDaEscrita = (escrita: EscritaNaTela): number =>
  NOME_NA_TELA_MS[escrita] / NOME_INTEIRO_MS;

/** Quantas aberturas seguidas a pessoa pode pular antes de a tela cheia se calar até o Dia seguinte. */
export const PULOS_PARA_CALAR = 3;

// Só o Dia da última escrita e quantas aberturas seguidas foram puladas nele, no aparelho: sem esquema, sem
// rede, sem dado de estudo.
const CHAVE = 'arretado:escrita-do-nome:v1';

interface Guardado {
  dia: string | null;
  puladas: number;
}

function lerGuardado(): Guardado {
  const bruto = lerJson(CHAVE);
  if (typeof bruto !== 'object' || bruto === null) return { dia: null, puladas: 0 };
  const { dia, puladas } = bruto as { dia?: unknown; puladas?: unknown };
  return {
    dia: typeof dia === 'string' ? dia : null,
    puladas: typeof puladas === 'number' && Number.isInteger(puladas) && puladas > 0 ? puladas : 0,
  };
}

/**
 * Como o nome se escreve no cabeçalho nesta abertura. Movimento reduzido do sistema: sempre parado (e a
 * primeira vez fica guardada para quando a pessoa deixar de reduzir). Só lê; quem escreve de fato grava o
 * Dia com `lembrarDaEscrita`. O Dia é a data civil do app (T14), a mesma do Hoje. Um Dia guardado igual
 * ou posterior ao de hoje vale como já escrito hoje, como na Entrada do Dia: o relógio andou para trás, ou
 * estava adiantado quando o nome foi escrito, e então o cabeçalho fica calado até a data passar (é
 * decoração, inofensivo).
 */
export function escritaDaAbertura(agora: Date): Escrita {
  if (movimentoAgora() === 'reduzido') return 'parada';
  const { dia } = lerGuardado();
  if (dia === null) return FREQUENCIA.primeiraVez;
  return dia >= dataCivil(agora) ? FREQUENCIA.demais : FREQUENCIA.primeiraDoDia;
}

/**
 * Como o nome se escreve na tela cheia nesta abertura (`FREQUENCIA_NA_TELA`): toda abertura escreve. Fica
 * parada com movimento reduzido do sistema (a primeira vez fica guardada para depois), com um Dia guardado
 * no futuro (o aparelho em que o relógio andou para trás fica calado até a data passar, e é por isso que
 * a semente do E2E e dos testes usa um Dia no futuro) e depois de `PULOS_PARA_CALAR` aberturas seguidas
 * puladas no mesmo Dia: o cansaço dita o corte, não o relógio. Só lê.
 */
export function escritaNaTela(agora: Date): EscritaNaTela | 'parada' {
  if (movimentoAgora() === 'reduzido') return 'parada';
  const { dia, puladas } = lerGuardado();
  if (dia === null) return FREQUENCIA_NA_TELA.primeiraVez;
  const hoje = dataCivil(agora);
  if (dia > hoje) return 'parada';
  if (dia < hoje) return FREQUENCIA_NA_TELA.primeiraDoDia;
  return puladas >= PULOS_PARA_CALAR ? 'parada' : FREQUENCIA_NA_TELA.demais;
}

/**
 * Guarda que o nome foi escrito hoje, sem perder a conta das aberturas puladas hoje. Sem armazenamento,
 * segue sem guardar (`gravarJson` engole).
 */
export function lembrarDaEscrita(agora: Date): void {
  const hoje = dataCivil(agora);
  const { dia, puladas } = lerGuardado();
  gravarJson(CHAVE, dia === hoje && puladas > 0 ? { dia: hoje, puladas } : { dia: hoje });
}

/** A pessoa pulou esta abertura: mais um pulo seguido hoje (o terceiro cala a tela cheia até amanhã). */
export function registrarPulo(agora: Date): void {
  const hoje = dataCivil(agora);
  const { dia, puladas } = lerGuardado();
  gravarJson(CHAVE, { dia: hoje, puladas: (dia === hoje ? puladas : 0) + 1 });
}

/** A abertura foi até o fim: a conta de pulos seguidos volta a zero. */
export function registrarAberturaVista(agora: Date): void {
  gravarJson(CHAVE, { dia: dataCivil(agora) });
}

/**
 * A Abertura (a camada de tela cheia) toma a escrita desta abertura do aplicativo: lê o que a
 * frequência na tela pede e guarda o Dia, para que o nome se escreva uma vez, ou na tela cheia ou no
 * cabeçalho, nunca nos dois (o `Marca` do cabeçalho nasce parado quando ela toma). Devolve o que ela vai
 * escrever; `parada` não toma nada e não guarda nada.
 */
export function tomarEscrita(agora: Date): EscritaNaTela | 'parada' {
  const escrita = escritaNaTela(agora);
  if (escrita !== 'parada') lembrarDaEscrita(agora);
  return escrita;
}
