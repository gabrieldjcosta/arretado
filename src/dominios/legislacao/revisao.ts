// Revisão do rascunho (F2, 10.1; Parte 2 §10.6, regra 12 e editor "por artigo"): lista dos
// dispositivos "a confirmar" com prévia, confirmar em lote e corrigir um dispositivo. Só no
// rascunho (a norma publicada muda com versão nova). Confirmar grava `confianca: 'alta'` e dá por
// confirmadas as redações anteriores de heurística do dispositivo; o resto do texto não muda.
import type { Dispositivo, TextoDeDispositivo } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { dispositivosDaNorma, todos } from './consultas';
import { rascunhoGravado } from './servico';

/** Cabe no `TextoLongo` do modelo. */
const MAX_TEXTO = 200_000;
const MAX_ROTULO = 500;
const MAX_PREVIA = 160;
/** Quantos itens a lista entrega por vez (a tela pede mais); cabe em uma leitura por chaves. */
export const ITENS_POR_PAGINA = 50;

export interface ItemAConfirmar {
  dispositivoId: string;
  endereco: string;
  tipo: Dispositivo['tipo'];
  rotulo?: string;
  /** Onde está: o caminho de rótulos até o pai ("Art. 5º › § 2º"); vazio na raiz. */
  contexto: string;
  /** Texto vigente inteiro (a correção parte dele); quebra de linha como "\n". */
  texto: string;
  /** O começo do texto, para a lista. */
  previa: string;
}

export interface ListaAConfirmar {
  /** Todos os "a confirmar" do rascunho, não só os desta página. */
  total: number;
  itens: ItemAConfirmar[];
}

/** Trechos em texto simples; o trecho "\n" é a quebra de linha (`NoRascunho.trechos`). */
const textoDe = (trechos: TextoDeDispositivo['trechos']): string =>
  trechos.map((t) => t.texto).join('');

function previaDe(texto: string): string {
  const plano = texto.replace(/\s+/g, ' ').trim();
  if (plano.length <= MAX_PREVIA) return plano;
  return `${plano.slice(0, MAX_PREVIA - 1).trimEnd()}…`;
}

/**
 * Os dispositivos "a confirmar" na ordem de leitura, `quantidade` a partir de `desde` (o texto só
 * dos desta página). `total` conta todos.
 */
export async function listarAConfirmar(
  repo: Repositorio,
  versaoId: string,
  pagina: { desde?: number; quantidade?: number } = {},
): Promise<ListaAConfirmar> {
  const { norma } = await rascunhoGravado(repo, versaoId);
  const dispositivos = await dispositivosDaNorma(repo.colecao('dispositivos'), norma.id, false);
  const porId = new Map(dispositivos.map((d) => [d.id, d]));
  const pendentes = dispositivos.filter((d) => d.confianca === 'a_confirmar');
  const desde = Math.max(0, Math.floor(pagina.desde ?? 0));
  const quantidade = Math.min(Math.max(1, Math.floor(pagina.quantidade ?? ITENS_POR_PAGINA)), 200);
  const recorte = pendentes.slice(desde, desde + quantidade);
  const textos = await repo.colecao('textosDispositivo').obterPorChaves(
    '[versaoId+dispositivoId]',
    recorte.map((d) => [versaoId, d.id]),
  );
  const itens = recorte.map((d, k): ItemAConfirmar => {
    const caminho: string[] = [];
    for (let pai = d.paiId ? porId.get(d.paiId) : undefined; pai;) {
      if (pai.categoria === 'normativo' && pai.rotulo) caminho.unshift(pai.rotulo);
      pai = pai.paiId ? porId.get(pai.paiId) : undefined;
    }
    const texto = textoDe(textos[k]?.trechos ?? []);
    return {
      dispositivoId: d.id,
      endereco: d.endereco,
      tipo: d.tipo,
      ...(d.rotulo === undefined ? {} : { rotulo: d.rotulo }),
      contexto: caminho.join(' › '),
      texto,
      previa: previaDe(texto),
    };
  });
  return { total: pendentes.length, itens };
}

/** Confirma (confiança `alta`) o dispositivo e as redações de heurística do texto dele. */
async function confirmarUm(
  repo: Repositorio,
  dispositivoId: string,
  texto?: TextoDeDispositivo,
): Promise<void> {
  await repo.colecao('dispositivos').atualizar(dispositivoId, { confianca: 'alta' });
  if (texto?.redacoesAnteriores?.some((r) => !r.confirmada)) {
    await repo.colecao('textosDispositivo').atualizar(texto.id, {
      redacoesAnteriores: texto.redacoesAnteriores.map((r) => ({ ...r, confirmada: true })),
    });
  }
}

/**
 * Confirma em lote: os `ids` pedidos, ou todos os "a confirmar" quando `ids` falta. Id que já não
 * está "a confirmar" (outra aba, clique repetido) é ignorado. Devolve quantos confirmou.
 */
export async function confirmarDispositivos(
  repo: Repositorio,
  versaoId: string,
  ids?: readonly string[],
): Promise<number> {
  return repo.transacao(async () => {
    const { norma } = await rascunhoGravado(repo, versaoId);
    const pendentes = (
      await dispositivosDaNorma(repo.colecao('dispositivos'), norma.id, false)
    ).filter((d) => d.confianca === 'a_confirmar');
    const pedidos = ids ? new Set(ids) : undefined;
    const alvo = pendentes.filter((d) => !pedidos || pedidos.has(d.id));
    const textos = await todos(repo.colecao('textosDispositivo'), {
      indice: 'versaoId',
      de: versaoId,
      ate: versaoId,
    });
    const porDispositivo = new Map(textos.map((t) => [t.dispositivoId, t]));
    for (const d of alvo) await confirmarUm(repo, d.id, porDispositivo.get(d.id));
    return alvo.length;
  });
}

export interface CorrecaoDeDispositivo {
  /** O texto vigente corrigido (sem o rótulo); a quebra de linha vira trecho "\n". */
  texto: string;
  /** O rótulo corrigido ("Art. 5º", "§ 2º"); ausente, fica o que está. */
  rotulo?: string;
}

export class CorrecaoInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'CorrecaoInvalida';
  }
}

/**
 * Corrige o texto (e o rótulo) de um dispositivo do rascunho e o confirma. O texto vira trechos
 * simples: quem corrige escolhe palavras, não formatação. Notas de vigência e redações anteriores
 * ficam como estão. O endereço não muda aqui (renumerar é da 10.2).
 */
export async function corrigirDispositivo(
  repo: Repositorio,
  versaoId: string,
  dispositivoId: string,
  correcao: CorrecaoDeDispositivo,
): Promise<void> {
  const texto = correcao.texto.replace(/\r\n?/g, '\n').trim();
  if (texto.length > MAX_TEXTO) throw new CorrecaoInvalida('O texto passou do limite.');
  const rotulo = correcao.rotulo?.trim();
  if (rotulo !== undefined && rotulo.length > MAX_ROTULO) {
    throw new CorrecaoInvalida('O rótulo passou do limite.');
  }
  const trechos: TextoDeDispositivo['trechos'] = [];
  texto.split('\n').forEach((linha, k) => {
    if (k > 0) trechos.push({ texto: '\n' });
    if (linha.trim() !== '') trechos.push({ texto: linha.trim() });
  });
  await repo.transacao(async () => {
    const { norma } = await rascunhoGravado(repo, versaoId);
    const dispositivo = await repo.colecao('dispositivos').obter(dispositivoId);
    if (dispositivo?.normaId !== norma.id)
      throw new CorrecaoInvalida('Dispositivo não encontrado.');
    const [atual] = await repo
      .colecao('textosDispositivo')
      .obterPorChaves('[versaoId+dispositivoId]', [[versaoId, dispositivoId]]);
    if (!atual) throw new CorrecaoInvalida('Dispositivo sem texto neste rascunho.');
    await repo.colecao('textosDispositivo').atualizar(atual.id, { trechos });
    if (rotulo) await repo.colecao('dispositivos').atualizar(dispositivoId, { rotulo });
    await confirmarUm(repo, dispositivoId, { ...atual, trechos });
  });
}
