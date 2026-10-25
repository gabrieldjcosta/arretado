// Próxima ação do Hoje (F3-A, pacote A1): uma só coisa para fazer agora. Ordem: revisão vencida →
// leitura salva ("Continuar leitura") → estado vazio com três começos. Domínio puro e sem leitura
// de dados (a camada de domínios não importa de outro módulo): `apresentacao/hoje/proxima-acao.ts`
// reúne as entradas do Recall e da Legislação e chama `decidirProximaAcao`.
import type { OrigemDaAcao } from '../../core/modelo';
import type { ComecoSugerido, ProximaAcao, ResultadoProximaAcao } from './contrato';

/** Segundos por cartão ou Frase na estimativa da revisão (mesmo palpite do Recall). */
const SEGUNDOS_POR_ITEM = 30;
/** Quantos itens entram numa rodada de revisão: a mesma cota da fila diária do Recall. */
const LIMITE_DA_RODADA = 40;

/** Rótulos do alvo `revisao`; a tela os usa para saber qual rodada abrir. */
export const ROTULO_REVISAR_CARTOES = 'Revisar cartões';
export const ROTULO_REVISAR_FRASES = 'Revisar frases';

export const COMECOS: readonly [ComecoSugerido, ComecoSugerido, ComecoSugerido] = [
  { id: 'escolher_concurso', rotulo: 'Escolher meu concurso', para: '/comecar' },
  { id: 'ler_norma', rotulo: 'Ler uma norma', para: '/biblioteca' },
  { id: 'registrar_erro', rotulo: 'Registrar um erro', para: '/recall/registrar' },
];

/** O que o Hoje sabe do estudo, já contado e resumido pela camada de tela. */
export interface EntradaDaProximaAcao {
  cartoesVencidos: number;
  frasesVencidas: number;
  /** A norma lida por último. `onde` ("Art. 41") e `minutos` só existem com posição guardada. */
  /** A primeira Tarefa de estudo da fila (o que a pessoa mesma colocou, ou aceitou como sugestão). */
  tarefa?: { id: string; titulo: string; estimativaMin?: number };
  /** O bloco atual do Ciclo ativo (a camada de tela calcula a posição). */
  ciclo?: {
    id: string;
    disciplina: string;
    blocoOrdem: number;
    total: number;
    volta: number;
    minutos: number;
  };
  leitura?: { normaId: string; tituloCurto: string; onde?: string; minutos?: number };
}

const plural = (n: number, um: string, varios: string) =>
  n === 1 ? `1 ${um}` : `${String(n)} ${varios}`;

function revisaoVencida(e: EntradaDaProximaAcao): ProximaAcao | undefined {
  const total = e.cartoesVencidos + e.frasesVencidas;
  if (total === 0) return undefined;
  const partes = [
    ...(e.cartoesVencidos > 0
      ? [plural(e.cartoesVencidos, 'cartão vencido', 'cartões vencidos')]
      : []),
    ...(e.frasesVencidas > 0
      ? [plural(e.frasesVencidas, 'frase para rever', 'frases para rever')]
      : []),
  ];
  return {
    tipo: 'revisao_vencida',
    // Sem cartão vencido, a rodada é de Frases.
    alvo: {
      tipo: 'revisao',
      rotulo: e.cartoesVencidos > 0 ? ROTULO_REVISAR_CARTOES : ROTULO_REVISAR_FRASES,
    },
    razao: partes.join(' e '),
    estimativaMin: Math.max(
      1,
      Math.ceil((Math.min(total, LIMITE_DA_RODADA) * SEGUNDOS_POR_ITEM) / 60),
    ),
  };
}

function blocoDoCiclo(e: EntradaDaProximaAcao): ProximaAcao | undefined {
  const c = e.ciclo;
  if (!c) return undefined;
  return {
    tipo: 'ciclo',
    alvo: { tipo: 'ciclo', id: c.id, rotulo: c.disciplina.slice(0, 200) },
    razao: `Bloco ${String(c.blocoOrdem + 1)} de ${String(c.total)} da volta ${String(c.volta)} do seu ciclo`,
    estimativaMin: c.minutos,
    blocoOrdem: c.blocoOrdem,
  };
}

function tarefaDaFila(e: EntradaDaProximaAcao): ProximaAcao | undefined {
  const t = e.tarefa;
  if (!t) return undefined;
  return {
    tipo: 'tarefa',
    alvo: { tipo: 'tarefa', id: t.id, rotulo: t.titulo.slice(0, 200) },
    razao: 'A próxima da sua fila de tarefas',
    ...(t.estimativaMin !== undefined ? { estimativaMin: t.estimativaMin } : {}),
  };
}

function leituraSalva(e: EntradaDaProximaAcao): ProximaAcao | undefined {
  const l = e.leitura;
  if (!l) return undefined;
  return {
    tipo: 'leitura_salva',
    alvo: { tipo: 'leitura', id: l.normaId, rotulo: l.tituloCurto },
    razao:
      l.onde === undefined
        ? `Continuar a leitura da ${l.tituloCurto}`
        : `Continuar a leitura no ${l.onde} da ${l.tituloCurto}`,
    ...(l.onde !== undefined && l.minutos !== undefined ? { estimativaMin: l.minutos } : {}),
  };
}

/** Escolhe a Próxima ação; `excluir` é o "Escolher outra coisa" (tipos dispensados agora). */
export function decidirProximaAcao(
  entrada: EntradaDaProximaAcao,
  excluir: readonly OrigemDaAcao['tipo'][] = [],
): ResultadoProximaAcao {
  const dispensados = new Set(excluir);
  const ordem: [OrigemDaAcao['tipo'], (e: EntradaDaProximaAcao) => ProximaAcao | undefined][] = [
    ['revisao_vencida', revisaoVencida],
    ['ciclo', blocoDoCiclo],
    ['tarefa', tarefaDaFila],
    ['leitura_salva', leituraSalva],
  ];
  for (const [tipo, montar] of ordem) {
    if (dispensados.has(tipo)) continue;
    const acao = montar(entrada);
    if (acao) return { tipo: 'acao', acao };
  }
  return { tipo: 'vazio', comecos: COMECOS };
}
