// Serviço da Legislação (F2, 9.2; Parte 2 §10.6 e §13.1, item 8): do Bloco[] sanitizado ao
// rascunho gravado (Norma, VersaoDeNorma com status 'rascunho', um Dispositivo e um
// TextoDeDispositivo por nó e a fonte como Anexo), numa transação só; descartar e retomar o
// rascunho. O hash (da versão e do anexo, sobre os blocos sanitizados) é calculado antes da
// transação: WebCrypto aguardado dentro dela a fecha (`PrematureCommitError`).
import { dataCivil } from '../../core/datas';
import type { NomeColecao, Norma, RegistroDe, VersaoDeNorma } from '../../core/modelo';
import {
  AnexoAlterado,
  gravarAnexo,
  lerAnexo,
  LIMITE_MAXIMO_PAGINA,
  prepararAnexo,
  removerAnexos,
  type Colecao,
  type ConsultaPagina,
  type Pagina,
  type Repositorio,
} from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { estruturar } from './estruturador';
import type { Rascunho } from './rascunho';
import {
  dadosDaNorma,
  FonteIlegivel,
  formatoDaOrigem,
  lerFonte,
  metadadosDaNorma,
  NOME_FONTE,
  notaMaisRecenteDoModelo,
  notasDaNormaDoModelo,
  registrosDaArvore,
  serializarFonte,
  TIPO_FONTE,
  type OrigemImportacao,
} from './registros';

export interface EntradaRascunho {
  /** Saída do sanitizador (colar, URL, arquivo) ou de `textoParaBlocos` (texto puro). */
  blocos: readonly Bloco[];
  origemEntrada: OrigemImportacao;
  /** O único obrigatório na tela (9.5); ausente ou vazio, vem de `sugerirTituloCurto`. */
  tituloCurto?: string;
  urlOficial?: string;
}

export interface RascunhoDeNorma {
  norma: Norma;
  versao: VersaoDeNorma;
  /** A árvore e o relatório (anomalias, descartes, normalização) para o sumário da importação. */
  rascunho: Rascunho;
}

export type MotivoRascunhoIndisponivel =
  'inexistente' | 'publicada' | 'fonte_ilegivel' | 'norma_com_outras_versoes';

const MENSAGEM: Record<MotivoRascunhoIndisponivel, string> = {
  inexistente: 'Este rascunho não existe mais.',
  publicada: 'Esta versão já foi publicada; não é mais rascunho.',
  fonte_ilegivel:
    'A fonte guardada deste rascunho não pôde ser lida. Descarte o rascunho e importe a norma de novo.',
  norma_com_outras_versoes:
    'Esta norma tem outra versão; o rascunho de uma versão nova é tratado na atualização (F6).',
};

export class RascunhoIndisponivel extends Error {
  constructor(
    readonly versaoId: string,
    readonly motivo: MotivoRascunhoIndisponivel,
  ) {
    super(MENSAGEM[motivo]);
    this.name = 'RascunhoIndisponivel';
  }
}

/**
 * Estrutura os blocos e grava o rascunho de uma norma nova. Nada é gravado se qualquer registro
 * falhar na validação do modelo.
 */
export async function criarRascunho(
  repo: Repositorio,
  entrada: EntradaRascunho,
): Promise<RascunhoDeNorma> {
  const rascunho = estruturar(entrada.blocos, { formato: formatoDaOrigem(entrada.origemEntrada) });
  const fonte = await prepararAnexo(NOME_FONTE, TIPO_FONTE, serializarFonte(entrada.blocos));
  const agora = repo.ctx.agora();
  const normaId = repo.ctx.novoId();
  const versaoId = repo.ctx.novoId();
  const arvore = registrosDaArvore(rascunho.nos, { normaId, versaoId, novoId: repo.ctx.novoId });
  const notaVigenciaMaisRecente = notaMaisRecenteDoModelo(rascunho.notaVigenciaMaisRecente);
  const notasDaNorma = notasDaNormaDoModelo(rascunho.notasDaNorma);
  const dadosNorma = dadosDaNorma(rascunho.metadados, {
    ...(entrada.tituloCurto === undefined ? {} : { tituloCurto: entrada.tituloCurto }),
    ...(entrada.urlOficial === undefined ? {} : { urlOficial: entrada.urlOficial }),
    // Colar e URL leem a página oficial agora; arquivo e texto puro não dizem quando.
    ...(entrada.origemEntrada === 'html' || entrada.origemEntrada === 'url'
      ? { fonteConsultadaEm: dataCivil(agora) }
      : {}),
  });
  return repo.transacao(async () => {
    const anexo = await gravarAnexo(repo, fonte, { origem: 'importacao' });
    const norma = await repo
      .colecao('normas')
      .criar(dadosNorma, { id: normaId, origem: 'importacao' });
    const versao = await repo.colecao('versoesNorma').criar(
      {
        normaId,
        status: 'rascunho',
        capturadaEm: agora.toISOString(),
        origemEntrada: entrada.origemEntrada,
        hash: fonte.hash,
        versaoAdaptador: rascunho.versaoEstruturador,
        anexoFonteId: anexo.id,
        ...(notaVigenciaMaisRecente ? { notaVigenciaMaisRecente } : {}),
        ...(notasDaNorma ? { notasDaNorma } : {}),
      },
      { id: versaoId, origem: 'importacao' },
    );
    await repo.colecao('dispositivos').criarLote(arvore.dispositivos, { origem: 'importacao' });
    await repo.colecao('textosDispositivo').criarLote(arvore.textos, { origem: 'importacao' });
    return { norma, versao, rascunho };
  });
}

/** Rascunhos à espera de publicação (faixa da Biblioteca, 9.5), do mais recente ao mais antigo. */
export async function rascunhosPendentes(
  repo: Repositorio,
): Promise<{ norma: Norma; versao: VersaoDeNorma }[]> {
  const versoes = await todos(repo.colecao('versoesNorma'), {
    indice: 'usuarioId',
    de: repo.ctx.usuarioId,
    ate: repo.ctx.usuarioId,
    filtro: (v) => v.status === 'rascunho',
  });
  const saida: { norma: Norma; versao: VersaoDeNorma }[] = [];
  for (const versao of versoes) {
    const norma = await repo.colecao('normas').obter(versao.normaId);
    if (norma) saida.push({ norma, versao });
  }
  return saida.sort((a, b) =>
    a.versao.capturadaEm === b.versao.capturadaEm
      ? a.versao.id < b.versao.id
        ? 1
        : -1
      : a.versao.capturadaEm < b.versao.capturadaEm
        ? 1
        : -1,
  );
}

/**
 * Reabre um rascunho: o relatório sai de novo da fonte guardada (o estruturador é determinístico).
 * Se o estruturador mudou desde a gravação (app atualizado), a árvore é refeita pela fonte, com os
 * ids de cada endereço mantidos: até o editor (etapa 10), o rascunho não tem edição do usuário a
 * preservar; a 10.4 passa a preservar o que foi confirmado.
 */
export async function retomarRascunho(
  repo: Repositorio,
  versaoId: string,
): Promise<RascunhoDeNorma> {
  const { norma, versao } = await rascunhoGravado(repo, versaoId);
  const blocos = await fonteDaVersao(repo, versao);
  const rascunho = estruturar(blocos, { formato: formatoDaOrigem(versao.origemEntrada) });
  if (versao.versaoAdaptador === rascunho.versaoEstruturador) return { norma, versao, rascunho };
  return repo.transacao(async () => {
    // Relido dentro da transação: outra aba pode ter publicado ou descartado no meio.
    await rascunhoGravado(repo, versaoId);
    // Refazer apaga os dispositivos da norma inteira: nunca com outra versão (a vigente) ao lado.
    await exigirVersaoUnica(repo, norma.id, versao.id);
    const antiga = await arvoreGravada(repo, norma.id, versao.id);
    const porEndereco = new Map<string, string[]>();
    for (const d of antiga.dispositivos) {
      const ids = porEndereco.get(d.endereco);
      if (ids) ids.push(d.id);
      else porEndereco.set(d.endereco, [d.id]);
    }
    const arvore = registrosDaArvore(rascunho.nos, {
      normaId: norma.id,
      versaoId: versao.id,
      novoId: repo.ctx.novoId,
      anteriores: {
        dispositivos: porEndereco,
        textos: new Map(antiga.textos.map((t) => [t.dispositivoId, t.id])),
      },
    });
    await apagarArvore(repo, antiga);
    await repo.colecao('dispositivos').criarLote(arvore.dispositivos, { origem: 'importacao' });
    await repo.colecao('textosDispositivo').criarLote(arvore.textos, { origem: 'importacao' });
    const novaVersao = await repo.colecao('versoesNorma').atualizar(versao.id, {
      versaoAdaptador: rascunho.versaoEstruturador,
      notaVigenciaMaisRecente: notaMaisRecenteDoModelo(rascunho.notaVigenciaMaisRecente),
      notasDaNorma: notasDaNormaDoModelo(rascunho.notasDaNorma),
    });
    const novaNorma = await repo
      .colecao('normas')
      .atualizar(norma.id, metadadosDaNorma(rascunho.metadados));
    return { norma: novaNorma, versao: novaVersao, rascunho };
  });
}

/**
 * Apaga o rascunho de uma norma nova: norma, versão, dispositivos, textos e a fonte. Apagamento
 * físico, com registro no log: nada referencia um rascunho nunca publicado, e milhares de
 * registros excluídos só ocupariam o aparelho e o backup.
 */
export async function descartarRascunho(repo: Repositorio, versaoId: string): Promise<void> {
  await repo.transacao(async () => {
    const { norma, versao } = await rascunhoGravado(repo, versaoId);
    await exigirVersaoUnica(repo, norma.id, versao.id);
    await apagarArvore(repo, await arvoreGravada(repo, norma.id, versao.id));
    await repo.colecao('versoesNorma').removerFisico([versao.id]);
    await repo.colecao('normas').removerFisico([norma.id]);
    if (versao.anexoFonteId) await removerAnexos(repo, [versao.anexoFonteId]);
  });
}

async function rascunhoGravado(
  repo: Repositorio,
  versaoId: string,
): Promise<{ norma: Norma; versao: VersaoDeNorma }> {
  const versao = await repo.colecao('versoesNorma').obter(versaoId);
  if (!versao) throw new RascunhoIndisponivel(versaoId, 'inexistente');
  if (versao.status !== 'rascunho') throw new RascunhoIndisponivel(versaoId, 'publicada');
  const norma = await repo.colecao('normas').obter(versao.normaId);
  if (!norma) throw new RascunhoIndisponivel(versaoId, 'inexistente');
  return { norma, versao };
}

/** Os blocos guardados, conferidos pelo hash do anexo e pelo da versão. Fora de transação. */
async function fonteDaVersao(repo: Repositorio, versao: VersaoDeNorma): Promise<Bloco[]> {
  const ilegivel = () => new RascunhoIndisponivel(versao.id, 'fonte_ilegivel');
  if (!versao.anexoFonteId) throw ilegivel();
  try {
    const lido = await lerAnexo(repo, versao.anexoFonteId);
    if (lido?.anexo.hash !== versao.hash) throw ilegivel();
    return lerFonte(lido.bytes);
  } catch (excecao) {
    if (excecao instanceof AnexoAlterado || excecao instanceof FonteIlegivel) throw ilegivel();
    throw excecao;
  }
}

/** Descartar e refazer a árvore mexem na norma inteira: só quando o rascunho é a única versão. */
async function exigirVersaoUnica(repo: Repositorio, normaId: string, versaoId: string) {
  const versoes = await todos(repo.colecao('versoesNorma'), {
    indice: 'normaId',
    de: normaId,
    ate: normaId,
    incluirExcluidos: true,
  });
  if (versoes.some((v) => v.id !== versaoId)) {
    throw new RascunhoIndisponivel(versaoId, 'norma_com_outras_versoes');
  }
}

/** Dispositivos da norma (na ordem de leitura) e textos da versão, inclusive os excluídos. */
async function arvoreGravada(repo: Repositorio, normaId: string, versaoId: string) {
  const textos = await todos(repo.colecao('textosDispositivo'), {
    indice: 'versaoId',
    de: versaoId,
    ate: versaoId,
    incluirExcluidos: true,
  });
  const dispositivos = await todos(repo.colecao('dispositivos'), {
    indice: '[normaId+ordem]',
    de: [normaId, -Infinity],
    ate: [normaId, Infinity],
    incluirExcluidos: true,
  });
  return { dispositivos, textos };
}

async function apagarArvore(
  repo: Repositorio,
  arvore: Awaited<ReturnType<typeof arvoreGravada>>,
): Promise<void> {
  await repo.colecao('textosDispositivo').removerFisico(arvore.textos.map((t) => t.id));
  await repo.colecao('dispositivos').removerFisico(arvore.dispositivos.map((d) => d.id));
}

/** Todas as páginas de uma consulta (a listagem é sempre paginada: 200 por página). */
async function todos<N extends NomeColecao>(
  colecao: Colecao<N>,
  consulta: Omit<ConsultaPagina<N>, 'limite' | 'cursor'>,
): Promise<RegistroDe<N>[]> {
  const itens: RegistroDe<N>[] = [];
  let cursor: string | null = null;
  do {
    const pagina: Pagina<RegistroDe<N>> = await colecao.listarPagina({
      ...consulta,
      limite: LIMITE_MAXIMO_PAGINA,
      cursor,
    });
    for (const item of pagina.itens) itens.push(item);
    cursor = pagina.proximoCursor;
  } while (cursor);
  return itens;
}
