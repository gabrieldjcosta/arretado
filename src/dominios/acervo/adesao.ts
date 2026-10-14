// Adesão ao acervo (spec §4): baixa o item, confere esquema e hash do índice, converte para o
// formato local e grava numa transação. Idempotente (adicionar de novo não duplica); a falha de
// um item não afeta os demais, e o lote é retomável (o que já entrou é pulado).
import type { Dados } from '../../core/persistencia';
import type { Repositorio } from '../../core/persistencia';
import type { EntradaDoIndice, ItemDoAcervo } from './esquemas';
import type { FonteDoAcervo } from './fonte';
import { hashDoItem } from './hash';
import { definirVinculos, disciplinasSugeridas } from './vinculos';

export type MotivoAdesaoRecusada = 'hash' | 'versao' | 'identidade' | 'arvore';

const MENSAGEM: Record<MotivoAdesaoRecusada, string> = {
  hash: 'O conteúdo baixado não confere com o índice do acervo.',
  versao: 'A versão baixada não é a do índice do acervo.',
  identidade: 'O item baixado não é o pedido.',
  arvore: 'A árvore do item está fora de ordem ou com endereço repetido.',
};

export class AdesaoRecusada extends Error {
  constructor(
    readonly itemId: string,
    readonly motivo: MotivoAdesaoRecusada,
  ) {
    super(MENSAGEM[motivo]);
    this.name = 'AdesaoRecusada';
  }
}

export type ResultadoDaAdesao =
  | { estado: 'adicionada'; normaId: string; versaoId: string }
  | { estado: 'ja_adicionada'; normaId: string; versaoAderida: number };

/** Nome comparável: sem acento, caixa nem espaço sobrando. */
export const nomeComparavel = (nome: string): string =>
  nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Pai antes do filho e endereço único: o que o leitor e o remapeamento supõem. */
function conferirArvore(item: ItemDoAcervo): void {
  const vistos = new Set<string>();
  for (const no of item.nos) {
    if (no.pai !== undefined && !vistos.has(no.pai)) throw new AdesaoRecusada(item.id, 'arvore');
    if (vistos.has(no.endereco)) throw new AdesaoRecusada(item.id, 'arvore');
    vistos.add(no.endereco);
  }
}

async function normaJaAdicionada(repo: Repositorio, acervoId: string) {
  const normas = await repo.colecao('normas').todosDoUsuario();
  return normas.find((n) => n.origemAcervo?.id === acervoId);
}

/** Baixa e confere o item (fora de transação: pode demorar). */
export async function baixarConferido(
  fonte: FonteDoAcervo,
  entrada: EntradaDoIndice,
): Promise<ItemDoAcervo> {
  const item = await fonte.obter(entrada.id);
  if (item.id !== entrada.id) throw new AdesaoRecusada(entrada.id, 'identidade');
  if (item.versao !== entrada.versao) throw new AdesaoRecusada(entrada.id, 'versao');
  if ((await hashDoItem(item)) !== entrada.hash) throw new AdesaoRecusada(entrada.id, 'hash');
  conferirArvore(item);
  return item;
}

export interface OpcoesDaAdesao {
  /** Disciplinas escolhidas (nomes; "Outros" = nenhuma); sem isso valem as sugeridas pelo índice. */
  disciplinas?: readonly string[];
}

/** Adiciona um item do acervo à biblioteca. */
export async function aderirAoItem(
  repo: Repositorio,
  fonte: FonteDoAcervo,
  entrada: EntradaDoIndice,
  opcoes: OpcoesDaAdesao = {},
): Promise<ResultadoDaAdesao> {
  const existente = await normaJaAdicionada(repo, entrada.id);
  if (existente?.origemAcervo) {
    return {
      estado: 'ja_adicionada',
      normaId: existente.id,
      versaoAderida: existente.origemAcervo.versao,
    };
  }
  const item = await baixarConferido(fonte, entrada);
  const resultado = await repo.transacao(async (): Promise<ResultadoDaAdesao> => {
    // Relido na transação: duas abas adicionando o mesmo item terminam com uma norma só.
    const outra = await normaJaAdicionada(repo, entrada.id);
    if (outra?.origemAcervo) {
      return {
        estado: 'ja_adicionada',
        normaId: outra.id,
        versaoAderida: outra.origemAcervo.versao,
      };
    }
    const normaId = repo.ctx.novoId();
    const versaoId = repo.ctx.novoId();
    const agora = repo.ctx.agora();
    const n = item.norma;
    const norma = await repo.colecao('normas').criar(
      {
        tituloCurto: n.tituloCurto,
        escopo: 'catalogo',
        ...(n.tituloOficial === undefined ? {} : { tituloOficial: n.tituloOficial }),
        ...(n.referencia === undefined ? {} : { referencia: n.referencia }),
        ...(n.tipo === undefined ? {} : { tipo: n.tipo }),
        ...(n.esfera === undefined ? {} : { esfera: n.esfera }),
        ...(n.especie === undefined ? {} : { especie: n.especie }),
        ...(n.epigrafe === undefined ? {} : { epigrafe: n.epigrafe }),
        ...(n.ementa === undefined ? {} : { ementa: n.ementa }),
        ...(n.preambulo === undefined ? {} : { preambulo: n.preambulo }),
        ...(n.urlOficial === undefined ? {} : { urlOficial: n.urlOficial }),
        ...(n.fonteConsultadaEm === undefined ? {} : { fonteConsultadaEm: n.fonteConsultadaEm }),
        versaoVigenteId: versaoId,
        origemAcervo: { id: item.id, versao: item.versao, hash: entrada.hash },
      },
      { id: normaId, origem: 'importacao' },
    );
    await repo.colecao('versoesNorma').criar(
      {
        normaId,
        status: 'vigente',
        capturadaEm: agora.toISOString(),
        origemEntrada: 'arquivo',
        hash: entrada.hash,
        fonte: 'Acervo do Arretado',
      },
      { id: versaoId, origem: 'importacao' },
    );
    const idPorEndereco = new Map<string, string>();
    const dispositivos: { id: string; dados: Dados<'dispositivos'> }[] = [];
    const textos: { dados: Dados<'textosDispositivo'> }[] = [];
    for (const [k, no] of item.nos.entries()) {
      const id = repo.ctx.novoId();
      idPorEndereco.set(no.endereco, id);
      const paiId = no.pai === undefined ? undefined : idPorEndereco.get(no.pai);
      dispositivos.push({
        id,
        dados: {
          normaId,
          endereco: no.endereco,
          categoria: no.categoria,
          tipo: no.tipo,
          ordem: k + 1,
          status: no.status,
          confianca: no.confianca,
          ...(paiId === undefined ? {} : { paiId }),
          ...(no.rotulo === undefined ? {} : { rotulo: no.rotulo }),
          ...(no.renumeradoDe === undefined ? {} : { renumeradoDe: no.renumeradoDe }),
        },
      });
      textos.push({
        dados: {
          versaoId,
          dispositivoId: id,
          normaId,
          trechos: no.trechos,
          ...(no.notasVigencia === undefined ? {} : { notasVigencia: no.notasVigencia }),
          ...(no.procedencia === undefined ? {} : { procedencia: no.procedencia }),
          ...(no.redacoesAnteriores === undefined
            ? {}
            : { redacoesAnteriores: no.redacoesAnteriores }),
        },
      });
    }
    await repo.colecao('dispositivos').criarLote(dispositivos, { origem: 'importacao' });
    await repo.colecao('textosDispositivo').criarLote(textos, { origem: 'importacao' });
    await definirVinculos(
      repo,
      normaId,
      opcoes.disciplinas ?? disciplinasSugeridas(entrada),
      entrada.vinculos,
      'importacao',
    );
    return { estado: 'adicionada', normaId: norma.id, versaoId };
  });
  if (resultado.estado === 'adicionada') {
    repo.eventos.emitir('versao.publicada', {
      normaId: resultado.normaId,
      versaoId: resultado.versaoId,
    });
  }
  return resultado;
}

export interface FalhaDeAdesao {
  id: string;
  motivo: string;
}

export interface ResultadoDoLote {
  adicionadas: string[];
  jaAdicionadas: string[];
  falhas: FalhaDeAdesao[];
  /** Ids não tentados porque o usuário parou. */
  restantes: string[];
}

export interface OpcoesDoLote {
  /** Chamado antes de cada item: `feitos` de `total`; `atual` é o item que vai começar. */
  aoProgresso?: (feitos: number, total: number, atual?: EntradaDoIndice) => void;
  /** Consultado antes de cada item; verdadeiro encerra o lote (retomável depois). */
  deveParar?: () => boolean;
  /** Disciplinas escolhidas por item (id do acervo → nomes); item ausente usa as sugeridas. */
  disciplinasPorItem?: ReadonlyMap<string, readonly string[]>;
}

/** Adiciona vários itens, um a um; o índice é lido uma vez. */
export async function aderirEmLote(
  repo: Repositorio,
  fonte: FonteDoAcervo,
  ids: readonly string[],
  opcoes: OpcoesDoLote = {},
): Promise<ResultadoDoLote> {
  const indice = await fonte.listar();
  const porId = new Map(indice.itens.map((i) => [i.id, i]));
  const saida: ResultadoDoLote = { adicionadas: [], jaAdicionadas: [], falhas: [], restantes: [] };
  for (const [k, id] of ids.entries()) {
    if (opcoes.deveParar?.()) {
      saida.restantes.push(...ids.slice(k));
      break;
    }
    const entrada = porId.get(id);
    opcoes.aoProgresso?.(k, ids.length, entrada);
    if (!entrada) {
      saida.falhas.push({ id, motivo: 'Item fora do índice do acervo.' });
      continue;
    }
    try {
      const escolha = opcoes.disciplinasPorItem?.get(id);
      const r = await aderirAoItem(repo, fonte, entrada, escolha ? { disciplinas: escolha } : {});
      (r.estado === 'adicionada' ? saida.adicionadas : saida.jaAdicionadas).push(id);
    } catch (excecao) {
      saida.falhas.push({
        id,
        motivo: excecao instanceof Error ? excecao.message : 'Falha ao adicionar.',
      });
    }
  }
  opcoes.aoProgresso?.(ids.length - saida.restantes.length, ids.length);
  return saida;
}
