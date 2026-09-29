// Renumeração (regra 10, F2, 8.6): de onde veio o dispositivo, lido da nota "Renumerado…" ou
// "…transformado em…" (espécie `renumerado`, 8.5), para `renumeradoDe` (reancoragem na F6). Formas
// do corpus (colados de corpus/normas/, 29/09/2026): "(Renumerado do parágrafo único pela Lei…)",
// "(Renumerado do Parágrafo único pela…)", "(Renumerado do inciso VI, pela Emenda…)", "(Renumerado
// de § 2º para 3º pela…)", "(Parágrafo único renumerado pela Lei…)", "(Parágrafo único
// renumerado para § 1º pela…)"; ALESP em linha própria: "Inciso X renumerado para inciso XI
// pela…", "Parágrafo único transformado em § 1° pela…", "Subseção VII renumerada para VIII
// pela…". Sem a origem ("(Renumerado pela Lei nº 10.792, de 2003)", "(Parágrafo Renumerado
// pela…)"), só o status. O rótulo antigo tachado ao lado do novo (ALESP: "~~X~~ XI -") é lido em
// `rotuloAntigoTachado`.
import { romano } from './estrutura';
import type { Linha } from './linhas';

/** O endereço antigo, relativo: o estruturador o completa com o do artigo ou do pai. */
export interface Origem {
  /** Onde o segmento se pendura: no artigo (`art9.parUnico`), no pai do dispositivo (`…incVI`) ou no pai do nó. */
  relativo: 'artigo' | 'pai' | 'norma';
  segmento: string;
}

const ORDINAL = String.raw`(\d{1,3})\s?[ºo°]?(?:\s?-\s?([A-Z]))?`;
const ROMANO = String.raw`([IVXLCDM]+)(?:\s?-\s?([A-Z]))?`;

/** "parágrafo único", "§ 2º", "inciso VI", "alínea b", "art. 9º-A", "Subseção VII" → origem. */
function origemDe(frase: string): Origem | undefined {
  const f = frase.trim();
  if (/^par[áa]grafo [úu]nico(?!\p{L})/iu.test(f))
    return { relativo: 'artigo', segmento: 'parUnico' };
  let m = new RegExp(String.raw`^(?:§|par[áa]grafo)\s*${ORDINAL}`, 'iu').exec(f);
  if (m) return { relativo: 'artigo', segmento: `par${String(Number(m[1]))}${m[2] ?? ''}` };
  m = new RegExp(String.raw`^[Ii]nciso\s+${ROMANO}(?!\p{L})`, 'u').exec(f);
  if (m) return { relativo: 'pai', segmento: `inc${m[1] ?? ''}${m[2] ?? ''}` };
  m = /^al[íi]nea\s+["“]?([a-z])["”]?(?!\p{L})/iu.exec(f);
  if (m) return { relativo: 'pai', segmento: `al${(m[1] ?? '').toUpperCase()}` };
  m = new RegExp(String.raw`^art(?:igo|\.)?\s*${ORDINAL}`, 'iu').exec(f);
  if (m) return { relativo: 'norma', segmento: `art${String(Number(m[1]))}${m[2] ?? ''}` };
  m = /^(subse[cç][aã]o|se[cç][aã]o|cap[íi]tulo|t[íi]tulo)\s+([IVXLCDM]+)(?!\p{L})/iu.exec(f);
  if (m) {
    const palavra = (m[1] ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const prefixo = { subsecao: 'subsec', secao: 'sec', capitulo: 'cap', titulo: 'tit' }[palavra];
    if (prefixo) return { relativo: 'pai', segmento: `${prefixo}${String(romano(m[2] ?? ''))}` };
  }
  return undefined;
}

/**
 * Regra 10: a nota diz que o dispositivo foi renumerado (espécie `renumerado`); a origem, quando a
 * nota a traz ("do parágrafo único", "de § 2º para 3º", "Parágrafo único renumerado…").
 */
export function lerRenumeracao(texto: string): { origem?: Origem } {
  const t = texto.replace(/^[\s(-]+/, '');
  // "Renumerado do inciso VI, pela…", "Renumerado de § 2º para 3º…"
  const depois = /^renumerad[oa]s?\s+d[aeo]s?\s+(.+)$/iu.exec(t);
  if (depois?.[1]) {
    const origem = origemDe(depois[1]);
    return origem ? { origem } : {};
  }
  // "Parágrafo único renumerado…", "Inciso X renumerado para…", "Parágrafo único transformado em…"
  const antes = /^(.+?)\s+(?:renumerad|transformad)[oa]s?(?!\p{L})/iu.exec(t);
  if (antes?.[1]) {
    const origem = origemDe(antes[1]);
    return origem ? { origem } : {};
  }
  return {};
}

/**
 * Rótulo antigo tachado ao lado do novo, de fora do tachado (ALESP: "~~X~~ XI - outras…", art.
 * 134; "~~Parágrafo único~~ § 1° - …"): o texto tachado do começo da linha, se é só um rótulo.
 */
export function rotuloAntigoTachado(l: Linha): string | undefined {
  let antigo = '';
  for (const t of l.trechos) {
    if (!t.tachado) {
      if (/\S/.test(t.texto)) break;
      antigo += t.texto;
      continue;
    }
    antigo += t.texto;
  }
  const r = antigo.trim();
  return r !== '' && r.length < 40 ? r : undefined;
}

/** O rótulo antigo tachado ("X", "Parágrafo único", "§ 2º") → origem (inciso, parágrafo). */
export function origemDoRotulo(rotulo: string): Origem | undefined {
  const r = rotulo.replace(/\s*[-–.)]+\s*$/u, '').trim();
  if (/^[IVXLCDM]+(?:-[A-Z])?$/u.test(r)) return origemDe(`inciso ${r}`);
  if (/^[a-z]$/u.test(r)) return origemDe(`alínea ${r}`);
  return origemDe(r);
}
