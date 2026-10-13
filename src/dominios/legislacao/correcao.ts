// Correção do texto de norma publicada (F2, 11.7; Parte 2 §10.6): corrigir não reescreve a versão
// vigente, grava uma Versão nova (`edicao_manual`) e arquiva a de antes, que continua consultável e
// serve para desfazer. A árvore não muda: mesmo endereço = mesmo dispositivo (mesmo id), então
// estrela, erros vinculados, "lido até", posição e vínculos seguem sem tocar neles. Grifos e notas
// são reancorados no texto novo (exata → aproximada → pendente); o pendente não se perde: guarda a
// âncora de antes, aparece em "Para reler" e volta se a correção for desfeita.
import {
  NOMES_CAMPOS_COMUNS,
  type Marcacao,
  type TextoDeDispositivo,
  type VersaoDeNorma,
} from '../../core/modelo';
import type { Dados, Repositorio } from '../../core/persistencia';
import { reancorar } from '../../core/util/reancoragem';
import { dispositivosDaNorma, todos } from './consultas';
import { MARCA_MANUAL } from './servico';
import { normalizar } from './normalizacao';

type Trechos = TextoDeDispositivo['trechos'];

/** O mesmo limite do texto na revisão do rascunho (10.1). */
export const MAXIMO_DO_TEXTO = 200_000;

export type MotivoCorrecaoRecusada =
  | 'inexistente'
  | 'sem_versao_vigente'
  | 'versao_mudou'
  | 'dispositivo_fora'
  | 'texto_vazio'
  | 'texto_longo'
  | 'versao_inexistente';

const MENSAGEM: Record<MotivoCorrecaoRecusada, string> = {
  inexistente: 'Esta norma não existe mais.',
  sem_versao_vigente: 'Esta norma ainda não foi publicada.',
  versao_mudou:
    'O texto desta norma mudou em outra aba. Recarregue a página e corrija de novo; nada foi gravado.',
  dispositivo_fora: 'Este dispositivo não está no texto em vigor desta norma.',
  texto_vazio: 'O texto não pode ficar vazio.',
  texto_longo: 'O texto passou do limite.',
  versao_inexistente: 'Essa versão anterior não existe mais.',
};

export class CorrecaoRecusada extends Error {
  constructor(readonly motivo: MotivoCorrecaoRecusada) {
    super(MENSAGEM[motivo]);
    this.name = 'CorrecaoRecusada';
  }
}

export interface CorrecaoDeTexto {
  dispositivoId: string;
  /** O texto inteiro do dispositivo, como o leitor o guarda (sem o rótulo). */
  texto: string;
}

export interface ResultadoDaCorrecao {
  estado: 'sem_mudanca' | 'corrigida';
  normaId: string;
  /** A versão vigente depois (a mesma de antes, sem mudança). */
  versaoId: string;
  /** A versão arquivada pela correção (para consultar e desfazer). */
  versaoAnteriorId?: string;
  /** Dispositivos com texto novo. */
  alterados: string[];
  /** Grifos e notas que mudaram de lugar ou casaram por aproximação. */
  reancoradas: number;
  /** Grifos e notas que ficaram para reler (sem o trecho no texto novo). */
  pendentes: number;
  /** Grifos e notas que estavam para reler e voltaram ao texto. */
  recuperadas: number;
}

/** O texto como o leitor o mede: os trechos juntos, o tachado inclusive (base das âncoras). */
export const textoDosTrechos = (trechos: Trechos): string => trechos.map((t) => t.texto).join('');

const chaveDosTrechos = (trechos: Trechos): string =>
  JSON.stringify(
    trechos.map((t) => [t.texto, t.tachado === true, t.enfase === true, t.link ?? '']),
  );

/**
 * Quebra de linha do Windows vira "\n"; cada linha passa pela regra 1 (NFC, invisíveis, espaços),
 * como na importação: sem isso, um texto colado em NFD (PDF, macOS) some da busca e das remissões.
 */
export const textoLimpo = (texto: string): string =>
  texto.replace(/\r\n?/g, '\n').split('\n').map(normalizar).join('\n').trim();

const formaDe = (t: Trechos[number]): Omit<Trechos[number], 'texto'> => ({
  ...(t.tachado === undefined ? {} : { tachado: t.tachado }),
  ...(t.enfase === undefined ? {} : { enfase: t.enfase }),
  ...(t.link === undefined ? {} : { link: t.link }),
});

/** Os pedaços de `trechos` entre `de` e `ate` (no texto junto), com a forma de cada um. */
function recortar(trechos: Trechos, de: number, ate: number): Trechos {
  const saida: Trechos = [];
  let pos = 0;
  for (const t of trechos) {
    const fim = pos + t.texto.length;
    const a = Math.max(de, pos);
    const b = Math.min(ate, fim);
    if (a < b) saida.push({ texto: t.texto.slice(a - pos, b - pos), ...formaDe(t) });
    pos = fim;
  }
  return saida;
}

/** O trecho que contém o intervalo `[de, ate]` inteiro; na inserção pura, o da esquerda. */
function trechoQueContem(trechos: Trechos, de: number, ate: number): Trechos[number] | undefined {
  let pos = 0;
  let anterior: Trechos[number] | undefined;
  for (const t of trechos) {
    const fim = pos + t.texto.length;
    if (de === ate && de === pos && anterior) return anterior;
    if (de >= pos && ate <= fim && (de < fim || de === ate)) return t;
    pos = fim;
    anterior = t;
  }
  return de === ate ? anterior : undefined;
}

/** Junta pedaços vizinhos de mesma forma (o recorte não deixa o texto em migalhas). */
function juntar(trechos: Trechos): Trechos {
  const saida: Trechos = [];
  for (const t of trechos) {
    if (t.texto === '') continue;
    const ultimo = saida.at(-1);
    if (
      ultimo &&
      chaveDosTrechos([{ ...ultimo, texto: '' }]) === chaveDosTrechos([{ ...t, texto: '' }])
    ) {
      saida[saida.length - 1] = { ...ultimo, texto: ultimo.texto + t.texto };
    } else {
      saida.push(t);
    }
  }
  return saida;
}

/**
 * Os trechos do texto corrigido. Só o meio que mudou é trocado: o começo e o fim iguais mantêm a
 * forma (tachado, ênfase, link). O meio novo herda a forma do trecho em que caiu inteiro; se pegou
 * mais de um, fica sem forma (quem corrige escolhe palavras, não formatação).
 */
export function trechosCorrigidos(antigos: Trechos, novo: string): Trechos {
  const velho = textoDosTrechos(antigos);
  if (velho === novo) return antigos;
  const limite = Math.min(velho.length, novo.length);
  let p = 0;
  while (p < limite && velho.charAt(p) === novo.charAt(p)) p++;
  let s = 0;
  while (
    s < limite - p &&
    velho.charAt(velho.length - 1 - s) === novo.charAt(novo.length - 1 - s)
  ) {
    s++;
  }
  const casa = trechoQueContem(antigos, p, velho.length - s);
  if (!casa) {
    // Pegou mais de um trecho: a troca vai das bordas dos trechos das pontas (um resto de letra
    // igual não fica com a forma do trecho vizinho).
    let pos = 0;
    let de = p;
    let ate = velho.length - s;
    for (const t of antigos) {
      const fim = pos + t.texto.length;
      if (p > pos && p < fim) de = pos;
      if (velho.length - s > pos && velho.length - s < fim) ate = fim;
      pos = fim;
    }
    p = de;
    s = velho.length - ate;
  }
  const meio = novo.slice(p, novo.length - s);
  return juntar([
    ...recortar(antigos, 0, p),
    ...(meio === '' ? [] : [{ texto: meio, ...(casa ? formaDe(casa) : {}) }]),
    ...recortar(antigos, velho.length - s, velho.length),
  ]);
}

const semCamposComuns = <T extends object>(registro: T): T => {
  const copia = { ...registro };
  for (const k of NOMES_CAMPOS_COMUNS) Reflect.deleteProperty(copia, k);
  return copia;
};

/** O que gravar: para cada dispositivo, os trechos novos. Recebe os textos da vigente. */
type Calculo = (
  textos: ReadonlyMap<string, TextoDeDispositivo>,
  ativos: ReadonlySet<string>,
) => Promise<Map<string, Trechos>> | Map<string, Trechos>;

/**
 * Grava a versão nova numa transação: a vigente (conferida contra `versaoBaseId`, a que a tela
 * leu) vira arquivada; a nova copia todos os textos, troca os que mudaram, e as marcações são
 * levadas a ela. Sem diferença, não grava nada.
 */
async function gravarVersaoCorrigida(
  repo: Repositorio,
  normaId: string,
  versaoBaseId: string,
  calcular: Calculo,
): Promise<ResultadoDaCorrecao> {
  const pendentesNovas: Marcacao[] = [];
  const resultado = await repo.transacao(async (): Promise<ResultadoDaCorrecao> => {
    const norma = await repo.colecao('normas').obter(normaId);
    if (!norma) throw new CorrecaoRecusada('inexistente');
    const vigenteId = norma.versaoVigenteId;
    if (vigenteId === undefined) throw new CorrecaoRecusada('sem_versao_vigente');
    if (vigenteId !== versaoBaseId) throw new CorrecaoRecusada('versao_mudou');
    const antiga = await repo.colecao('versoesNorma').obter(vigenteId);
    if (antiga?.status !== 'vigente') throw new CorrecaoRecusada('sem_versao_vigente');

    const textos = await todos(repo.colecao('textosDispositivo'), {
      indice: 'versaoId',
      de: vigenteId,
      ate: vigenteId,
    });
    const textoPorDispositivo = new Map(textos.map((t) => [t.dispositivoId, t]));
    const ativos = new Set(
      (await dispositivosDaNorma(repo.colecao('dispositivos'), normaId, false)).map((d) => d.id),
    );
    const pedidas = await calcular(textoPorDispositivo, ativos);
    const mudancas = new Map<string, Trechos>();
    for (const [id, trechos] of pedidas) {
      const atual = textoPorDispositivo.get(id);
      if (atual && chaveDosTrechos(atual.trechos) !== chaveDosTrechos(trechos)) {
        mudancas.set(id, trechos);
      }
    }
    const vazio = {
      normaId,
      versaoId: vigenteId,
      alterados: [],
      reancoradas: 0,
      pendentes: 0,
      recuperadas: 0,
    };
    if (mudancas.size === 0) return { estado: 'sem_mudanca', ...vazio };

    const agora = repo.ctx.agora().toISOString();
    const versaoId = repo.ctx.novoId();
    await repo.colecao('versoesNorma').atualizar(vigenteId, { status: 'arquivada' });
    const dadosDaVersao: Dados<'versoesNorma'> = {
      ...semCamposComuns(antiga),
      status: 'vigente',
      capturadaEm: agora,
      origemEntrada: 'edicao_manual',
      versaoAdaptador: antiga.versaoAdaptador?.endsWith(MARCA_MANUAL)
        ? antiga.versaoAdaptador
        : `${antiga.versaoAdaptador ?? '0'}${MARCA_MANUAL}`.slice(-50),
    };
    await repo.colecao('versoesNorma').criar(dadosDaVersao, { id: versaoId });
    await repo.colecao('textosDispositivo').criarLote(
      textos.map((t) => ({
        dados: {
          ...semCamposComuns(t),
          versaoId,
          trechos: mudancas.get(t.dispositivoId) ?? t.trechos,
        },
      })),
    );
    await repo.colecao('normas').atualizar(normaId, { versaoVigenteId: versaoId });

    // Marcações: as da versão de antes vão para a nova; as pendentes (de qualquer versão) tentam
    // de novo. Texto que não mudou não precisa de busca.
    let reancoradas = 0;
    let pendentes = 0;
    let recuperadas = 0;
    const marcacoes = await todos(repo.colecao('marcacoes'), {
      indice: 'normaId',
      de: normaId,
      ate: normaId,
    });
    for (const m of marcacoes) {
      if (m.versaoId !== vigenteId && m.status !== 'pendente') continue;
      const atual = ativos.has(m.dispositivoId)
        ? textoPorDispositivo.get(m.dispositivoId)
        : undefined;
      // Dispositivo fora da árvore: nada a reancorar (e não entra na conta do aviso).
      if (!atual) continue;
      const novos = mudancas.get(m.dispositivoId);
      if (novos === undefined && m.status !== 'pendente') {
        await repo.colecao('marcacoes').atualizar(m.id, { versaoId });
        continue;
      }
      // A âncora da versão de antes foi medida no texto atual: a edição a desloca com exatidão.
      const r = reancorar(
        m.ancora,
        textoDosTrechos(novos ?? atual.trechos),
        m.status === 'pendente' ? undefined : textoDosTrechos(atual.trechos),
      );
      if (r.status === 'pendente') {
        if (novos !== undefined) pendentes += 1;
        if (m.status !== 'pendente') {
          await repo.colecao('marcacoes').atualizar(m.id, { status: 'pendente' });
          pendentesNovas.push(m);
        }
        continue;
      }
      if (m.status === 'pendente') recuperadas += 1;
      else if (r.status === 'reancorada') reancoradas += 1;
      const status: Marcacao['status'] =
        r.status === 'reancorada' ? 'reancorada' : m.status === 'pendente' ? 'valida' : m.status;
      await repo.colecao('marcacoes').atualizar(m.id, {
        versaoId,
        status,
        ancora: { texto: r.texto, inicio: r.inicio, fim: r.fim },
      });
    }

    return {
      estado: 'corrigida',
      normaId,
      versaoId,
      versaoAnteriorId: vigenteId,
      alterados: [...mudancas.keys()],
      reancoradas,
      pendentes,
      recuperadas,
    };
  });

  if (resultado.estado === 'corrigida' && resultado.versaoAnteriorId !== undefined) {
    const versaoAnterior = resultado.versaoAnteriorId;
    for (const dispositivoId of resultado.alterados) {
      repo.eventos.emitir('dispositivo.alterado', {
        normaId,
        dispositivoId,
        versaoAnterior,
        versaoNova: resultado.versaoId,
      });
    }
    for (const m of pendentesNovas) {
      repo.eventos.emitir('marcacao.pendenteReancoragem', {
        normaId,
        marcacaoId: m.id,
        dispositivoId: m.dispositivoId,
      });
    }
    repo.eventos.emitir('versao.publicada', { normaId, versaoId: resultado.versaoId });
  }
  return resultado;
}

/**
 * Corrige o texto de dispositivos da norma publicada. `versaoBaseId` é a versão que a tela
 * mostrava: se outra aba já gravou outra, recusa sem gravar. Texto igual ao de agora não gera
 * versão (`sem_mudanca`).
 */
export async function corrigirTextoPublicado(
  repo: Repositorio,
  normaId: string,
  versaoBaseId: string,
  correcoes: readonly CorrecaoDeTexto[],
): Promise<ResultadoDaCorrecao> {
  const limpas = correcoes.map((c) => ({ ...c, texto: textoLimpo(c.texto) }));
  for (const c of limpas) {
    if (c.texto === '') throw new CorrecaoRecusada('texto_vazio');
    if (c.texto.length > MAXIMO_DO_TEXTO) throw new CorrecaoRecusada('texto_longo');
  }
  return gravarVersaoCorrigida(repo, normaId, versaoBaseId, (textos, ativos) => {
    const saida = new Map<string, Trechos>();
    for (const c of limpas) {
      const atual = textos.get(c.dispositivoId);
      if (!atual || !ativos.has(c.dispositivoId)) throw new CorrecaoRecusada('dispositivo_fora');
      saida.set(c.dispositivoId, trechosCorrigidos(atual.trechos, c.texto));
    }
    return saida;
  });
}

/**
 * Volta o texto ao de uma versão anterior da mesma norma (desfazer a correção, ou voltar um
 * dispositivo ao texto de antes). Também grava versão nova: a corrigida fica arquivada, nada se
 * apaga. Sem `dispositivoIds`, volta todos os que diferem; os grifos pendentes tentam de novo.
 */
export async function voltarParaVersao(
  repo: Repositorio,
  normaId: string,
  versaoBaseId: string,
  versaoAlvoId: string,
  dispositivoIds?: readonly string[],
): Promise<ResultadoDaCorrecao> {
  return gravarVersaoCorrigida(repo, normaId, versaoBaseId, async (textos, ativos) => {
    const alvo = await repo.colecao('versoesNorma').obter(versaoAlvoId);
    if (alvo?.normaId !== normaId) throw new CorrecaoRecusada('versao_inexistente');
    const doAlvo = await todos(repo.colecao('textosDispositivo'), {
      indice: 'versaoId',
      de: versaoAlvoId,
      ate: versaoAlvoId,
    });
    const filtro = dispositivoIds === undefined ? undefined : new Set(dispositivoIds);
    const saida = new Map<string, Trechos>();
    for (const t of doAlvo) {
      if (filtro && !filtro.has(t.dispositivoId)) continue;
      if (!ativos.has(t.dispositivoId) || !textos.has(t.dispositivoId)) continue;
      saida.set(t.dispositivoId, t.trechos);
    }
    return saida;
  });
}

export interface TextoDeAntes {
  versaoId: string;
  /** Quando a versão de antes foi gravada (ISO). */
  capturadaEm: string;
  /** Quando esse texto deixou de valer: a gravação da versão seguinte (ISO). */
  substituidoEm: string;
  origemEntrada: VersaoDeNorma['origemEntrada'];
  texto: string;
}

/**
 * Os textos anteriores do dispositivo, do mais novo para o mais antigo, só os diferentes do que
 * veio depois (a versão anterior é consultável). A vigente fica de fora.
 */
export async function textosAnteriores(
  repo: Repositorio,
  normaId: string,
  dispositivoId: string,
): Promise<TextoDeAntes[]> {
  const versoes = await todos(repo.colecao('versoesNorma'), {
    indice: 'normaId',
    de: normaId,
    ate: normaId,
  });
  const publicadas = versoes
    .filter((v) => v.status !== 'rascunho')
    .sort((a, b) => b.capturadaEm.localeCompare(a.capturadaEm) || (a.id < b.id ? 1 : -1));
  // Um texto por versão (sem índice por dispositivo; as versões de uma norma são poucas).
  const textos = await repo.colecao('textosDispositivo').obterPorChaves(
    '[versaoId+dispositivoId]',
    publicadas.map((v) => [v.id, dispositivoId]),
  );
  const textoPorVersao = new Map(textos.flatMap((t) => (t ? [[t.versaoId, t] as const] : [])));
  const comVersao = publicadas.flatMap((v) => {
    const t = textoPorVersao.get(v.id);
    return t ? [{ t, v }] : [];
  });
  const saida: TextoDeAntes[] = [];
  // O texto de agora fica de fora mesmo numa versão antiga (depois de desfazer, ela repete o atual).
  const vigente = comVersao.find(({ v }) => v.status === 'vigente');
  const atual = vigente ? textoDosTrechos(vigente.t.trechos) : undefined;
  let depois: { texto: string; capturadaEm: string } | undefined;
  for (const { t, v } of comVersao) {
    const texto = textoDosTrechos(t.trechos);
    if (
      v.status === 'arquivada' &&
      depois !== undefined &&
      texto !== depois.texto &&
      texto !== atual
    ) {
      saida.push({
        versaoId: v.id,
        capturadaEm: v.capturadaEm,
        substituidoEm: depois.capturadaEm,
        origemEntrada: v.origemEntrada,
        texto,
      });
    }
    depois = { texto, capturadaEm: v.capturadaEm };
  }
  return saida;
}
