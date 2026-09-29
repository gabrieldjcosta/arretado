// Leitura da norma publicada (F2, 9.4; Parte 2 §10.6, Leitor, "Desempenho"): a árvore inteira, sem
// os textos, ao abrir, e os textos por janela, só os do trecho visível mais a margem (o leitor
// virtualizado da 9.6 pede cada janela ao rolar). O `Dispositivo` é da norma (vale para todas as
// versões) e o `TextoDeDispositivo` é da versão: a leitura abre `Norma.versaoVigenteId` e lê cada
// texto por `[versaoId+dispositivoId]`, nunca por `normaId`, que misturaria versões.
import type { Dispositivo, Norma, TextoDeDispositivo, VersaoDeNorma } from '../../core/modelo';
import { LIMITE_MAXIMO_PAGINA, type Repositorio } from '../../core/persistencia';
import { dispositivosDaNorma } from './consultas';

export type MotivoNormaIndisponivel = 'inexistente' | 'sem_versao_vigente';

const MENSAGEM: Record<MotivoNormaIndisponivel, string> = {
  inexistente: 'Esta norma não existe mais.',
  sem_versao_vigente: 'Esta norma ainda não foi publicada. Revise o rascunho e publique para ler.',
};

export class NormaIndisponivel extends Error {
  constructor(
    readonly normaId: string,
    readonly motivo: MotivoNormaIndisponivel,
  ) {
    super(MENSAGEM[motivo]);
    this.name = 'NormaIndisponivel';
  }
}

export interface NoDaLeitura {
  dispositivo: Dispositivo;
  /** Profundidade na árvore: 0 no nó sem pai (preâmbulo, título, artigo fora de estrutura). */
  nivel: number;
}

export interface NormaAberta {
  norma: Norma;
  /** A versão vigente: a única que a leitura mostra. */
  versao: VersaoDeNorma;
  /** A árvore inteira, na ordem de leitura (`Dispositivo.ordem`), sem os textos. */
  nos: readonly NoDaLeitura[];
  /** Índice de cada dispositivo em `nos` (abrir no "lido até" e na posição guardada, 9.7). */
  indiceDe: ReadonlyMap<string, number>;
}

export interface ItemDaJanela extends NoDaLeitura {
  /** Índice em `NormaAberta.nos`. */
  indice: number;
  /**
   * O texto na versão aberta. Ausente só se o dispositivo não tem texto nela: não acontece hoje
   * (a 9.2 grava um texto por dispositivo, e só a primeira versão publica); a versão nova (F6)
   * decide como os dispositivos só dela ficam fora da árvore da vigente.
   */
  texto: TextoDeDispositivo | undefined;
}

/**
 * Abre a versão vigente da norma: a norma, a versão e a árvore, lida em páginas de 200 pelo índice
 * `[normaId+ordem]`. Norma só com rascunho (sem `versaoVigenteId`) não abre: o rascunho aparece na
 * faixa "rascunho pendente" e na revisão (etapa 10).
 */
export async function abrirNorma(repo: Repositorio, normaId: string): Promise<NormaAberta> {
  const norma = await repo.colecao('normas').obter(normaId);
  if (!norma) throw new NormaIndisponivel(normaId, 'inexistente');
  const versao =
    norma.versaoVigenteId === undefined
      ? undefined
      : await repo.colecao('versoesNorma').obter(norma.versaoVigenteId);
  if (versao?.status !== 'vigente' || versao.normaId !== norma.id) {
    throw new NormaIndisponivel(normaId, 'sem_versao_vigente');
  }
  const dispositivos = await dispositivosDaNorma(repo.colecao('dispositivos'), norma.id, false);
  const nos: NoDaLeitura[] = [];
  const indiceDe = new Map<string, number>();
  for (const dispositivo of dispositivos) {
    // Pré-ordem: o pai vem antes do filho. Pai ausente (excluído) conta como raiz.
    const pai = dispositivo.paiId === undefined ? undefined : indiceDe.get(dispositivo.paiId);
    const nivel = pai === undefined ? 0 : (nos[pai]?.nivel ?? 0) + 1;
    indiceDe.set(dispositivo.id, nos.length);
    nos.push({ dispositivo, nivel });
  }
  return { norma, versao, nos, indiceDe };
}

/**
 * Os nós de `inicio` a `inicio + quantidade - 1` com o texto de cada um na versão aberta. A
 * quantidade vai até `LIMITE_MAXIMO_PAGINA` (200); fora da árvore, a janela encolhe (ou fica vazia).
 */
export async function lerJanela(
  repo: Repositorio,
  aberta: NormaAberta,
  janela: { inicio: number; quantidade: number },
): Promise<ItemDaJanela[]> {
  const inicio = Math.max(0, Math.floor(janela.inicio));
  const quantidade = Math.min(Math.max(0, Math.floor(janela.quantidade)), LIMITE_MAXIMO_PAGINA);
  const nos = aberta.nos.slice(inicio, inicio + quantidade);
  const textos = await repo.colecao('textosDispositivo').obterPorChaves(
    '[versaoId+dispositivoId]',
    nos.map((no) => [aberta.versao.id, no.dispositivo.id]),
  );
  return nos.map((no, i) => ({ ...no, indice: inicio + i, texto: textos[i] }));
}
