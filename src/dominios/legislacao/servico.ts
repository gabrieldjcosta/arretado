// Serviço da Legislação (F2, 9.2 e 9.3; Parte 2 §10.6 e §13.1, item 8): do Bloco[] sanitizado ao
// rascunho gravado (Norma, VersaoDeNorma com status 'rascunho', um Dispositivo e um
// TextoDeDispositivo por nó e a fonte como Anexo), numa transação só; descartar e retomar o
// rascunho; publicá-lo (a versão vira vigente). O hash (da versão e do anexo, sobre os blocos
// sanitizados) é calculado antes da transação: WebCrypto aguardado dentro dela a fecha
// (`PrematureCommitError`).
import { dataCivil } from '../../core/datas';
import type { Dispositivo, Norma, VersaoDeNorma } from '../../core/modelo';
import {
  AnexoAlterado,
  gravarAnexo,
  lerAnexo,
  prepararAnexo,
  removerAnexos,
  type Repositorio,
} from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { sha256 } from '../../core/util/sha256';
import { dispositivosDaNorma, todos } from './consultas';
import { estruturar } from './estruturador';
import type { Anomalia, FormatoEntrada, Rascunho } from './rascunho';
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
import { validarNos, type NoValidado } from './validacao';

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

export interface OpcoesCriarRascunho {
  /**
   * Chamado depois de estruturar e antes de gravar, fora da transação (pode aguardar): a tela
   * (9.5) mostra "Guardando o rascunho", a parte longa numa lei grande (espera do IndexedDB).
   */
  antesDeGravar?: () => Promise<void>;
}

/**
 * Estrutura os blocos e grava o rascunho de uma norma nova. Nada é gravado se qualquer registro
 * falhar na validação do modelo.
 */
export async function criarRascunho(
  repo: Repositorio,
  entrada: EntradaRascunho,
  opcoes: OpcoesCriarRascunho = {},
): Promise<RascunhoDeNorma> {
  const rascunho = estruturar(entrada.blocos, { formato: formatoDaOrigem(entrada.origemEntrada) });
  await opcoes.antesDeGravar?.();
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

/** Marca do rascunho editado à mão, no fim de `VersaoDeNorma.versaoAdaptador` (até 50 caracteres). */
export const MARCA_MANUAL = '+manual';
export const editadoAMao = (versao: Pick<VersaoDeNorma, 'versaoAdaptador'>): boolean =>
  versao.versaoAdaptador?.endsWith(MARCA_MANUAL) === true;

/**
 * Marca o rascunho como editado à mão (confirmação, correção, conversão, junção, divisão): a partir
 * daí `retomarRascunho` não refaz a árvore pela fonte. Só dentro de uma transação.
 */
export async function marcarEditadoAMao(repo: Repositorio, versao: VersaoDeNorma): Promise<void> {
  if (editadoAMao(versao)) return;
  await repo.colecao('versoesNorma').atualizar(versao.id, {
    versaoAdaptador: `${versao.versaoAdaptador ?? '0'}${MARCA_MANUAL}`.slice(-50),
  });
}

/**
 * Reabre um rascunho: o relatório sai de novo da fonte guardada (o estruturador é determinístico).
 * Se o estruturador mudou desde a gravação (app atualizado), a árvore é refeita pela fonte, com os
 * ids de cada endereço mantidos, a não ser que o rascunho tenha edição à mão (`editadoAMao`:
 * confirmação, correção, conversão, junção ou divisão): então a árvore gravada fica como está, e a
 * fonte só refaz o relatório. Refazer a árvore pela fonte com a edição preservada é da 10.4.
 */
export async function retomarRascunho(
  repo: Repositorio,
  versaoId: string,
): Promise<RascunhoDeNorma> {
  const { norma, versao } = await rascunhoGravado(repo, versaoId);
  const blocos = await fonteDaVersao(repo, versao);
  const rascunho = estruturar(blocos, { formato: formatoDaOrigem(versao.origemEntrada) });
  if (versao.versaoAdaptador === rascunho.versaoEstruturador || editadoAMao(versao)) {
    return { norma, versao, rascunho };
  }
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
 * A versão cuja fonte são exatamente estes blocos (mesmo hash: a fonte é JSON canônico), para a
 * tela (9.5) oferecer retomar o rascunho ou abrir a norma, em vez de criar outra igual. Prefere a
 * vigente ao rascunho. Lê as versões do usuário inteiras: são poucas (uma ou duas por norma).
 */
export async function versaoComMesmaFonte(
  repo: Repositorio,
  blocos: readonly Bloco[],
): Promise<{ norma: Norma; versao: VersaoDeNorma } | undefined> {
  const hash = await sha256(serializarFonte(blocos));
  const versoes = await todos(repo.colecao('versoesNorma'), {
    indice: 'usuarioId',
    de: repo.ctx.usuarioId,
    ate: repo.ctx.usuarioId,
    filtro: (v) => v.hash === hash,
  });
  versoes.sort((a, b) => Number(b.status === 'vigente') - Number(a.status === 'vigente'));
  for (const versao of versoes) {
    const norma = await repo.colecao('normas').obter(versao.normaId);
    if (norma) return { norma, versao };
  }
  return undefined;
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

/** Resultado da checagem que antecede a publicação (a mesma que `publicarVersao` refaz). */
export interface RelatorioDePublicacao {
  /** Bloqueiam a publicação (regra 12: "publicar exige zero conflito"). */
  conflitos: Anomalia[];
  /** Só informam; a publicação segue. */
  avisos: Anomalia[];
  /** Dispositivos "a confirmar" (regra 12): a publicação pede o aceite em lote. */
  aConfirmar: number;
  totalDispositivos: number;
}

export interface OpcoesPublicacao {
  /** Aceita em lote os dispositivos "a confirmar" (regra 12); sem isso, eles bloqueiam. */
  aceitarAConfirmar?: boolean;
  /**
   * O título curto confirmado na tela (9.5), gravado na mesma transação que publica. Ausente ou
   * em branco, fica o da gravação do rascunho (como em `criarRascunho`).
   */
  tituloCurto?: string;
}

export interface NormaPublicada {
  norma: Norma;
  versao: VersaoDeNorma;
  relatorio: RelatorioDePublicacao;
}

export type MotivoPublicacaoBloqueada = 'conflitos' | 'a_confirmar';

export class PublicacaoBloqueada extends Error {
  constructor(
    readonly versaoId: string,
    readonly motivo: MotivoPublicacaoBloqueada,
    readonly relatorio: RelatorioDePublicacao,
  ) {
    super(
      motivo === 'conflitos'
        ? `Há ${String(relatorio.conflitos.length)} conflito(s) a resolver antes de publicar.`
        : `${String(relatorio.aConfirmar)} dispositivo(s) a confirmar: aceite-os em lote para publicar.`,
    );
    this.name = 'PublicacaoBloqueada';
  }
}

/**
 * Confere a árvore GRAVADA (não a da fonte): o que se publica é o que está nos registros, e o
 * editor (etapa 10) muda os registros, não a fonte. As anomalias do estruturador não são
 * gravadas (9.2); aqui sai a validação estrutural inteira (regra 13, `validarNos`, a mesma que o
 * estruturador roda sobre o rascunho, com as mesmas frases) sobre os registros lidos, separada
 * pela gravidade: conflitos (norma sem artigo, endereço repetido com algum dispositivo) bloqueiam;
 * avisos só informam. O endereço repetido só de nós estruturais (LC 80: duas "SEÇÃO IV" no mesmo
 * capítulo) é aviso (`estrutural_repetido`): decidido na 9.3 e confirmado na 8.7, porque o artigo é
 * único, o leitor lê a norma e a revisão (etapa 10) corrige o rótulo. `aConfirmar` é a contagem
 * gravada (o nó em conflito já foi gravado "a confirmar" pelo estruturador).
 */
function relatorioDaArvore(
  dispositivos: readonly Dispositivo[],
  formato: FormatoEntrada,
): RelatorioDePublicacao {
  const indice = new Map(dispositivos.map((d, k) => [d.id, k]));
  const nos = dispositivos.map((d): NoValidado => {
    const pai = d.paiId === undefined ? undefined : indice.get(d.paiId);
    return {
      tipo: d.tipo,
      endereco: d.endereco,
      ...(d.rotulo === undefined ? {} : { rotulo: d.rotulo }),
      status: d.status,
      confianca: d.confianca,
      estrutural: d.categoria === 'estrutural',
      ...(pai === undefined ? {} : { pai }),
    };
  });
  const conflitos: Anomalia[] = [];
  const avisos: Anomalia[] = [];
  for (const a of validarNos(nos, formato))
    (a.gravidade === 'conflito' ? conflitos : avisos).push(a);
  const aConfirmar = dispositivos.filter((d) => d.confianca === 'a_confirmar').length;
  return { conflitos, avisos, aConfirmar, totalDispositivos: dispositivos.length };
}

/**
 * O que a publicação de um rascunho encontraria agora, para a tela habilitar ou não o "Publicar"
 * (9.5). Recusa, como `publicarVersao`, o que não é rascunho de norma única.
 */
export async function verificarPublicacao(
  repo: Repositorio,
  versaoId: string,
): Promise<RelatorioDePublicacao> {
  return repo.transacao(async () => (await prepararPublicacao(repo, versaoId)).relatorio);
}

/**
 * Publica o rascunho: a versão vira vigente e a norma passa a apontar para ela
 * (`versaoVigenteId`); o evento `versao.publicada` sai depois da confirmação. Recusa com
 * `PublicacaoBloqueada` se houver conflito, ou dispositivo "a confirmar" sem `aceitarAConfirmar`.
 * Dispositivos e textos não mudam: o "a confirmar" aceito continua "a confirmar" (a 10.1 os
 * confirma), e norma publicada só muda com nova versão. O estado é relido na mesma transação que
 * escreve: publicar e descartar o mesmo rascunho em duas abas termina em `RascunhoIndisponivel`
 * para uma delas. Só publica a primeira versão de uma norma; arquivar a anterior é da versão nova
 * (11.7 e F6).
 */
export async function publicarVersao(
  repo: Repositorio,
  versaoId: string,
  opcoes: OpcoesPublicacao = {},
): Promise<NormaPublicada> {
  const publicada = await repo.transacao(async () => {
    const { norma, versao, relatorio } = await prepararPublicacao(repo, versaoId);
    if (relatorio.conflitos.length > 0) {
      throw new PublicacaoBloqueada(versaoId, 'conflitos', relatorio);
    }
    if (relatorio.aConfirmar > 0 && opcoes.aceitarAConfirmar !== true) {
      throw new PublicacaoBloqueada(versaoId, 'a_confirmar', relatorio);
    }
    const vigente = await repo.colecao('versoesNorma').atualizar(versao.id, { status: 'vigente' });
    const tituloCurto = opcoes.tituloCurto?.trim();
    const normaAtual = await repo.colecao('normas').atualizar(norma.id, {
      versaoVigenteId: versao.id,
      ...(tituloCurto ? { tituloCurto } : {}),
    });
    return { norma: normaAtual, versao: vigente, relatorio };
  });
  repo.eventos.emitir('versao.publicada', { normaId: publicada.norma.id, versaoId });
  return publicada;
}

/** Só dentro de uma transação: o estado lido é o que a escrita seguinte vê. */
async function prepararPublicacao(repo: Repositorio, versaoId: string) {
  const { norma, versao } = await rascunhoGravado(repo, versaoId);
  await exigirVersaoUnica(repo, norma.id, versao.id);
  const relatorio = relatorioDaArvore(
    await dispositivosDaNorma(repo.colecao('dispositivos'), norma.id, false),
    formatoDaOrigem(versao.origemEntrada),
  );
  return { norma, versao, relatorio };
}

export async function rascunhoGravado(
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
  return {
    dispositivos: await dispositivosDaNorma(repo.colecao('dispositivos'), normaId, true),
    textos,
  };
}

async function apagarArvore(
  repo: Repositorio,
  arvore: Awaited<ReturnType<typeof arvoreGravada>>,
): Promise<void> {
  await repo.colecao('textosDispositivo').removerFisico(arvore.textos.map((t) => t.id));
  await repo.colecao('dispositivos').removerFisico(arvore.dispositivos.map((d) => d.id));
}
