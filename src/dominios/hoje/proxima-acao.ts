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

export const COMECOS: readonly [ComecoSugerido, ComecoSugerido, ComecoSugerido] = [
  { id: 'adicionar_material', rotulo: 'Adicionar uma lei para ler', para: '/biblioteca/importar' },
  { id: 'escolher_materia', rotulo: 'Escolher uma matéria', para: '/plano/onboarding' },
  { id: 'sessao_curta', rotulo: 'Começar uma sessão curta', para: '/sessao/iniciar' },
];

/** O que o Hoje sabe do estudo, já contado e resumido pela camada de tela. */
export interface EntradaDaProximaAcao {
  cartoesVencidos: number;
  frasesVencidas: number;
  /** A norma lida por último. `onde` ("Art. 41") e `minutos` só existem com posição guardada. */
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
    alvo: { tipo: 'revisao', rotulo: e.cartoesVencidos > 0 ? 'Revisar cartões' : 'Revisar frases' },
    razao: partes.join(' e '),
    estimativaMin: Math.max(
      1,
      Math.ceil((Math.min(total, LIMITE_DA_RODADA) * SEGUNDOS_POR_ITEM) / 60),
    ),
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
        ? `Você estava lendo a ${l.tituloCurto}`
        : `Você parou no ${l.onde} da ${l.tituloCurto}`,
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
    ['leitura_salva', leituraSalva],
  ];
  for (const [tipo, montar] of ordem) {
    if (dispensados.has(tipo)) continue;
    const acao = montar(entrada);
    if (acao) return { tipo: 'acao', acao };
  }
  return { tipo: 'vazio', comecos: COMECOS };
}
