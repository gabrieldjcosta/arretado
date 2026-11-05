// O que o Caderno de Frases lê do app (a folha `folha-caderno` do mockup aprovado): as Frases ativas, da mais nova à mais
// velha, cada uma com de onde veio, quando volta e, se veio de um dispositivo da lei que ainda existe, o artigo dele com os
// trechos que o app grifa ("Ler na lei"). O mockup tem duas Frases de exemplo e as que o fluxo guarda; aqui são as da pessoa.
import { dataCivil, diferencaEmDias } from '../../../core/datas';
import type { Dispositivo, Frase, Norma } from '../../../core/modelo';
import type { Repositorio } from '../../../core/persistencia';
import { detectarDestaques } from '../../../dominios/legislacao/destaques';
import { hoje, listarFrases } from '../../../dominios/recall/servico';

/** Quantas Frases a folha mostra de cada vez: o resto vem em "Mostrar mais". */
export const FRASES_POR_PAGINA = 50;

/**
 * Quantas páginas se seguem atrás da Frase que a busca achou. A busca lê as 200 mais novas (4 páginas); passar disso é Frase
 * que já saiu da lista (arquivada depois da busca), e não se lê o caderno inteiro por ela.
 */
export const PAGINAS_ATE_A_FRASE = 5;

/** Um pedaço do texto da lei; `grifo` é o que o app grifa (um prazo, uma condição, um termo absoluto, uma pena). */
export interface PedacoDaLei {
  texto: string;
  grifo: boolean;
}

/** O "Ler na lei" de uma Frase: a citação ("LEP, art. 112, III") e o texto do dispositivo, com os grifos. */
export interface LeiDaFrase {
  citacao: string;
  pedacos: readonly PedacoDaLei[];
}

export interface FraseDoCaderno {
  id: string;
  texto: string;
  /** De onde a Frase veio: "Da lei", "De um erro"… */
  origem: string;
  /** "LEP, art. 112, III"; `undefined` se a Frase não veio de um dispositivo que ainda existe. */
  artigo: string | undefined;
  /** O que o "Ler na lei" mostra; `undefined` onde não há artigo (a Frase não leva o botão). */
  lei: LeiDaFrase | undefined;
  /** "volta amanhã". */
  volta: string;
  /** A mais nova do caderno, se foi guardada hoje (o mockup acende a borda da que acabou de entrar, e só ela). */
  nova: boolean;
}

export interface PaginaDoCaderno {
  frases: FraseDoCaderno[];
  /** `null` quando não há mais Frases depois destas. */
  proximoCursor: string | null;
}

/** De onde a Frase veio, em palavras de quem estuda (o mockup diz "Questão", "Aula", "Porteira"). */
export function rotuloDaOrigem(
  f: Pick<Frase, 'origemTipo' | 'trechoDeNota' | 'trechoDePrecedente'>,
): string {
  switch (f.origemTipo) {
    case 'erro':
      return 'De um erro';
    case 'trecho':
      if (f.trechoDeNota) return 'De um resumo';
      if (f.trechoDePrecedente) return 'De um precedente';
      return 'Da lei';
    case 'manual':
      return 'Escrita por você';
    case 'ia':
      return 'Sugerida';
  }
}

/** Quando a Frase volta na revisão. Atrasada também é "hoje": nada que soe como dívida. */
export function quandoVolta(proxima: string, dia: string): string {
  const dias = diferencaEmDias(dia, proxima);
  if (dias <= 0) return 'volta hoje';
  if (dias === 1) return 'volta amanhã';
  return `volta em ${String(dias)} dias`;
}

/** O texto da lei partido nos trechos que o app grifa (os do destaque automático do Leitor, os mesmos do passo Ler). */
export function pedacosDaLei(texto: string): PedacoDaLei[] {
  const aparado = texto.trim();
  const pedacos: PedacoDaLei[] = [];
  let pos = 0;
  for (const g of detectarDestaques(aparado)) {
    if (g.inicio > pos) pedacos.push({ texto: aparado.slice(pos, g.inicio), grifo: false });
    pedacos.push({ texto: aparado.slice(g.inicio, g.fim), grifo: true });
    pos = g.fim;
  }
  if (pos < aparado.length) pedacos.push({ texto: aparado.slice(pos), grifo: false });
  return pedacos;
}

/** "LEP, art. 112, III": a citação, com "art." em minúsculas. Sem referência (o preâmbulo), só o título curto. */
function citar(tituloCurto: string, referencia: string): string {
  if (referencia === '') return tituloCurto;
  const citacao = referencia.startsWith('Art.') ? `art.${referencia.slice(4)}` : referencia;
  return `${tituloCurto}, ${citacao}`;
}

/** Quantos pais se sobe, no máximo, procurando o artigo (a árvore da lei não é tão funda). */
const NIVEIS_ATE_O_ARTIGO = 8;

/** Lê cada dispositivo e cada norma uma vez só por página, mesmo quando várias Frases vêm do mesmo lugar. */
class Leituras {
  private readonly dispositivos = new Map<string, Promise<Dispositivo | undefined>>();
  private readonly normas = new Map<string, Promise<Norma | undefined>>();

  constructor(private readonly repo: Repositorio) {}

  dispositivo(id: string) {
    let p = this.dispositivos.get(id);
    if (!p) {
      p = this.repo.colecao('dispositivos').obter(id);
      this.dispositivos.set(id, p);
    }
    return p;
  }

  norma(id: string) {
    let p = this.normas.get(id);
    if (!p) {
      p = this.repo.colecao('normas').obter(id);
      this.normas.set(id, p);
    }
    return p;
  }

  /** "Art. 112, III": do artigo até o dispositivo, os rótulos da cadeia (como o "lido até" do Leitor). */
  async referencia(inicial: Dispositivo): Promise<string> {
    const rotulos: string[] = [];
    let atual: Dispositivo | undefined = inicial;
    for (let nivel = 0; atual && nivel < NIVEIS_ATE_O_ARTIGO; nivel++) {
      if (atual.rotulo) rotulos.unshift(atual.rotulo);
      if (atual.tipo === 'artigo') return rotulos.join(', ');
      atual = atual.paiId === undefined ? undefined : await this.dispositivo(atual.paiId);
    }
    return inicial.rotulo ?? '';
  }

  /** O texto vigente do dispositivo, sem o que está tachado; vazio se a norma não tem versão vigente ou o texto não está. */
  async texto(norma: Norma, dispositivoId: string): Promise<string> {
    if (norma.versaoVigenteId === undefined) return '';
    const [achado] = await this.repo
      .colecao('textosDispositivo')
      .obterPorChaves('[versaoId+dispositivoId]', [[norma.versaoVigenteId, dispositivoId]]);
    return (achado?.trechos ?? [])
      .filter((t) => !t.tachado)
      .map((t) => t.texto)
      .join('');
  }
}

/**
 * O texto como a lei o imprime: o inciso começa com o numeral e o travessão ("III – …", como no mockup); a alínea e o parágrafo,
 * com o rótulo ("a) …", "§ 1º …"); o artigo e o resto, só com o texto (a citação acima do texto já diz "art. 112").
 */
export function comORotulo(d: Pick<Dispositivo, 'tipo' | 'rotulo'>, texto: string): string {
  if (!d.rotulo || texto === '') return texto;
  switch (d.tipo) {
    case 'inciso':
      return `${d.rotulo} – ${texto}`;
    case 'alinea':
    case 'paragrafo':
    case 'item':
      return `${d.rotulo} ${texto}`;
    default:
      return texto;
  }
}

/** O artigo de onde a Frase veio e o texto dele; `undefined` se o dispositivo ou a norma não existem mais. */
async function leiDaFrase(
  leituras: Leituras,
  frase: Frase,
): Promise<{ artigo: string; lei: LeiDaFrase | undefined } | undefined> {
  if (!frase.trecho) return undefined;
  const dispositivo = await leituras.dispositivo(frase.trecho.dispositivoId);
  if (!dispositivo) return undefined;
  const norma = await leituras.norma(dispositivo.normaId);
  if (!norma) return undefined;
  const artigo = citar(norma.tituloCurto, await leituras.referencia(dispositivo));
  const texto = comORotulo(dispositivo, (await leituras.texto(norma, dispositivo.id)).trim());
  return {
    artigo,
    lei: texto === '' ? undefined : { citacao: artigo, pedacos: pedacosDaLei(texto) },
  };
}

/** Uma página do Caderno: as Frases ativas por recência, a partir de `cursor` (`null` = do começo). */
export async function carregarCaderno(
  repo: Repositorio,
  cursor: string | null = null,
  limite: number = FRASES_POR_PAGINA,
): Promise<PaginaDoCaderno> {
  const pagina = await listarFrases(repo, {}, cursor, limite);
  const dia = hoje(repo);
  const leituras = new Leituras(repo);
  const frases = await Promise.all(
    pagina.itens.map(async (f, indice): Promise<FraseDoCaderno> => {
      // Um elo quebrado (norma apagada, dispositivo que sumiu) deixa a Frase sem artigo; ela continua na lista.
      const fonte = await leiDaFrase(leituras, f).catch(() => undefined);
      return {
        id: f.id,
        texto: f.texto,
        origem: rotuloDaOrigem(f),
        artigo: fonte?.artigo,
        lei: fonte?.lei,
        volta: quandoVolta(f.proximaRevisao, dia),
        // Só a mais nova do caderno acende a borda: as outras guardadas hoje já não são "a que acabou de entrar".
        nova: cursor === null && indice === 0 && dataCivil(new Date(f.criadoEm)) === dia,
      };
    }),
  );
  return { frases, proximoCursor: pagina.proximoCursor };
}

export interface CargaDoCaderno {
  frases: FraseDoCaderno[];
  /** `null` quando não há mais Frases além das que já estão na lista. */
  cursor: string | null;
}

/**
 * A primeira carga da folha: a primeira página; com `foco`, segue pelas páginas até achar essa Frase (a busca pode apontar uma das
 * mais antigas), no máximo `paginas`. As que vieram pelo caminho ficam na lista, e `cursor` diz de onde "Mostrar mais" continua.
 */
export async function carregarPrimeiras(
  repo: Repositorio,
  foco?: string,
  { limite = FRASES_POR_PAGINA, paginas = PAGINAS_ATE_A_FRASE } = {},
): Promise<CargaDoCaderno> {
  let pagina = await carregarCaderno(repo, null, limite);
  const frases = [...pagina.frases];
  for (
    let lidas = 1;
    foco !== undefined &&
    lidas < paginas &&
    pagina.proximoCursor !== null &&
    !frases.some((f) => f.id === foco);
    lidas++
  ) {
    pagina = await carregarCaderno(repo, pagina.proximoCursor, limite);
    frases.push(...pagina.frases);
  }
  return { frases, cursor: pagina.proximoCursor };
}
