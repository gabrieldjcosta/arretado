// Precedentes (F3-C, C2, esquema v8): decisão judicial com trechos-chave, vínculos a dispositivos da
// lei e vínculos entre precedentes. Local-first; o texto é texto puro (nunca vira HTML).
import { dataCivil, somarDias } from '../../core/datas';
import type {
  Frase,
  PontaDeVinculo,
  Precedente,
  RotuloDoTrecho,
  TipoDeVinculoEntrePrecedentes,
  TrechoChave,
  VinculoEntrePrecedentes,
  VinculoPrecedenteDispositivo,
} from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { novoId } from '../../core/ids';
import { reancorar } from '../../core/util/reancoragem';

export const TEXTO_MAXIMO_DO_PRECEDENTE = 100_000;
export const TRECHO_MAXIMO = 5_000;

async function todosPorIndice<
  N extends 'vinculosPrecedenteDispositivo' | 'vinculosEntrePrecedentes',
>(repo: Repositorio, nome: N, indice: string, chave: string) {
  return (await repo.colecao(nome).listarPagina({ indice, de: chave, ate: chave, limite: 500 }))
    .itens;
}

// ── Precedente ────────────────────────────────────────────────────────────

export interface EntradaDoPrecedente {
  tribunal: string;
  numero: string;
  /** Ementa, tese ou o texto que importa. */
  texto: string;
  tipo?: Precedente['tipo'];
  disciplinaId?: string;
  fonteOficial?: string;
}

function trecho(texto: string, inicio: number, fim: number, rotulo: RotuloDoTrecho): TrechoChave {
  if (!(fim > inicio) || fim > texto.length) throw new Error('Selecione o trecho.');
  const citado = texto.slice(inicio, fim);
  if (!citado.trim()) throw new Error('Selecione o trecho.');
  return {
    id: novoId(),
    rotulo,
    texto: citado.slice(0, TRECHO_MAXIMO),
    inicio,
    fim: inicio + Math.min(citado.length, TRECHO_MAXIMO),
    status: 'valida',
  };
}

/**
 * Cria o Precedente. Só tribunal, número e o texto são obrigatórios (D25); o primeiro trecho-chave
 * é a tese: o texto inteiro, até o limite do trecho (depois a pessoa marca o que importa).
 */
export async function criarPrecedente(
  repo: Repositorio,
  entrada: EntradaDoPrecedente,
): Promise<Precedente> {
  const tribunal = entrada.tribunal.trim();
  const numero = entrada.numero.trim();
  const texto = entrada.texto.trim();
  if (!tribunal || !numero) throw new Error('Informe o tribunal e o número.');
  if (!texto) throw new Error('Escreva ou cole o texto do precedente.');
  if (texto.length > TEXTO_MAXIMO_DO_PRECEDENTE)
    throw new Error('O texto passou do tamanho máximo.');
  return repo.colecao('precedentes').criar({
    tituloTese: `${tribunal} ${numero}`.slice(0, 5_000),
    escopo: 'nacional',
    tribunal,
    numero,
    ...(entrada.tipo ? { tipo: entrada.tipo } : {}),
    ...(entrada.disciplinaId ? { disciplinaId: entrada.disciplinaId } : {}),
    ...(entrada.fonteOficial ? { fonteOficial: entrada.fonteOficial } : {}),
    textoOriginal: texto,
    trechosChave: [trecho(texto, 0, Math.min(texto.length, TRECHO_MAXIMO), 'tese')],
    statusLeitura: 'nao_lido',
  });
}

export async function lerPrecedente(repo: Repositorio, id: string) {
  return repo.colecao('precedentes').obter(id);
}

/** Precedentes cadastrados, favoritos primeiro e depois os mais recentes. */
export async function listarPrecedentes(repo: Repositorio): Promise<Precedente[]> {
  const itens = (await repo.colecao('precedentes').listarPagina({ limite: 500 })).itens;
  return itens.sort(
    (a, b) =>
      Number(b.favorito === true) - Number(a.favorito === true) ||
      b.atualizadoEm.localeCompare(a.atualizadoEm),
  );
}

/** O trecho exibido por padrão: a primeira tese; sem tese, o primeiro trecho. */
export function trechoPadrao(p: Pick<Precedente, 'trechosChave'>): TrechoChave | undefined {
  const lista = (p.trechosChave ?? []).filter((t) => t.status !== 'pendente');
  return lista.find((t) => t.rotulo === 'tese') ?? lista[0];
}

export async function alternarFavorito(repo: Repositorio, id: string): Promise<Precedente> {
  const p = await repo.colecao('precedentes').obter(id);
  if (!p) throw new Error('Precedente não encontrado.');
  return repo.colecao('precedentes').atualizar(id, { favorito: p.favorito !== true });
}

export async function marcarTrechoChave(
  repo: Repositorio,
  id: string,
  entrada: { inicio: number; fim: number; rotulo: RotuloDoTrecho },
): Promise<Precedente> {
  const p = await repo.colecao('precedentes').obter(id);
  if (!p) throw new Error('Precedente não encontrado.');
  const novo = trecho(p.textoOriginal ?? '', entrada.inicio, entrada.fim, entrada.rotulo);
  return repo.colecao('precedentes').atualizar(id, {
    trechosChave: [...(p.trechosChave ?? []), novo].slice(0, 50),
  });
}

/** Tira o trecho-chave e os vínculos a dispositivos que eram dele. Nunca deixa o precedente sem trecho. */
export async function removerTrechoChave(
  repo: Repositorio,
  id: string,
  trechoId: string,
): Promise<Precedente> {
  const p = await repo.colecao('precedentes').obter(id);
  if (!p) throw new Error('Precedente não encontrado.');
  const resto = (p.trechosChave ?? []).filter((t) => t.id !== trechoId);
  if (resto.length === 0) throw new Error('O precedente precisa de ao menos um trecho-chave.');
  return repo.transacao(async () => {
    for (const v of await todosPorIndice(
      repo,
      'vinculosPrecedenteDispositivo',
      'precedenteId',
      id,
    )) {
      if (v.trechoId === trechoId)
        await repo.colecao('vinculosPrecedenteDispositivo').excluir(v.id);
    }
    return repo.colecao('precedentes').atualizar(id, { trechosChave: resto });
  });
}

/**
 * Corrige o texto: cada trecho-chave volta ao texto novo (exato → aproximado → pendente) e as
 * Frases de trecho seguem o texto. O texto da Frase é da pessoa e nunca muda.
 */
export async function corrigirTextoDoPrecedente(
  repo: Repositorio,
  id: string,
  textoNovo: string,
): Promise<Precedente> {
  const p = await repo.colecao('precedentes').obter(id);
  if (!p) throw new Error('Precedente não encontrado.');
  const novo = textoNovo.trim();
  if (!novo) throw new Error('O texto não pode ficar vazio.');
  if (novo.length > TEXTO_MAXIMO_DO_PRECEDENTE)
    throw new Error('O texto passou do tamanho máximo.');
  const antigo = p.textoOriginal ?? '';
  return repo.transacao(async () => {
    const trechosChave = (p.trechosChave ?? []).map((t): TrechoChave => {
      const r = reancorar(
        { texto: t.texto, inicio: t.inicio, fim: t.fim },
        novo,
        t.status === 'pendente' ? undefined : antigo,
      );
      if (r.status === 'pendente') return { ...t, status: 'pendente' };
      return {
        ...t,
        status: r.status === 'reancorada' ? 'reancorada' : 'valida',
        texto: r.texto,
        inicio: r.inicio,
        fim: r.fim,
      };
    });
    const frases = (await repo.colecao('frases').listarPagina({ limite: 500 })).itens;
    for (const f of frases) {
      const t = f.trechoDePrecedente;
      if (t?.precedenteId !== id) continue;
      const r = reancorar({ texto: t.texto, inicio: t.inicio, fim: t.fim }, novo, antigo);
      if (r.status === 'pendente') continue;
      await repo.colecao('frases').atualizar(f.id, {
        trechoDePrecedente: { precedenteId: id, texto: r.texto, inicio: r.inicio, fim: r.fim },
      });
    }
    return repo.colecao('precedentes').atualizar(id, { textoOriginal: novo, trechosChave });
  });
}

/** Exclui o precedente e todos os vínculos dele (a Frase enviada dele continua, sem o link). */
export async function excluirPrecedente(repo: Repositorio, id: string): Promise<void> {
  await repo.transacao(async () => {
    for (const v of await todosPorIndice(
      repo,
      'vinculosPrecedenteDispositivo',
      'precedenteId',
      id,
    )) {
      await repo.colecao('vinculosPrecedenteDispositivo').excluir(v.id);
    }
    for (const indice of ['deId', 'paraId']) {
      for (const v of await todosPorIndice(repo, 'vinculosEntrePrecedentes', indice, id)) {
        await repo.colecao('vinculosEntrePrecedentes').excluir(v.id);
      }
    }
    await repo.colecao('precedentes').excluir(id);
  });
}

// ── Vínculo precedente ↔ dispositivo ───────────────────────────────────────

export async function vincularADispositivo(
  repo: Repositorio,
  entrada: {
    precedenteId: string;
    trechoId?: string;
    normaId: string;
    dispositivoId: string;
    endereco: string;
  },
): Promise<VinculoPrecedenteDispositivo> {
  const p = await repo.colecao('precedentes').obter(entrada.precedenteId);
  if (!p) throw new Error('Precedente não encontrado.');
  const trechoId = entrada.trechoId ?? trechoPadrao(p)?.id;
  const existente = (
    await todosPorIndice(repo, 'vinculosPrecedenteDispositivo', 'precedenteId', p.id)
  ).find((v) => v.dispositivoId === entrada.dispositivoId && v.trechoId === trechoId);
  if (existente) return existente;
  return repo.colecao('vinculosPrecedenteDispositivo').criar({
    precedenteId: p.id,
    ...(trechoId ? { trechoId } : {}),
    normaId: entrada.normaId,
    dispositivoId: entrada.dispositivoId,
    endereco: entrada.endereco,
    status: 'valida',
  });
}

export async function desvincularDeDispositivo(repo: Repositorio, vinculoId: string) {
  await repo.colecao('vinculosPrecedenteDispositivo').excluir(vinculoId);
}

export function vinculosDoPrecedente(repo: Repositorio, precedenteId: string) {
  return todosPorIndice(repo, 'vinculosPrecedenteDispositivo', 'precedenteId', precedenteId);
}

/** Os vínculos que apontam para o dispositivo (o contador "N precedentes" no leitor da lei). */
export function vinculosDoDispositivo(repo: Repositorio, dispositivoId: string) {
  return todosPorIndice(repo, 'vinculosPrecedenteDispositivo', 'dispositivoId', dispositivoId);
}

// ── Vínculo entre precedentes ──────────────────────────────────────────────

function mesmaPonta(a: PontaDeVinculo, b: PontaDeVinculo): boolean {
  return a.tipo === b.tipo && a.id === b.id;
}

export async function vincularPrecedentes(
  repo: Repositorio,
  entrada: {
    de: PontaDeVinculo;
    para: PontaDeVinculo;
    tipoDeVinculo?: TipoDeVinculoEntrePrecedentes;
    deTrechoId?: string;
    paraTrechoId?: string;
  },
): Promise<VinculoEntrePrecedentes> {
  if (mesmaPonta(entrada.de, entrada.para)) throw new Error('Escolha outro precedente.');
  const tipoDeVinculo = entrada.tipoDeVinculo ?? 'relacionado';
  const existente = (
    await todosPorIndice(repo, 'vinculosEntrePrecedentes', 'deId', entrada.de.id)
  ).find((v) => mesmaPonta(v.para, entrada.para) && v.tipoDeVinculo === tipoDeVinculo);
  if (existente) return existente;
  return repo.colecao('vinculosEntrePrecedentes').criar({
    de: entrada.de,
    para: entrada.para,
    deId: entrada.de.id,
    paraId: entrada.para.id,
    tipoDeVinculo,
    ...(entrada.deTrechoId ? { deTrechoId: entrada.deTrechoId } : {}),
    ...(entrada.paraTrechoId ? { paraTrechoId: entrada.paraTrechoId } : {}),
  });
}

export async function desvincularPrecedentes(repo: Repositorio, vinculoId: string) {
  await repo.colecao('vinculosEntrePrecedentes').excluir(vinculoId);
}

export interface Relacionados {
  /** Este → outro (este aplica, confirma, distingue, supera outro). */
  saindo: VinculoEntrePrecedentes[];
  /** Outro → este (outro supera este: "superado por"). */
  entrando: VinculoEntrePrecedentes[];
  /** Há um precedente que supera este. */
  superado: boolean;
}

/** Os dois sentidos do vínculo, para a tela do precedente (ou do dispositivo do acervo). */
export async function relacionadosDe(repo: Repositorio, id: string): Promise<Relacionados> {
  const saindo = await todosPorIndice(repo, 'vinculosEntrePrecedentes', 'deId', id);
  const entrando = await todosPorIndice(repo, 'vinculosEntrePrecedentes', 'paraId', id);
  return {
    saindo,
    entrando,
    superado: entrando.some((v) => v.tipoDeVinculo === 'supera'),
  };
}

// ── Frases ─────────────────────────────────────────────────────────────────

/** "Enviar às frases": qualquer seleção no texto do precedente, com o link de volta. */
export async function criarFraseDePrecedente(
  repo: Repositorio,
  entrada: {
    texto: string;
    precedenteId: string;
    citado: string;
    inicio: number;
    fim: number;
    disciplinaId?: string;
  },
): Promise<Frase> {
  const texto = entrada.texto.trim();
  if (!texto) throw new Error('Escreva a frase.');
  const frase = await repo.colecao('frases').criar({
    texto,
    origemTipo: 'trecho',
    ...(entrada.disciplinaId ? { disciplinaId: entrada.disciplinaId } : {}),
    trechoDePrecedente: {
      precedenteId: entrada.precedenteId,
      texto: entrada.citado.slice(0, TRECHO_MAXIMO),
      inicio: entrada.inicio,
      fim: entrada.fim,
    },
    estado: 'ativa',
    proximaRevisao: somarDias(dataCivil(repo.ctx.agora()), 1),
  });
  repo.eventos.emitir('frase.criada', { fraseId: frase.id });
  return frase;
}
