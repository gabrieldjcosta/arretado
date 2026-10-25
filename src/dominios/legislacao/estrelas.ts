// Estrela do leitor (F2, 11.2; Parte 1 §5.3 e D15; Parte 2 §10.6, Estrela): no dispositivo ou no nó
// estrutural (título, capítulo, seção…). Só a `direta` e a `excecao` são gravadas; a herança é
// calculada na leitura, pela gravada mais próxima no caminho até a raiz (`estrelaEfetiva`): estrelar
// a Seção I acende tudo dentro dela, desmarcar um artigo dela grava a exceção, estrelar de novo o
// artigo apaga a exceção. `herdada` fica reservado no modelo. A de `pacote` (incidência) é gravada
// por `aplicarPacote` e vale como estrela do próprio nó, sem herança.
//
// Invariante (decisão da 11.2): toda exceção tem o pai efetivamente estrelado. Desestrelar um nó
// apaga as exceções que ficaram sem estrela acima (as órfãs): senão, estrelar de novo o nó um dia
// deixaria apagado, sem aviso, um artigo que o usuário já nem lembra de ter desmarcado.
import type { Dispositivo, Estrela } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { todos } from './consultas';

/** O que a estrela precisa de cada nó da árvore. */
export type NoDaEstrela = Pick<Dispositivo, 'id' | 'normaId' | 'paiId' | 'tipo' | 'status'>;

/** A árvore da norma, por id (a ordem não importa: a herança sobe pelo `paiId`). */
export interface ArvoreDaEstrela {
  normaId: string;
  porId: ReadonlyMap<string, NoDaEstrela>;
}

export function arvoreDaEstrela(
  normaId: string,
  nos: Iterable<{ dispositivo: NoDaEstrela }>,
): ArvoreDaEstrela {
  const porId = new Map<string, NoDaEstrela>();
  for (const { dispositivo } of nos) porId.set(dispositivo.id, dispositivo);
  return { normaId, porId };
}

/**
 * Pode ter estrela: todo nó menos o revogado e o vetado (não se estuda; a herança passa por eles
 * sem os acender, e o filtro "só estrelados" da 11.3 não os mostra) e a rubrica (`nome`, que o
 * leitor desenha dentro da linha do pai).
 */
export function estrelavel(no: NoDaEstrela): boolean {
  return no.tipo !== 'nome' && no.status !== 'revogado' && no.status !== 'vetado';
}

export type OrigemDaEstrela = 'direta' | 'herdada' | 'pacote' | 'excecao';

export interface EstadoDaEstrela {
  estrelado: boolean;
  /** Ausente: sem estrela e sem exceção própria (também abaixo de uma exceção). */
  origem?: OrigemDaEstrela;
  /** Na `herdada`, o nó estrelado de onde vem; na `excecao`, o nó cuja estrela ela corta. */
  deId?: string;
}

const SEM_ESTRELA: EstadoDaEstrela = { estrelado: false };

/** As estrelas pessoais gravadas, por alvo (direta, pacote e exceção). */
export type EstrelasPorAlvo = ReadonlyMap<string, Estrela>;

export function porAlvo(estrelas: readonly Estrela[]): Map<string, Estrela> {
  const mapa = new Map<string, Estrela>();
  for (const e of estrelas) {
    if (e.origemTipo !== 'herdada') mapa.set(e.alvoId, e);
  }
  return mapa;
}

/** A gravada mais próxima acima do nó (só nos que podem ter estrela). */
function gravadaAcima(arvore: ArvoreDaEstrela, gravadas: EstrelasPorAlvo, paiId?: string) {
  let id = paiId;
  // O limite protege de um ciclo no `paiId` (dado corrompido): a árvore real tem menos de 10 níveis.
  for (let passos = 0; id !== undefined && passos < 64; passos++) {
    const no = arvore.porId.get(id);
    if (!no) return undefined;
    const gravada = estrelavel(no) ? gravadas.get(id) : undefined;
    // A de pacote é só do próprio nó: não herda nem corta a herança de quem está mais acima.
    if (gravada && gravada.origemTipo !== 'pacote') return gravada;
    id = no.paiId;
  }
  return undefined;
}

/**
 * O estado da estrela de um nó: a gravada nele mesmo (direta) ou a mais próxima acima (herdada,
 * se for direta; nada, se for exceção). A exceção do nó só vale com o pai estrelado.
 */
export function estrelaEfetiva(
  arvore: ArvoreDaEstrela,
  gravadas: EstrelasPorAlvo,
  id: string,
): EstadoDaEstrela {
  const no = arvore.porId.get(id);
  if (!no || !estrelavel(no)) return SEM_ESTRELA;
  const propria = gravadas.get(id);
  if (propria?.origemTipo === 'direta' || propria?.origemTipo === 'pacote') {
    return { estrelado: true, origem: propria.origemTipo };
  }
  const acima = gravadaAcima(arvore, gravadas, no.paiId);
  if (acima?.origemTipo !== 'direta') return SEM_ESTRELA;
  return propria?.origemTipo === 'excecao'
    ? { estrelado: false, origem: 'excecao', deId: acima.alvoId }
    : { estrelado: true, origem: 'herdada', deId: acima.alvoId };
}

/** O estado de todos os nós da árvore (para o leitor e para o filtro da 11.3). */
export function estrelasEfetivas(
  arvore: ArvoreDaEstrela,
  gravadas: EstrelasPorAlvo,
): Map<string, EstadoDaEstrela> {
  const estados = new Map<string, EstadoDaEstrela>();
  for (const id of arvore.porId.keys()) estados.set(id, estrelaEfetiva(arvore, gravadas, id));
  return estados;
}

export type MotivoEstrelaInvalida = 'inexistente' | 'nao_estrelavel';

const MENSAGEM: Record<MotivoEstrelaInvalida, string> = {
  inexistente: 'Este dispositivo não está nesta norma.',
  nao_estrelavel: 'Dispositivo revogado ou vetado não leva estrela.',
};

export class EstrelaInvalida extends Error {
  constructor(readonly motivo: MotivoEstrelaInvalida) {
    super(MENSAGEM[motivo]);
    this.name = 'EstrelaInvalida';
  }
}

/** As estrelas da norma (direta, pacote e exceção), sem as excluídas. */
export function estrelasDaNorma(repo: Repositorio, normaId: string): Promise<Estrela[]> {
  return todos(repo.colecao('estrelas'), {
    indice: 'normaId',
    de: normaId,
    ate: normaId,
    filtro: (e: Estrela) => e.origemTipo !== 'herdada',
  });
}

export interface EstrelaMudada {
  /** As estrelas pessoais da norma depois da mudança. */
  estrelas: Estrela[];
  /** O novo estado do alvo. */
  estado: EstadoDaEstrela;
}

function conferirAlvo(arvore: ArvoreDaEstrela, alvoId: string) {
  const no = arvore.porId.get(alvoId);
  if (!no || no.normaId !== arvore.normaId) throw new EstrelaInvalida('inexistente');
  if (!estrelavel(no)) throw new EstrelaInvalida('nao_estrelavel');
}

type Passo = (
  repo: Repositorio,
  arvore: ArvoreDaEstrela,
  gravadas: Map<string, Estrela>,
  alvoId: string,
) => Promise<void>;

/** Lê, muda e relê numa transação: duas abas não deixam o mesmo alvo com duas gravadas. */
async function mudar(
  repo: Repositorio,
  arvore: ArvoreDaEstrela,
  alvoId: string,
  passo: Passo,
): Promise<EstrelaMudada> {
  conferirAlvo(arvore, alvoId);
  return repo.transacao(async () => {
    const gravadas = porAlvo(await estrelasDaNorma(repo, arvore.normaId));
    await passo(repo, arvore, gravadas, alvoId);
    const estrelas = await estrelasDaNorma(repo, arvore.normaId);
    return { estrelas, estado: estrelaEfetiva(arvore, porAlvo(estrelas), alvoId) };
  });
}

async function apagar(repo: Repositorio, gravadas: Map<string, Estrela>, alvoId: string) {
  const gravada = gravadas.get(alvoId);
  if (!gravada) return;
  await repo.colecao('estrelas').excluir(gravada.id);
  gravadas.delete(alvoId);
}

async function gravar(
  repo: Repositorio,
  arvore: ArvoreDaEstrela,
  gravadas: Map<string, Estrela>,
  alvoId: string,
  origemTipo: 'direta' | 'excecao',
) {
  const criada = await repo
    .colecao('estrelas')
    .criar({ normaId: arvore.normaId, alvoId, origemTipo });
  gravadas.set(alvoId, criada);
}

const passoDeEstrelar: Passo = async (repo, arvore, gravadas, alvoId) => {
  if (gravadas.get(alvoId)?.origemTipo === 'excecao') await apagar(repo, gravadas, alvoId);
  if (!estrelaEfetiva(arvore, gravadas, alvoId).estrelado) {
    await gravar(repo, arvore, gravadas, alvoId, 'direta');
  }
};

const passoDeDesestrelar: Passo = async (repo, arvore, gravadas, alvoId) => {
  if (['direta', 'pacote'].includes(gravadas.get(alvoId)?.origemTipo ?? ''))
    await apagar(repo, gravadas, alvoId);
  if (estrelaEfetiva(arvore, gravadas, alvoId).estrelado) {
    await gravar(repo, arvore, gravadas, alvoId, 'excecao');
  }
  // Apagar uma órfã não muda o estado de ninguém (abaixo dela já estava sem estrela), então basta
  // uma passada sobre o estado de agora.
  const orfas = [...gravadas.values()].filter(
    (e) =>
      e.origemTipo === 'excecao' && estrelaEfetiva(arvore, gravadas, e.alvoId).origem !== 'excecao',
  );
  for (const orfa of orfas) await apagar(repo, gravadas, orfa.alvoId);
};

/**
 * Estrela o alvo: apaga a exceção dele, se houver (volta a herdar), e grava a direta se ele ainda
 * não ficou estrelado. No que já está estrelado (direta ou herdada), não muda nada.
 */
export function estrelar(
  repo: Repositorio,
  arvore: ArvoreDaEstrela,
  alvoId: string,
): Promise<EstrelaMudada> {
  return mudar(repo, arvore, alvoId, passoDeEstrelar);
}

/**
 * Tira a estrela do alvo: apaga a direta dele e, se ainda herda de um nó acima, grava a exceção.
 * Depois apaga as exceções que ficaram sem estrela acima (as órfãs, no que estava dentro do alvo).
 * As diretas de dentro ficam (desmarcar um nó não remove estrelas diretas).
 */
export function desestrelar(
  repo: Repositorio,
  arvore: ArvoreDaEstrela,
  alvoId: string,
): Promise<EstrelaMudada> {
  return mudar(repo, arvore, alvoId, passoDeDesestrelar);
}

/** O toque no controle: tira a estrela do que está estrelado (direta ou herdada), põe no resto. */
export function alternarEstrela(
  repo: Repositorio,
  arvore: ArvoreDaEstrela,
  alvoId: string,
): Promise<EstrelaMudada> {
  return mudar(repo, arvore, alvoId, (...args) =>
    estrelaEfetiva(arvore, args[2], alvoId).estrelado
      ? passoDeDesestrelar(...args)
      : passoDeEstrelar(...args),
  );
}
