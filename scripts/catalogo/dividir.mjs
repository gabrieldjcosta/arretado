// Divide os itens do catálogo em que a extração do edital juntou vários assuntos num só.
// Puro e idempotente: rodar sobre o resultado devolve o mesmo resultado.

/** Item maior que isto é candidato à divisão por frase. */
const LIMITE_LONGO = 400;
/** Sem frases para quebrar, item maior que isto é quebrado em "; " (nunca antes de subitem "a)", "b)"). */
const LIMITE_DE_LISTA = 900;
const MINIMO_DO_TRECHO = 300;
/** Um assunto fecha quando junta ao menos isto (títulos curtos como "Poder Executivo." ficam com o seguinte). */
const MINIMO_DO_ASSUNTO = 90;

const ABREVIATURAS = new Set([
  'art',
  'arts',
  'nº',
  'n',
  'no',
  'inc',
  'incs',
  'al',
  'ex',
  'v',
  'vs',
  'dec',
  'min',
  'rel',
  'p',
  'pp',
  'ss',
  'cap',
  'cód',
  'par',
  '§',
  'cf',
  'obs',
  'ed',
  'dr',
  'dra',
  'sr',
  'esp',
  'aprox',
  'fl',
  'fls',
  'tít',
  'seç',
  'sec',
  'op',
  'cit',
  'apud',
  'etc',
  'ver',
  'vol',
  'ef',
  'inc',
  'prof',
  'lc',
  'rs',
  'sp',
]);

const ANEXO = /^anexo\b/i;
const CABECALHO_DE_PAGINA = [
  /D\.?O\.?\s+PUBLICA[ÇC][ÕO]ES DE TERCEIROS\s+\S+-?\s*FEIRA,?\s+\d+\s*-\s*\S+\s*-\s*\d{4}/gi,
  /Edital N[ºo°]\s*[\d./-]+\w*(?:-\w+)?\s+retifica[çc][ãa]o\s*\(\d+\)\s*SEI\s*[\d./-]+\s*\/\s*pg\.\s*\d+/gi,
];

const colapsar = (s) => s.replace(/\s+/g, ' ').trim();

export function limparRuido(assunto) {
  let t = assunto;
  for (const re of CABECALHO_DE_PAGINA) t = t.replace(re, ' ');
  return colapsar(t);
}

/** Item que não é assunto de estudo: anexo do edital (modelo de declaração, formulário). */
export function ehAnexo(assunto) {
  const t = colapsar(assunto);
  return ANEXO.test(t) && /(declara|formul[áa]rio|modelo|candidato)/i.test(t.slice(0, 160));
}

/** Frases do texto: quebra em ". " antes de maiúscula/aspas, salvo depois de abreviatura, número solto ou sigla de uma letra. */
function frases(texto) {
  const partes = [];
  let inicio = 0;
  const re = /\.\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ“"(])/g;
  for (let m = re.exec(texto); m; m = re.exec(texto)) {
    const antes = texto.slice(inicio, m.index);
    const palavra = (antes.match(/(\S+)$/)?.[1] ?? '').toLowerCase();
    if (ABREVIATURAS.has(palavra) || /^\d+$/.test(palavra) || palavra.length === 1) continue;
    partes.push(texto.slice(inicio, m.index + 1));
    inicio = m.index + m[0].length;
  }
  partes.push(texto.slice(inicio));
  return partes.map(colapsar).filter(Boolean);
}

const partesDoCodigo = (c) => c.split('.').map(Number);
const compararCodigos = (x, y) => {
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1);
    if (d) return d;
  }
  return 0;
};

/**
 * Marcadores "18. Poder Legislativo" ou "17.6. Embargos" embutidos no texto, em sequência crescente a partir do
 * número do item (o próximo marcador fica no mesmo grupo de cima ou no seguinte: 17.5 → 17.6, 18, 18.1).
 */
function porMarcadores(numero, texto) {
  if (!/^\d+(\.\d+)*$/.test(numero ?? '')) return null;
  const re = /(?<=[.;:)\s])(\d{1,3}(?:\.\d{1,3})*)\.\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-z])/g;
  const achados = [];
  let anterior = partesDoCodigo(numero);
  for (let m = re.exec(texto); m; m = re.exec(texto)) {
    const atual = partesDoCodigo(m[1]);
    const mesmoGrupo = atual[0] === anterior[0];
    const proximoGrupo = atual[0] === anterior[0] + 1;
    const simples = atual.length === 1;
    // marcador simples só vale como o número seguinte exato; composto, qualquer um maior no grupo atual ou seguinte
    if (
      simples
        ? atual[0] !== anterior[0] + 1
        : !(mesmoGrupo || proximoGrupo) || compararCodigos(atual, anterior) <= 0
    )
      continue;
    achados.push({ codigo: m[1], de: m.index, ate: m.index + m[0].length });
    anterior = atual;
  }
  if (!achados.length) return null;
  const pedacos = [{ numero, texto: texto.slice(0, achados[0].de) }];
  achados.forEach((a, i) =>
    pedacos.push({
      numero: a.codigo,
      texto: texto.slice(a.ate, achados[i + 1]?.de ?? texto.length),
    }),
  );
  return pedacos
    .map((p) => ({ ...p, texto: colapsar(p.texto) }))
    .filter((p) => p.texto.length >= 6);
}

/** Agrupa frases em assuntos de pelo menos MINIMO_DO_ASSUNTO caracteres (o resto fica com o anterior). */
function porFrases(numero, texto) {
  const lista = frases(texto);
  const grupos = [];
  let atual = '';
  for (const f of lista) {
    atual = atual ? `${atual} ${f}` : f;
    if (atual.length >= MINIMO_DO_ASSUNTO) {
      grupos.push(atual);
      atual = '';
    }
  }
  if (atual) {
    if (grupos.length) grupos[grupos.length - 1] += ` ${atual}`;
    else grupos.push(atual);
  }
  if (grupos.length < 2) return null;
  return grupos.map((g, i) => ({ numero: numero ? `${numero}.${i + 1}` : null, texto: g }));
}

/** Lista longa de tópicos separados por "; ": agrupa em trechos de pelo menos MINIMO_DO_TRECHO caracteres. */
function porPontoEVirgula(numero, texto) {
  const segmentos = texto.split(/;\s+/).reduce((acc, seg, i) => {
    if (i > 0 && /^[a-z]\)/i.test(seg)) acc[acc.length - 1] += `; ${seg}`;
    else acc.push(i > 0 ? seg : seg);
    return acc;
  }, []);
  const grupos = [];
  let atual = '';
  segmentos.forEach((seg, i) => {
    const fim = i < segmentos.length - 1 ? ';' : '';
    atual = atual ? `${atual} ${seg}${fim}` : `${seg}${fim}`;
    if (atual.length >= MINIMO_DO_TRECHO) {
      grupos.push(atual);
      atual = '';
    }
  });
  if (atual) {
    if (grupos.length) grupos[grupos.length - 1] += ` ${atual}`;
    else grupos.push(atual);
  }
  if (grupos.length < 2) return null;
  return grupos.map((g, i) => ({
    numero: numero ? `${numero}.${i + 1}` : null,
    texto: g.replace(/;$/, ''),
  }));
}

/**
 * Divide um item. Devolve `[]` se for anexo, `[{numero, assunto}]` (um só quando não há o que dividir).
 * Passo 1: marcadores numerados embutidos; passo 2: frases, só em item longo.
 */
export function dividirItem(numero, assunto) {
  const texto = limparRuido(assunto);
  if (ehAnexo(texto)) return [];
  const doMarcador = porMarcadores(numero, texto);
  const pedacos = doMarcador ?? [{ numero, texto }];
  const saida = [];
  for (const p of pedacos) {
    const sub = p.texto.length > LIMITE_LONGO ? porFrases(p.numero, p.texto) : null;
    for (const s of sub ?? [p]) {
      const lista = s.texto.length > LIMITE_DE_LISTA ? porPontoEVirgula(s.numero, s.texto) : null;
      for (const t of lista ?? [s]) saida.push({ numero: t.numero ?? null, assunto: t.texto });
    }
  }
  return saida;
}

/** Divide os itens de uma disciplina do JSON (cada item novo herda faixa, recorrência e fonte). Devolve a lista e quantos itens saíram/entraram. */
export function dividirItens(itens) {
  const novos = [];
  const vistos = new Set();
  let anexos = 0;
  for (const it of itens) {
    const partes = dividirItem(it.numero, it.assunto);
    if (!partes.length) anexos++;
    for (const p of partes) {
      // a extração às vezes repete o mesmo item gigante; depois de dividido, as cópias ficam idênticas
      const chave = `${p.numero}|${p.assunto}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      novos.push({ ...it, numero: p.numero, assunto: p.assunto });
    }
  }
  return { itens: novos, anexos };
}
