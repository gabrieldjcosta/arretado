// Notas de vigência (regra 7), no mínimo que a 8.2 precisa: a linha feita só de notas (antes e
// depois do nome do nó, entre a epígrafe e a ementa) e as notas no fim de uma linha ("(VETADO)
// (Incluído pela Lei nº 14.197, de 2021) (Vigência)"). A 8.5 completa: notas no fim do texto do
// dispositivo, lei e ano, `notaVigenciaMaisRecente`. Tudo casa na chave (mesmos índices do texto).
import { linkEntre, type Linha } from './linhas';
import type { NotaDeVigencia, TipoNotaDeVigencia } from './rascunho';

const CHAVE_NOTA =
  /^(?:Reda[cç][aã]o|Inclu[ií]d[oa]s?|Acrescid[oa]s?|Acrescentad[oa]s?|Revogad[oa]s?|Renumerad[oa]s?|Vide|Vig[eê]ncia|Regulament[oa]|Regulamenta[cç][aã]o|Promulga[cç][aã]o|Produ[cç][aã]o de efeitos?|Convers[aã]o|Convertid[oa]|Declarad[oa]|Express[aã]o (?:substitu[ií]d|declarad|suprimid|acrescid|inclu[ií]d|revogad)[oa]|Suspens[oa]|Execu[cç][aã]o suspensa|[UÚ]ltima atualiza[cç][aã]o|NR)(?!\p{L})/iu;

/** Conteúdo de um parêntese que é nota. "(Revogado)" sozinho é texto do dispositivo, não nota. */
function ehConteudoDeNota(conteudo: string): boolean {
  const c = conteudo.trim();
  if (!CHAVE_NOTA.test(c)) return false;
  return !/^Revogad[oa]s?\.?$/iu.test(c);
}

const GRUPO = /\((?:[^()]|\([^()]*\))*\)/y;
const SOLTA = /(?:Vig[eê]ncia|Regulamento|Vide [^()]*?\d{4})(?!\p{L})/uy;
const SEPARADORES = /[\s.,;]+/y;

/** Nota da ALESP em linha própria ("- Inciso IX com redação dada pela…"). */
const NOTA_ALESP = /^- \S/;

/** Linha feita só de notas → as notas; senão `undefined`. */
export function lerNotasDaLinha(linha: Linha): NotaDeVigencia[] | undefined {
  const { chave, texto, trechos } = linha;
  if (NOTA_ALESP.test(chave))
    return [nota(texto.slice(2), linkEntre(trechos, 2, texto.length), linha.i)];
  const notas: NotaDeVigencia[] = [];
  let pos = 0;
  while (pos < chave.length) {
    SEPARADORES.lastIndex = pos;
    if (SEPARADORES.exec(chave)) pos = SEPARADORES.lastIndex;
    if (pos >= chave.length) break;
    GRUPO.lastIndex = pos;
    SOLTA.lastIndex = pos;
    const grupo = GRUPO.exec(chave);
    const solta = grupo ? null : SOLTA.exec(chave);
    const casou = grupo ?? solta;
    if (!casou) return undefined;
    if (grupo && !ehConteudoDeNota(grupo[0].slice(1, -1))) return undefined;
    const fim = pos + casou[0].length;
    notas.push(nota(texto.slice(pos, fim), linkEntre(trechos, pos, fim), linha.i));
    pos = fim;
  }
  return notas.length > 0 ? notas : undefined;
}

const JANELA = 4_000;
const NOTA_NO_FIM = /(\((?:[^()]|\([^()]*\))*\)|Vig[eê]ncia|Regulamento)[\s.,;]*$/u;

/**
 * Notas no fim de `linha.texto[inicio, fim)`: devolve onde o texto acaba e as notas, na ordem.
 * Para no primeiro parêntese que não é nota ("(VETADO)" fica no texto).
 */
export function separarNotasFinais(
  linha: Linha,
  inicio = 0,
  fim = linha.texto.length,
): { fim: number; notas: NotaDeVigencia[] } {
  const notas: NotaDeVigencia[] = [];
  let limite = fim;
  for (;;) {
    // Só o fim da linha (nota tem até 2.000 caracteres): a regex ancorada no fim não fica quadrática.
    const janela = Math.max(inicio, limite - JANELA);
    const m = NOTA_NO_FIM.exec(linha.chave.slice(janela, limite));
    const bruto = m?.[1];
    if (m === null || bruto === undefined) break;
    if (bruto.startsWith('(') && !ehConteudoDeNota(bruto.slice(1, -1))) break;
    const a = janela + m.index;
    if (a === inicio) break; // a linha inteira seria nota: quem chama usa `lerNotasDaLinha`
    notas.unshift(
      nota(
        linha.texto.slice(a, a + bruto.length),
        linkEntre(linha.trechos, a, a + bruto.length),
        linha.i,
      ),
    );
    limite = a;
  }
  return { fim: limite, notas };
}

function nota(texto: string, link: string | undefined, linha: number): NotaDeVigencia {
  return { texto, tipo: tipoDaNota(texto), linha, ...(link === undefined ? {} : { link }) };
}

/** Espécie pela palavra-chave do começo; na nota da ALESP a chave vem no meio. */
export function tipoDaNota(texto: string): TipoNotaDeVigencia {
  const t = texto.replace(/^[\s(]+/, '');
  if (/^NR\)?$/i.test(t)) return 'nr';
  if (/^vide(?!\p{L})/iu.test(t)) return 'vide';
  if (/^vig[eê]ncia/iu.test(t)) return 'vigencia';
  if (/^regulament/iu.test(t)) return 'regulamento';
  if (/reda[cç][aã]o dada|^reda[cç][aã]o/iu.test(t)) return 'redacao_dada';
  if (/inclu[ií]d|acrescid|acrescentad/iu.test(t)) return 'incluido';
  if (/renumerad/iu.test(t)) return 'renumerado';
  if (/revogad/iu.test(t)) return 'revogado';
  return 'outra';
}
