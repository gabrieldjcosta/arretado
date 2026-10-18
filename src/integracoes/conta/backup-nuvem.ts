// Cópia cifrada manual na nuvem (F4-A, A6; T28; plano f4a-contas.md §7, camada 2, e §5, item 7).
// O pacote `.arretado` sai cifrado deste aparelho (AES-256-GCM, chave PBKDF2 da frase, T8); o
// servidor guarda só bytes opacos e nunca recebe a frase. Restaurar: baixar, abrir com a frase,
// prévia, snapshot local, aplicar. Nada aqui é automático nem roda sem a pessoa pedir.
import {
  aplicar,
  exportarPacote,
  importarParaEspaco,
  lerPacote,
  planejar,
  type PacoteLido,
  type Previa,
  type ResultadoImportacao,
} from '../../core/pacote';
import { sha256 } from '../../core/pacote/bytes';
import type { Repositorio } from '../../core/persistencia';
import type { CopiaNaNuvem, ServicoDeConta } from './interface';

/** Quantas cópias ficam na nuvem; a mais antiga sai só depois do envio da nova confirmado. */
export const MANTER_NA_NUVEM = 3;

type Copias = Pick<ServicoDeConta, 'listarCopias' | 'enviarCopia' | 'baixarCopia' | 'apagarCopia'>;

/** `AAAA-MM-DDTHH-MM-SS-<hash8>.arretado`, em UTC: a ordem do nome é a ordem do tempo. */
export function nomeDaCopia(agora: Date, hash: string): string {
  const instante = agora.toISOString().slice(0, 19).replace(/:/g, '-');
  return `${instante}-${hash.slice(0, 8)}.arretado`;
}

/** Instante ISO de uma cópia, lido do nome (o servidor não guarda outro metadado). */
export function instanteDaCopia(nome: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-[0-9a-f]{8}\.arretado$/.exec(nome);
  return m ? `${m[1] ?? ''}T${m[2] ?? ''}:${m[3] ?? ''}:${m[4] ?? ''}.000Z` : null;
}

/** Cópias da conta, da mais nova para a mais antiga (só as com nome do formato A6). */
export async function listarCopiasNaNuvem(servico: Copias): Promise<CopiaNaNuvem[]> {
  const copias = await servico.listarCopias();
  return copias
    .filter((c) => instanteDaCopia(c.nome) !== null)
    .sort((a, b) => (a.nome < b.nome ? 1 : a.nome > b.nome ? -1 : 0));
}

export interface CopiaEnviada {
  nome: string;
  /** Cópias antigas que saíram da nuvem (retenção de 3). */
  apagadas: string[];
}

/**
 * Cifra o pacote integral neste aparelho e o envia. Só com o envio confirmado apaga as que
 * passam de `MANTER_NA_NUVEM`; envio interrompido não toca nas anteriores.
 */
export async function guardarCopiaNaNuvem(
  repo: Repositorio,
  servico: Copias,
  frase: string,
  opcoes: { iteracoes?: number } = {},
): Promise<CopiaEnviada> {
  if (frase.length === 0) throw new Error('Frase vazia.');
  const { bytes } = await exportarPacote(repo, {
    escopo: { tipo: 'integral' },
    incluirAnexos: true,
    senha: frase,
    ...(opcoes.iteracoes !== undefined ? { iteracoes: opcoes.iteracoes } : {}),
  });
  const nome = nomeDaCopia(repo.ctx.agora(), await sha256(bytes));
  await servico.enviarCopia(nome, bytes);

  const excedentes = (await listarCopiasNaNuvem(servico))
    .filter((c) => c.nome !== nome)
    .slice(MANTER_NA_NUVEM - 1)
    .map((c) => c.nome);
  const apagadas: string[] = [];
  for (const antiga of excedentes) {
    try {
      await servico.apagarCopia(antiga);
      apagadas.push(antiga);
    } catch {
      // A cópia nova já está lá; a antiga sai no próximo envio.
    }
  }
  return { nome, apagadas };
}

/** Baixa e abre com a frase. Frase errada recusa (`PacoteRecusado`) sem tocar em nada local. */
export async function abrirCopiaDaNuvem(
  servico: Copias,
  nome: string,
  frase: string,
): Promise<PacoteLido> {
  return lerPacote(await servico.baixarCopia(nome), { senha: frase });
}

/** Escolha "usar a cópia da nuvem": prévia da substituição integral (modo 6), sem escrever. */
export function preverUsoDaCopia(repo: Repositorio, pacote: PacoteLido): Promise<Previa> {
  return planejar(repo, pacote, { modo: 6, exigirIntegral: true });
}

/** Aplica a prévia mostrada; o snapshot do local vem antes (desfazível em "Importações"). */
export function usarCopiaDaNuvem(
  repo: Repositorio,
  pacote: PacoteLido,
  previa: Previa,
  resolucoes: ReadonlyMap<string, 'local' | 'pacote'> = new Map(),
): Promise<ResultadoImportacao> {
  return aplicar(repo, pacote, previa, resolucoes, {
    snapshot: 'importacao',
    descricao: 'Cópia da nuvem',
  });
}

/** Escolha "importar para espaço separado": o local fica intacto; mesclar depois é o modo 7. */
export function separarCopiaDaNuvem(repo: Repositorio, pacote: PacoteLido, nome: string) {
  return importarParaEspaco(repo, pacote, nome);
}
