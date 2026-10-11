// Edição integral do rascunho (F2, 10.4; Parte 2 §10.6, "Editor de rascunho/correção", nível
// integral, e "Inserção manual"): a parte pura. A árvore gravada vira um texto simples, uma linha
// por dispositivo começando pelo rótulo ("Art. 5º …", "§ 1º …", "I - …", "a) …", "CAPÍTULO I" e o
// nome na linha de baixo); quem edita muda o texto à vontade e, ao salvar, o texto é reorganizado
// em linhas de edição (as da 10.2), que `reconstruir` transforma em árvore.
//
// Regra de preservação (o risco desta etapa é perder o que já foi conferido):
// 1. A identidade de um dispositivo é a LINHA do texto, não o endereço. O texto salvo é comparado
//    com o texto de partida, linha a linha (maior subsequência comum, `casarLinhas`): o dispositivo
//    cujas linhas ficaram todas iguais é mantido como estava (id, texto com formatação e links,
//    notas de vigência, redações anteriores, confiança, situação e número).
// 2. Linha mudada no mesmo lugar (trecho em que saiu e entrou o mesmo número de linhas) continua
//    sendo o mesmo dispositivo: o texto e, se o rótulo mudou, o número são os novos; notas e
//    redações seguem com ele.
// 3. Linha nova que não ocupou o lugar de outra procura um dispositivo que saiu do texto: primeiro
//    o do mesmo tipo e número (o artigo que mudou de lugar), depois o do mesmo tipo e mesmo texto
//    (o que foi renumerado e mudado de lugar). Achou, herda a identidade, como em 2.
// 4. Confiança: fica a que era quando o tipo e o texto não mudaram (só o número ou o lugar);
//    texto ou tipo mudado volta a "a confirmar". O que é novo nasce "a confirmar".
// 5. Numeração: o sistema nunca renumera o que ninguém tocou. O número vem do rótulo escrito; a
//    linha cujo número mudou leva o endereço novo, e os filhos o acompanham (`reconstruir`).
//    Número repetido não se perde nem se funde: vira conflito na publicação, para corrigir.
// 6. O dispositivo cujas linhas foram apagadas sai do rascunho; a tela avisa antes quantos já
//    estavam conferidos (`ResumoIntegral`).
//
// Notas de vigência e redações anteriores não aparecem no texto: seguem com o dispositivo.
import type { TipoDispositivo } from '../../core/modelo';
import { lerInicioDeArtigo } from './artigo';
import { lerRotuloDeDispositivo } from './dispositivo';
import {
  ESTRUTURAIS,
  EdicaoInvalida,
  textoDosTrechos,
  trechosSimples,
  type LinhaDeEdicao,
  type NomeDoNo,
} from './edicao-arvore';
import { lerRotuloEstrutural } from './estrutura';
import type { Linha } from './linhas';
import { chaveDeCasamento } from './normalizacao';

/** Linha do texto integral e de qual linha de edição ela saiu. */
export interface LinhaDoTexto {
  texto: string;
  /** Índice da linha de edição (`LinhaDeEdicao`) dona desta linha. */
  dono: number;
  /** A primeira linha (com o rótulo), a continuação do texto ou o nome do nó estrutural. */
  papel: 'cabeca' | 'continuacao' | 'nome';
}

/** O que a reorganização fez; a tela mostra e avisa antes de apagar o que já foi conferido. */
export interface ResumoIntegral {
  /** Linhas de edição (o nó estrutural e o nome contam como uma) que ficaram exatamente como estavam. */
  mantidos: number;
  /** As que continuaram (mesma identidade) com texto, tipo, número ou lugar mudado. */
  alterados: number;
  novos: number;
  /** As que saíram do texto (o dispositivo sai do rascunho). */
  removidos: number;
  /** Das que saíram, as que já não estavam "a confirmar". */
  conferidosRemovidos: number;
  /** Das alteradas, as que estavam conferidas e voltaram a "a confirmar". */
  conferidosAlterados: number;
}

/** Os que levam o nome na linha de baixo. */
const COM_NOME: ReadonlySet<TipoDispositivo> = new Set([...ESTRUTURAIS, 'bloco']);
/** Texto bruto ou sem rótulo de dispositivo: a linha de dentro nunca vira outro dispositivo. */
const TEXTO_CORRIDO: ReadonlySet<TipoDispositivo> = new Set([
  'anexo',
  'preambulo',
  'ementa',
  'sumula',
  'tese',
]);
/** Os que o rótulo escrito reconhece (os demais só se mantêm pela linha). */
const RECONHECIVEIS: ReadonlySet<TipoDispositivo> = new Set([
  ...ESTRUTURAIS,
  'artigo',
  'caput',
  'paragrafo',
  'inciso',
  'alinea',
  'item',
  'nome',
]);

/** Linha do texto que vale como vazia (dispositivo sem rótulo nem texto). */
export const LINHA_SEM_TEXTO = '(sem texto)';
/** Limite do texto inteiro (a CF compilada passa pouco de 1 milhão de caracteres). */
const MAX_TEXTO_INTEGRAL = 5_000_000;
/** Cabe no `TextoLongo` do modelo. */
const MAX_TEXTO_DISPOSITIVO = 200_000;
/** Rubrica: no corpus, a mais longa tem 110 caracteres (como em `artigo.ts`). */
const MAX_RUBRICA = 160;

// ── Texto ───────────────────────────────────────────────────────────────────

const linhasDe = (texto: string): string[] =>
  texto
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l !== '');

/** O rótulo escrito antes do texto, como no texto da lei. */
function prefixoDe(l: Pick<LinhaDeEdicao, 'tipo' | 'rotulo'>): string {
  if (!l.rotulo) return '';
  return l.tipo === 'inciso' ? `${l.rotulo} - ` : `${l.rotulo} `;
}

const corpoDe = (l: LinhaDeEdicao): string[] => linhasDe(textoDosTrechos(l.trechos));
const nomeDe = (l: LinhaDeEdicao): string[] =>
  l.nome ? linhasDe(textoDosTrechos(l.nome.trechos)) : [];

/** O texto integral, linha a linha, com a dona de cada linha. */
export function textoIntegral(linhas: readonly LinhaDeEdicao[]): LinhaDoTexto[] {
  const saida: LinhaDoTexto[] = [];
  linhas.forEach((l, dono) => {
    const [primeira = '', ...resto] = corpoDe(l);
    const cabeca = `${prefixoDe(l)}${primeira}`.trim();
    saida.push({ texto: cabeca === '' ? LINHA_SEM_TEXTO : cabeca, dono, papel: 'cabeca' });
    for (const texto of resto) saida.push({ texto, dono, papel: 'continuacao' });
    for (const texto of nomeDe(l)) saida.push({ texto, dono, papel: 'nome' });
  });
  return saida;
}

export const juntarTexto = (linhas: readonly LinhaDoTexto[]): string =>
  linhas.map((l) => l.texto).join('\n');

// ── Comparação linha a linha ────────────────────────────────────────────────

/** Acima disso, a tabela da subsequência comum não é montada: antes, âncoras de linha única. */
const LIMITE_TABELA = 4_000_000;

/**
 * Para cada linha nova, a antiga igual a ela numa maior subsequência comum (−1 se não há).
 * Corta o começo e o fim iguais; o meio pequeno vai pela tabela clássica; o grande é dividido
 * pelas linhas que aparecem uma vez só dos dois lados (diff "paciência").
 */
export function casarLinhas(antigas: readonly string[], novas: readonly string[]): Int32Array {
  const par = new Int32Array(novas.length).fill(-1);
  const pilha: [number, number, number, number][] = [[0, antigas.length, 0, novas.length]];
  for (let faixa = pilha.pop(); faixa; faixa = pilha.pop()) {
    let [a0, a1, b0, b1] = faixa;
    while (a0 < a1 && b0 < b1 && antigas[a0] === novas[b0]) par[b0++] = a0++;
    while (a0 < a1 && b0 < b1 && antigas[a1 - 1] === novas[b1 - 1]) par[--b1] = --a1;
    if (a0 === a1 || b0 === b1) continue;
    if ((a1 - a0) * (b1 - b0) <= LIMITE_TABELA) {
      porTabela(antigas, novas, a0, a1, b0, b1, par);
      continue;
    }
    const ancoras = ancorasUnicas(antigas, novas, a0, a1, b0, b1);
    let a = a0;
    let b = b0;
    for (const [ia, ib] of ancoras) {
      par[ib] = ia;
      pilha.push([a, ia, b, ib]);
      a = ia + 1;
      b = ib + 1;
    }
    if (ancoras.length > 0) pilha.push([a, a1, b, b1]);
  }
  return par;
}

function porTabela(
  antigas: readonly string[],
  novas: readonly string[],
  a0: number,
  a1: number,
  b0: number,
  b1: number,
  par: Int32Array,
): void {
  const n = a1 - a0;
  const m = b1 - b0;
  const largura = m + 1;
  // comp[i][j] = maior subsequência comum de antigas[a0+i..] e novas[b0+j..].
  const comp = new Uint32Array((n + 1) * largura);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      comp[i * largura + j] =
        antigas[a0 + i] === novas[b0 + j]
          ? (comp[(i + 1) * largura + j + 1] ?? 0) + 1
          : Math.max(comp[(i + 1) * largura + j] ?? 0, comp[i * largura + j + 1] ?? 0);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (antigas[a0 + i] === novas[b0 + j]) {
      par[b0 + j] = a0 + i;
      i++;
      j++;
    } else if ((comp[(i + 1) * largura + j] ?? 0) >= (comp[i * largura + j + 1] ?? 0)) i++;
    else j++;
  }
}

/** Pares de linhas que aparecem uma vez só em cada lado, na maior sequência crescente. */
function ancorasUnicas(
  antigas: readonly string[],
  novas: readonly string[],
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): [number, number][] {
  const contar = (lista: readonly string[], de: number, ate: number) => {
    const vezes = new Map<string, number>();
    for (let k = de; k < ate; k++) {
      const t = lista[k] ?? '';
      vezes.set(t, (vezes.get(t) ?? 0) === 0 ? k + 1 : -1);
    }
    return vezes; // posição + 1 se única, −1 se repetida
  };
  const emA = contar(antigas, a0, a1);
  const emB = contar(novas, b0, b1);
  const pares: [number, number][] = [];
  for (const [texto, pb] of emB) {
    const pa = emA.get(texto);
    if (pb > 0 && pa !== undefined && pa > 0) pares.push([pa - 1, pb - 1]);
  }
  pares.sort((x, y) => x[1] - y[1]);
  // Maior sequência crescente das posições antigas (paciência).
  const topos: number[] = [];
  const anterior = new Int32Array(pares.length).fill(-1);
  pares.forEach(([ia], k) => {
    let baixo = 0;
    let alto = topos.length;
    while (baixo < alto) {
      const meio = (baixo + alto) >> 1;
      if ((pares[topos[meio] ?? 0]?.[0] ?? 0) < ia) baixo = meio + 1;
      else alto = meio;
    }
    if (baixo > 0) anterior[k] = topos[baixo - 1] ?? -1;
    topos[baixo] = k;
  });
  const saida: [number, number][] = [];
  for (let k = topos[topos.length - 1] ?? -1; k >= 0; k = anterior[k] ?? -1) {
    const p = pares[k];
    if (p) saida.push(p);
  }
  return saida.reverse();
}

/**
 * Linha mudada no mesmo lugar: no trecho entre duas linhas iguais em que saíram e entraram o
 * mesmo número de linhas, a k-ésima nova ocupa o lugar da k-ésima antiga.
 */
function lugaresOcupados(par: Int32Array, totalAntigas: number): Int32Array {
  const lugar = new Int32Array(par.length).fill(-1);
  let j = 0;
  let ultimaAntiga = -1;
  while (j < par.length) {
    if ((par[j] ?? -1) >= 0) {
      ultimaAntiga = par[j] ?? -1;
      j++;
      continue;
    }
    let fim = j;
    while (fim < par.length && (par[fim] ?? -1) < 0) fim++;
    const proximaAntiga = fim < par.length ? (par[fim] ?? totalAntigas) : totalAntigas;
    if (proximaAntiga - ultimaAntiga - 1 === fim - j) {
      for (let k = 0; k < fim - j; k++) lugar[j + k] = ultimaAntiga + 1 + k;
    }
    j = fim;
  }
  return lugar;
}

// ── Leitura do rótulo ───────────────────────────────────────────────────────

interface Lido {
  tipo: TipoDispositivo;
  rotulo: string;
  segmento: string;
  /** O texto depois do rótulo. */
  resto: string;
}

/** "1o" e "1°" como "1º": quem digita não acha o ordinal no teclado. */
const comOrdinal = (texto: string) =>
  texto.replace(/°/g, 'º').replace(/(\d) ?o(?=$|[\s.\-–—:,;)])/u, '$1º');

/** O rótulo no começo da linha digitada (artigo, nó estrutural, parágrafo a item). */
export function lerLinhaDigitada(texto: string): Lido | undefined {
  const t = comOrdinal(texto);
  const chave = chaveDeCasamento(t);
  const artigo = lerInicioDeArtigo(chave);
  if (artigo) {
    return {
      tipo: 'artigo',
      rotulo: artigo.rotulo,
      segmento: artigo.endereco,
      resto: t.slice(artigo.fim).trim(),
    };
  }
  const linha: Linha = { i: 0, trechos: [{ texto: t }], texto: t, chave, tachada: false };
  const estrutural = lerRotuloEstrutural(linha);
  if (estrutural) {
    return {
      tipo: estrutural.tipo,
      rotulo: estrutural.rotulo.toUpperCase(),
      segmento: estrutural.segmento,
      resto: t.slice(estrutural.resto).trim(),
    };
  }
  const outro = lerRotuloDeDispositivo(linha);
  if (outro) {
    return {
      tipo: outro.tipo,
      rotulo: outro.rotulo,
      segmento: outro.segmento,
      resto: t.slice(outro.fim).trim(),
    };
  }
  return undefined;
}

const caixaAlta = (texto: string) => /\p{Lu}/u.test(texto) && texto === texto.toUpperCase();

/** Rubrica: linha curta, sem ponto final, antes de artigo, parágrafo ou inciso (regra 4). */
function pareceRubrica(texto: string, seguinte: string | undefined): boolean {
  if (seguinte === undefined || texto.length > MAX_RUBRICA) return false;
  if (/[.;:,]$/.test(texto) || !/^\p{Lu}/u.test(texto)) return false;
  const lido = lerLinhaDigitada(seguinte);
  return lido?.tipo === 'artigo' || lido?.tipo === 'paragrafo' || lido?.tipo === 'inciso';
}

// ── Reorganizar ─────────────────────────────────────────────────────────────

interface Unidade {
  /** A linha de edição antiga de quem esta herda a identidade. */
  dono?: number;
  tipo: TipoDispositivo;
  rotulo?: string;
  /** Vazio: o sistema numera. */
  segmento: string;
  texto: string[];
  nome: string[];
  /** As linhas antigas iguais que compõem esta (para saber se ficou intacta). */
  iguais: number[];
  /** Alguma linha desta entrou sem ser igual a uma antiga. */
  mexida: boolean;
}

/** O começo da linha que repete o rótulo antigo, para tirá-lo do texto. */
function semPrefixo(texto: string, antiga: LinhaDeEdicao): string | undefined {
  const prefixo = prefixoDe(antiga).trimEnd();
  if (prefixo === '' || !texto.startsWith(prefixo)) return undefined;
  const resto = texto.slice(prefixo.length);
  if (resto !== '' && !/^\s/.test(resto)) return undefined;
  return resto.trim();
}

/** A unidade da linha que ocupou o lugar da cabeça de `antiga` (regra 2). */
function noLugarDe(texto: string, dono: number, antiga: LinhaDeEdicao): Unidade {
  const base = { dono, texto: [] as string[], nome: [] as string[], iguais: [], mexida: true };
  const mesmoRotulo = semPrefixo(texto, antiga);
  const lido = RECONHECIVEIS.has(antiga.tipo) ? lerLinhaDigitada(texto) : undefined;
  if (lido && !(lido.tipo === antiga.tipo && lido.segmento === antiga.segmento)) {
    return {
      ...base,
      tipo: lido.tipo,
      rotulo: lido.rotulo,
      segmento: lido.segmento,
      texto: lido.resto === '' ? [] : [lido.resto],
    };
  }
  const corpo = mesmoRotulo ?? lido?.resto ?? (texto === LINHA_SEM_TEXTO ? '' : texto);
  return {
    ...base,
    tipo: antiga.tipo,
    ...(antiga.rotulo === undefined ? {} : { rotulo: antiga.rotulo }),
    segmento: antiga.segmento,
    texto: corpo === '' ? [] : [corpo],
  };
}

const iguais = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, k) => x === b[k]);

/**
 * Reorganiza o texto digitado em linhas de edição, preservando o que não mudou (regras no topo
 * do arquivo). `antigas` são as linhas da árvore gravada (`linhasDoRascunho`), na ordem do texto.
 */
export function reorganizar(
  antigas: readonly LinhaDeEdicao[],
  texto: string,
  novoId: () => string,
): { linhas: LinhaDeEdicao[]; resumo: ResumoIntegral } {
  if (texto.length > MAX_TEXTO_INTEGRAL) throw new EdicaoInvalida('O texto passou do limite.');
  const novas = linhasDe(texto);
  if (novas.length === 0) {
    throw new EdicaoInvalida(
      'O texto ficou vazio. Para apagar o rascunho inteiro, use "Descartar rascunho".',
    );
  }
  const velhas = textoIntegral(antigas);
  const par = casarLinhas(
    velhas.map((l) => l.texto),
    novas,
  );
  const lugar = lugaresOcupados(par, velhas.length);
  const unidades: Unidade[] = [];
  let atual: Unidade | undefined;
  const abrir = (u: Unidade) => {
    unidades.push(u);
    atual = u;
  };
  const continuar = (linha: string, igual?: number) => {
    if (!atual) {
      // Texto antes de qualquer rótulo: vira um artigo, numerado pelo sistema.
      abrir({ tipo: 'artigo', segmento: '', texto: [], nome: [], iguais: [], mexida: true });
    }
    if (!atual) return;
    if (linha !== LINHA_SEM_TEXTO) atual.texto.push(linha);
    if (igual === undefined) atual.mexida = true;
    else atual.iguais.push(igual);
  };
  const aceitaNome = (linha: string) =>
    atual !== undefined &&
    COM_NOME.has(atual.tipo) &&
    atual.texto.length === 0 &&
    (atual.nome.length === 0 || caixaAlta(linha));

  novas.forEach((linha, j) => {
    const igual = par[j] ?? -1;
    const velha = igual >= 0 ? velhas[igual] : undefined;
    // 1. Linha igual a uma antiga: segue a dona dela.
    if (velha) {
      const antiga = antigas[velha.dono];
      if (velha.papel === 'cabeca' && antiga) {
        const corpo = corpoDe(antiga)[0];
        abrir({
          dono: velha.dono,
          tipo: antiga.tipo,
          ...(antiga.rotulo === undefined ? {} : { rotulo: antiga.rotulo }),
          segmento: antiga.segmento,
          texto: corpo === undefined ? [] : [corpo],
          nome: [],
          iguais: [igual],
          mexida: false,
        });
        return;
      }
      if (velha.papel === 'nome' && aceitaNome(linha) && atual) {
        atual.nome.push(linha);
        atual.iguais.push(igual);
        return;
      }
      continuar(linha, igual);
      return;
    }
    // 2. Linha mudada no lugar de outra.
    const ocupada = (lugar[j] ?? -1) >= 0 ? velhas[lugar[j] ?? 0] : undefined;
    const antigaNoLugar = ocupada ? antigas[ocupada.dono] : undefined;
    if (ocupada && antigaNoLugar) {
      if (ocupada.papel === 'cabeca') {
        abrir(noLugarDe(linha, ocupada.dono, antigaNoLugar));
        return;
      }
      if (ocupada.papel === 'nome' && aceitaNome(linha) && atual) {
        atual.nome.push(linha);
        atual.mexida = true;
        return;
      }
      if (TEXTO_CORRIDO.has(antigaNoLugar.tipo) && atual?.dono === ocupada.dono) {
        continuar(linha);
        return;
      }
    }
    // 3. Linha nova: pelo rótulo escrito.
    if (atual && atual.tipo === 'anexo') {
      continuar(linha);
      return;
    }
    const lido = lerLinhaDigitada(linha);
    if (lido) {
      abrir({
        tipo: lido.tipo,
        rotulo: lido.rotulo,
        segmento: lido.segmento,
        texto: lido.resto === '' ? [] : [lido.resto],
        nome: [],
        iguais: [],
        mexida: true,
      });
      return;
    }
    if (aceitaNome(linha) && atual) {
      atual.nome.push(linha);
      atual.mexida = true;
      return;
    }
    if (pareceRubrica(linha, novas[j + 1])) {
      abrir({ tipo: 'nome', segmento: '', texto: [linha], nome: [], iguais: [], mexida: true });
      return;
    }
    continuar(linha);
  });

  // Regra 3: quem ficou sem dono procura um dispositivo que saiu do texto.
  const reclamados = new Set<number>();
  for (const u of unidades) if (u.dono !== undefined) reclamados.add(u.dono);
  const corpos = antigas.map((a) => corpoDe(a).join('\n'));
  const procurar = (
    chaveAntiga: (a: LinhaDeEdicao, k: number) => string | undefined,
    chave: (u: Unidade) => string | undefined,
  ) => {
    const livres = new Map<string, number[]>();
    antigas.forEach((a, k) => {
      const c = reclamados.has(k) ? undefined : chaveAntiga(a, k);
      if (c === undefined) return;
      const fila = livres.get(c);
      if (fila) fila.push(k);
      else livres.set(c, [k]);
    });
    for (const u of unidades) {
      if (u.dono !== undefined) continue;
      const c = chave(u);
      const fila = c === undefined ? undefined : livres.get(c);
      const achado = fila?.shift();
      if (achado !== undefined) {
        u.dono = achado;
        reclamados.add(achado);
      }
    }
  };
  procurar(
    (a) => (a.segmento === '' ? undefined : `${a.tipo}|${a.segmento}`),
    (u) => (u.segmento === '' ? undefined : `${u.tipo}|${u.segmento}`),
  );
  procurar(
    (a, k) => (corpos[k] ? `${a.tipo}|${corpos[k]}` : undefined),
    (u) => (u.texto.length > 0 ? `${u.tipo}|${u.texto.join('\n')}` : undefined),
  );
  const linhasDoDono = new Map<number, number[]>();
  velhas.forEach((v, k) => {
    const lista = linhasDoDono.get(v.dono);
    if (lista) lista.push(k);
    else linhasDoDono.set(v.dono, [k]);
  });

  const resumo: ResumoIntegral = {
    mantidos: 0,
    alterados: 0,
    novos: 0,
    removidos: 0,
    conferidosRemovidos: 0,
    conferidosAlterados: 0,
  };
  const linhas = unidades.map((u) => {
    const antiga = u.dono === undefined ? undefined : antigas[u.dono];
    const corpo = u.texto.join('\n');
    if (corpo.length > MAX_TEXTO_DISPOSITIVO || u.nome.join('\n').length > MAX_TEXTO_DISPOSITIVO) {
      throw new EdicaoInvalida(
        `O texto de ${u.rotulo ?? 'uma linha'} passou do limite; divida-o em mais linhas.`,
      );
    }
    if (!antiga) {
      resumo.novos++;
      return linhaNova(u, novoId);
    }
    const linhasDaAntiga = (u.dono === undefined ? undefined : linhasDoDono.get(u.dono)) ?? [];
    if (!u.mexida && iguais(u.iguais.map(String), linhasDaAntiga.map(String))) {
      resumo.mantidos++;
      return antiga;
    }
    resumo.alterados++;
    const herdada = herdar(antiga, u, novoId);
    if (antiga.confianca !== 'a_confirmar' && herdada.confianca === 'a_confirmar') {
      resumo.conferidosAlterados++;
    }
    return herdada;
  });
  antigas.forEach((a, k) => {
    if (reclamados.has(k)) return;
    resumo.removidos++;
    if (a.confianca !== 'a_confirmar') resumo.conferidosRemovidos++;
  });
  return { linhas, resumo };
}

function linhaNova(u: Unidade, novoId: () => string): LinhaDeEdicao {
  const comNome = COM_NOME.has(u.tipo);
  return {
    id: novoId(),
    tipo: u.tipo,
    ...(u.rotulo === undefined || u.segmento === '' ? {} : { rotulo: u.rotulo }),
    segmento: u.tipo === 'nome' ? '' : u.segmento,
    status: 'vigente',
    confianca: 'a_confirmar',
    trechos: trechosSimples(u.texto.join('\n')),
    notas: [],
    redacoes: [],
    ...(comNome && u.nome.length > 0
      ? {
          nome: {
            id: novoId(),
            confianca: 'a_confirmar',
            trechos: trechosSimples(u.nome.join('\n')),
            notas: [],
            redacoes: [],
          },
        }
      : {}),
  };
}

/** Situação do texto que volta a ter conteúdo depois de revogado ou vetado. */
const SO_ESQUELETO = /^\(?\s*(revogad[oa]|vetad[oa])/iu;

/** A linha que continua o dispositivo antigo, com o que mudou (regras 2 a 4). */
function herdar(antiga: LinhaDeEdicao, u: Unidade, novoId: () => string): LinhaDeEdicao {
  const textoIgual = iguais(u.texto, corpoDe(antiga));
  const tipoIgual = u.tipo === antiga.tipo;
  const comNome = COM_NOME.has(u.tipo);
  let nome: NomeDoNo | undefined;
  if (comNome) {
    if (iguais(u.nome, nomeDe(antiga)) && antiga.nome) nome = antiga.nome;
    else if (u.nome.length > 0) {
      nome = {
        ...(antiga.nome ?? { id: novoId(), notas: [], redacoes: [] }),
        confianca: 'a_confirmar',
        trechos: trechosSimples(u.nome.join('\n')),
      };
    }
  }
  const mesmoNumero = tipoIgual && u.segmento === antiga.segmento;
  const corpo = u.texto.join('\n');
  const status =
    !textoIgual &&
    (antiga.status === 'revogado' || antiga.status === 'vetado') &&
    corpo !== '' &&
    !SO_ESQUELETO.test(corpo)
      ? 'vigente'
      : antiga.status;
  const rotulo = mesmoNumero ? antiga.rotulo : u.segmento === '' ? undefined : u.rotulo;
  const saida: LinhaDeEdicao = {
    ...antiga,
    tipo: u.tipo,
    segmento: mesmoNumero ? antiga.segmento : u.tipo === 'nome' ? '' : u.segmento,
    status,
    confianca: textoIgual && tipoIgual ? antiga.confianca : 'a_confirmar',
    trechos: textoIgual ? antiga.trechos : trechosSimples(corpo),
  };
  if (rotulo === undefined) delete saida.rotulo;
  else saida.rotulo = rotulo;
  if (nome) saida.nome = nome;
  else delete saida.nome;
  return saida;
}
