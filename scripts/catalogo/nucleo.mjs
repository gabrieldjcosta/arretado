// Núcleo do catálogo de concursos (B0): lê o CSV do Perplexity, valida, normaliza e converte em JSON por carreira.
// Contrato: docs/planos/catalogo-formato.md. Sem rede, sem dependências.

import { dividirItem } from './dividir.mjs';

export const CABECALHO_PRINCIPAL = [
  'carreira',
  'orgao',
  'uf',
  'banca',
  'ano_edital',
  'cargo',
  'fase',
  'disciplina',
  'ordem_disciplina',
  'numero_item',
  'assunto',
  'faixa',
  'obs_faixa',
  'recorrencia',
  'fonte_url',
];
export const CABECALHO_CONSOLIDADAS = [
  'carreira',
  'disciplina_normalizada',
  'variantes_de_nome',
  'presente_em_n_editais',
  'total_editais',
  'faixa_sugerida',
];
export const CABECALHO_EDITAIS = ['orgao', 'ano', 'banca', 'url', 'situacao'];

/** Carreira canônica → slug (nome do arquivo em corpus/catalogo/) e apelidos aceitos. */
export const CARREIRAS = [
  ['Defensoria Pública', 'defensoria-publica', ['defensoria']],
  ['Magistratura', 'magistratura', []],
  ['Ministério Público (Promotor)', 'ministerio-publico', ['ministerio publico', 'promotor']],
  ['Analista Judiciário', 'analista-judiciario', ['analista']],
  ['Técnico Judiciário', 'tecnico-judiciario', ['tecnico']],
  [
    'Tribunal de Contas / área de controle',
    'controle',
    ['tribunal de contas', 'area de controle', 'controle'],
  ],
  [
    'Área ambiental (procuradoria e órgãos ambientais)',
    'ambiental',
    ['area ambiental', 'ambiental'],
  ],
  ['Procuradoria (AGU/estadual/municipal)', 'procuradoria', ['procuradoria', 'agu']],
  ['Delegado de Polícia', 'delegado', ['delegado']],
  ['Cartório/notarial', 'cartorio', ['cartorio', 'notarial']],
];
export const FAIXAS = ['Altíssima', 'Alta', 'Média', 'Baixa'];
export const FASES = ['objetiva', 'discursiva', 'oral', 'titulos'];
export const SITUACOES = ['completo', 'parcial', 'NÃO LOCALIZADO'];
const UFS = new Set(
  'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO BR'.split(' '),
);
/** Agregadores e cursinhos: o prompt exige edital oficial. */
const FONTES_PROIBIDAS =
  /(^|\.)(pciconcursos|qconcursos|estrategiaconcursos|grancursos|jusbrasil|concursosnobrasil|folha\.uol|infomoney|dizerodireito|conjur|migalhas|wikipedia)\./i;
const GERAIS =
  /^(l[ií]ngua portuguesa|portugu[eê]s|inform[aá]tica|no[cç][oõ]es de inform[aá]tica|racioc[ií]nio l[oó]gico|matem[aá]tica|atualidades|conhecimentos gerais|ingl[eê]s)\b/i;
const PREFIXO_GERAL = '[Geral] ';

export const semAcento = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
const limpar = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const ehNaoLocalizado = (s) => semAcento(s ?? '').replace(/[^a-z]/g, '') === 'naolocalizado';

// ---------------------------------------------------------------- leitura

/** CSV RFC 4180: aspas duplas, "" como aspas literais, quebra de linha dentro de campo. */
export function lerCsv(texto) {
  const linhas = [];
  let campo = '';
  let linha = [];
  let aspas = false;
  const t = texto.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') {
      linha.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo);
      campo = '';
      if (linha.some((x) => x.trim() !== '')) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim() !== '')) linhas.push(linha);
  return linhas;
}

export function escreverCsv(linhas) {
  const esc = (v) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return linhas.map((l) => l.map(esc).join(',')).join('\n') + '\n';
}

const chaveCabecalho = (l) => l.map((x) => semAcento(x).replace(/[^a-z_]/g, '')).join(',');
const TIPOS = [
  ['principal', CABECALHO_PRINCIPAL],
  ['consolidadas', CABECALHO_CONSOLIDADAS],
  ['editais', CABECALHO_EDITAIS],
];

/**
 * Separa a resposta do Perplexity em blocos. Aceita CSV puro ou texto com cercas ``` e prosa em volta.
 * Cada bloco é reconhecido pelo cabeçalho; devolve { principal, consolidadas, editais } (linhas de dados) e avisos.
 */
export function separarBlocos(texto) {
  const erros = [];
  const saida = { principal: null, consolidadas: null, editais: null };
  const cercas = [...texto.matchAll(/```[a-z]*\r?\n([\s\S]*?)```/gi)].map((m) => m[1]);
  const pedacos = cercas.length ? cercas : [texto];
  for (const p of pedacos) {
    const linhas = lerCsv(p);
    if (!linhas.length) continue;
    const ch = chaveCabecalho(linhas[0]);
    const tipo = TIPOS.find(([, cab]) => cab.join(',') === ch)?.[0];
    if (!tipo) {
      if (!cercas.length)
        erros.push(
          `cabeçalho não reconhecido: "${linhas[0].join(',')}". Esperado: ${CABECALHO_PRINCIPAL.join(',')}`,
        );
      continue;
    }
    if (saida[tipo])
      erros.push(`bloco "${tipo}" aparece mais de uma vez; juntar ou rodar um por vez`);
    else saida[tipo] = linhas.slice(1).map((l, i) => ({ l, n: i + 2 }));
  }
  if (!saida.principal && !saida.consolidadas && !saida.editais && !erros.length)
    erros.push(
      `nenhum bloco com o cabeçalho principal (${CABECALHO_PRINCIPAL.join(',')}); cabeçalho é contrato`,
    );
  return { ...saida, erros };
}

// ---------------------------------------------------------------- normalização por campo

export function carreiraCanonica(v) {
  const k = semAcento(v);
  for (const [nome, slug, apelidos] of CARREIRAS)
    if (semAcento(nome) === k || apelidos.includes(k)) return { nome, slug };
  return null;
}
const faixaCanonica = (v) => {
  const k = semAcento(v);
  return FAIXAS.find((f) => semAcento(f) === k) ?? null;
};
const faseCanonica = (v) => {
  const k = semAcento(v);
  return FASES.find((f) => f === k) ?? null;
};
const situacaoCanonica = (v) => {
  if (ehNaoLocalizado(v)) return 'NÃO LOCALIZADO';
  const k = semAcento(v);
  return SITUACOES.find((s) => semAcento(s) === k) ?? null;
};

/** Normaliza o valor sem decidir se está certo (isso é do validador). Campos desconhecidos ficam como vieram. */
export function normalizarLinha(l) {
  const [
    carreira,
    orgao,
    uf,
    banca,
    ano,
    cargo,
    fase,
    disc,
    ordem,
    num,
    assunto,
    faixa,
    obs,
    rec,
    url,
  ] = l.map(limpar);
  let disciplina = disc.replace(/^\[\s*geral\s*\]\s*/i, '');
  disciplina =
    /^\[\s*geral\s*\]/i.test(disc) || GERAIS.test(disciplina)
      ? PREFIXO_GERAL + disciplina
      : disciplina;
  return [
    carreiraCanonica(carreira)?.nome ?? carreira,
    orgao,
    { DFT: 'DF' }[uf.toUpperCase()] ?? uf.toUpperCase(),
    banca,
    ano,
    cargo,
    faseCanonica(fase) ?? fase.toLowerCase(),
    ehNaoLocalizado(disc) ? 'NÃO LOCALIZADO' : disciplina,
    ordem,
    num,
    assunto,
    faixaCanonica(faixa) ?? faixa,
    obs,
    rec.replace(/\s+/g, ''),
    url,
  ];
}

// ---------------------------------------------------------------- validação

/**
 * Valida as linhas (já normalizadas). Erro = bloqueia a conversão; aviso = revisar, não bloqueia.
 * Cada item: { nivel: 'erro'|'aviso', linha, regra, msg }.
 */
export function validarPrincipal(linhas) {
  const ach = [];
  const e = (n, regra, msg) => ach.push({ nivel: 'erro', linha: n, regra, msg });
  const a = (n, regra, msg) => ach.push({ nivel: 'aviso', linha: n, regra, msg });
  const vistos = new Map();
  const emitidos = new Set(); // avisos por edital saem uma vez só
  const uma = (chave, fn) => {
    if (!emitidos.has(chave)) {
      emitidos.add(chave);
      fn();
    }
  };
  const edital = new Map(); // chave do edital → { banca, disciplinas: Map(disc → ordem) , ordens: Map(ordem → disc) }
  const itens = new Map(); // edital|disc|numero → assunto
  for (const { l, n } of linhas) {
    if (l.length !== CABECALHO_PRINCIPAL.length) {
      e(
        n,
        'colunas',
        `${l.length} colunas, esperado ${CABECALHO_PRINCIPAL.length} (vírgula sem aspas dentro de um campo?)`,
      );
      continue;
    }
    const [
      carreira,
      orgao,
      uf,
      banca,
      ano,
      cargo,
      fase,
      disc,
      ordem,
      num,
      assunto,
      faixa,
      obs,
      rec,
      url,
    ] = normalizarLinha(l);
    const nl = ehNaoLocalizado(disc) || ehNaoLocalizado(assunto);
    if (nl) {
      // Linha do órgão sem edital: o Perplexity grava NÃO LOCALIZADO em disciplina ou em assunto; o resto fica vazio.
      if (!carreiraCanonica(carreira)) e(n, 'carreira', `carreira "${carreira}" fora da lista`);
      if (!orgao) e(n, 'orgao', 'órgão vazio');
      if (uf && !UFS.has(uf)) e(n, 'uf', `UF "${uf}" inválida (sigla de 2 letras ou BR)`);
      for (const [campo, v] of [
        ['disciplina', ehNaoLocalizado(disc) ? '' : disc],
        ['assunto', ehNaoLocalizado(assunto) ? '' : assunto],
        ['numero_item', num],
        ['faixa', faixa],
        ['obs_faixa', obs],
        ['recorrencia', rec],
      ])
        if (v) e(n, 'nao_localizado', `linha NÃO LOCALIZADO não pode ter ${campo} ("${v}")`);
      continue;
    }

    if (!carreiraCanonica(carreira))
      e(
        n,
        'carreira',
        `carreira "${carreira}" fora da lista (ver docs/planos/catalogo-formato.md)`,
      );
    if (!orgao) e(n, 'orgao', 'órgão vazio');
    if (!UFS.has(uf))
      uf
        ? e(n, 'uf', `UF "${uf}" inválida (sigla de 2 letras ou BR)`)
        : a(n, 'uf', 'UF vazia (usar BR para órgão federal)');
    if (!banca) a(n, 'banca', 'banca não informada');
    const anoN = Number(ano);
    if (!/^\d{4}$/.test(ano) || anoN < 2015 || anoN > 2027)
      e(n, 'ano', `ano_edital "${ano}" inválido (AAAA entre 2015 e 2027)`);
    else if (anoN < 2023)
      uma(`ano|${orgao}|${ano}`, () =>
        a(n, 'ano', `${orgao}: edital de ${anoN}, fora da janela preferida (2023 a 2026)`),
      );
    if (!cargo) a(n, 'cargo', 'cargo vazio');
    if (fase && !FASES.includes(fase))
      e(n, 'fase', `fase "${fase}" inválida (${FASES.join(', ')} ou vazio)`);
    if (!disc) e(n, 'disciplina', 'disciplina vazia');
    if (disc && !disc.startsWith(PREFIXO_GERAL) && GERAIS.test(disc))
      a(n, 'geral', `disciplina geral sem prefixo "${PREFIXO_GERAL}"`);

    if (!/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(url)) {
      e(n, 'fonte_url', `fonte_url ausente ou inválida: "${url}"`);
    } else {
      const host = new URL(url).host;
      if (FONTES_PROIBIDAS.test(host + '.'))
        e(n, 'fonte_url', `fonte não oficial (${host}); só edital oficial`);
    }

    if (!assunto) e(n, 'assunto', 'assunto vazio');
    else {
      if (assunto.length < 6) a(n, 'assunto', `assunto muito curto: "${assunto}"`);
      if (/^[a-z]\)\s/i.test(assunto))
        a(
          n,
          'subitem',
          'parece subitem solto (a), b)...); subitens ficam no assunto do item, separados por "; "',
        );
    }
    if (!/^\d+$/.test(ordem) || Number(ordem) < 1)
      e(n, 'ordem', `ordem_disciplina "${ordem}" deve ser inteiro ≥ 1`);
    if (!num) a(n, 'numero_item', 'numero_item vazio (o edital numera o item?)');
    else if (numeroImplausivel(num))
      uma(`num|${orgao}|${ano}|${num}`, () =>
        a(
          n,
          'numero_item',
          `${orgao} ${ano}: numero_item implausível "${num}" (trecho do texto virou número?)`,
        ),
      );

    if (faixa && !FAIXAS.includes(faixa))
      e(n, 'faixa', `faixa "${faixa}" inválida (${FAIXAS.join(', ')} ou vazio)`);
    if (faixa && !obs) e(n, 'faixa', 'faixa sem obs_faixa: só vale com base verificável');
    if (!faixa && obs) a(n, 'faixa', 'obs_faixa sem faixa');
    if (/candidat/i.test(obs))
      a(n, 'obs_faixa', 'obs_faixa menciona candidatos; só conteúdo de edital');
    if (rec) {
      const m = /^(\d+)\/(\d+)$/.exec(rec);
      if (!m) e(n, 'recorrencia', `recorrencia "${rec}" deve ser N/M (ex.: 3/3)`);
      else if (Number(m[1]) > Number(m[2]) || Number(m[2]) < 1)
        e(n, 'recorrencia', `recorrencia "${rec}" incoerente`);
    }

    const chaveEd = [carreira, orgao, ano, cargo, fase, url].join('|');
    let ed = edital.get(chaveEd);
    if (!ed) edital.set(chaveEd, (ed = { banca, disc: new Map(), ordens: new Map(), linha: n }));
    if (ed.banca !== banca)
      e(n, 'banca', `banca "${banca}" difere de "${ed.banca}" no mesmo edital (${orgao} ${ano})`);
    if (/^\d+$/.test(ordem)) {
      if (ed.disc.has(disc) && ed.disc.get(disc) !== ordem)
        uma(`o2|${chaveEd}|${disc}`, () =>
          a(n, 'ordem', `${orgao} ${ano}: "${disc}" com ordem ${ordem} e ${ed.disc.get(disc)}`),
        );
      else ed.disc.set(disc, ordem);
      if (ed.ordens.has(ordem) && ed.ordens.get(ordem) !== disc)
        uma(`o1|${chaveEd}`, () =>
          a(
            n,
            'ordem',
            `${orgao} ${ano}: ordem ${ordem} usada por "${ed.ordens.get(ordem)}" e "${disc}" (numeração reinicia por bloco?)`,
          ),
        );
      else ed.ordens.set(ordem, disc);
    }

    const chaveLinha = [chaveEd, disc, num, assunto].join('|');
    if (vistos.has(chaveLinha)) e(n, 'duplicata', `linha repete a ${vistos.get(chaveLinha)}`);
    else vistos.set(chaveLinha, n);
    if (num) {
      const chaveItem = [chaveEd, disc, num].join('|');
      if (itens.has(chaveItem) && itens.get(chaveItem) !== assunto)
        uma(`it|${chaveEd}|${disc}`, () =>
          a(
            n,
            'item',
            `${orgao} ${ano}: item ${num} de "${disc}" repetido com outro assunto (numeração reinicia por seção?)`,
          ),
        );
      else itens.set(chaveItem, assunto);
    }
  }
  for (const [chave, ed] of edital) {
    const ordens = [...ed.ordens.keys()].map(Number).sort((x, y) => x - y);
    if (ordens.some((o, i) => o !== i + 1))
      a(
        ed.linha,
        'ordem',
        `ordens das disciplinas com lacuna em ${chave.split('|').slice(1, 3).join(' ')}: ${ordens.join(',')}`,
      );
  }
  return ach;
}

const chaveDisc = (v) =>
  semAcento(v.replace(/^\[\s*geral\s*\]\s*/i, ''))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
/** Número de item que é trecho de texto ou documento (ex.: CNPJ), não numeração de edital. */
const numeroImplausivel = (num) => /^\d{5,}$/.test(num) || num.length > 12;
const ehLinhaNl = (l) => ehNaoLocalizado(l[7]) || ehNaoLocalizado(l[10]);
const linhasValidas = (bloco, n) => (bloco ?? []).filter(({ l }) => l.length === n);

/**
 * Nome da disciplina no edital → disciplina_normalizada (bloco 2), pelo nome normalizado ou por uma das variantes.
 * O Perplexity costuma deixar o nome original (caixa alta) em `disciplina`; este mapa une tudo sob o nome consolidado.
 */
export function mapaDisciplinas(consolidadas) {
  const m = new Map();
  for (const { l } of linhasValidas(consolidadas, CABECALHO_CONSOLIDADAS.length)) {
    const car = carreiraCanonica(l[0])?.nome ?? limpar(l[0]);
    const norm = limpar(l[1]);
    for (const nome of [norm, ...limpar(l[2]).split(/\s*;\s*/)])
      if (nome && !m.has(`${car}|${chaveDisc(nome)}`)) m.set(`${car}|${chaveDisc(nome)}`, norm);
  }
  return m;
}

/** Bloco 2 (consolidadas) e bloco 3 (editais usados), cruzados com o principal. Só avisos, exceto campos inválidos. */
export function validarComplementares({ principal, consolidadas, editais }) {
  const ach = [];
  const e = (n, regra, msg) => ach.push({ nivel: 'erro', linha: n, regra, msg });
  const a = (n, regra, msg) => ach.push({ nivel: 'aviso', linha: n, regra, msg });
  const p = linhasValidas(principal, CABECALHO_PRINCIPAL.length).map(({ l }) => normalizarLinha(l));
  const reais = p.filter((l) => !ehLinhaNl(l));
  if (consolidadas) {
    const mapa = mapaDisciplinas(consolidadas);
    const vistas = new Set();
    const usadas = new Set();
    for (const { l, n } of consolidadas) {
      if (l.length !== CABECALHO_CONSOLIDADAS.length) {
        e(n, 'consolidadas', `${l.length} colunas, esperado ${CABECALHO_CONSOLIDADAS.length}`);
        continue;
      }
      const [car, disc, , pres, tot, faixa] = l.map(limpar);
      const c = carreiraCanonica(car);
      if (!c) e(n, 'consolidadas', `carreira "${car}" fora da lista`);
      if (!/^\d+$/.test(pres) || !/^\d+$/.test(tot) || Number(pres) > Number(tot))
        e(n, 'consolidadas', `presente_em_n_editais/total_editais incoerentes: ${pres}/${tot}`);
      if (faixa && !faixaCanonica(faixa))
        e(n, 'consolidadas', `faixa_sugerida "${faixa}" inválida`);
      const k = `${c?.nome ?? car}|${chaveDisc(disc)}`;
      if (vistas.has(k)) e(n, 'consolidadas', `disciplina "${disc}" repetida`);
      vistas.add(k);
    }
    const semPar = new Set();
    for (const l of reais) {
      const alvo = mapa.get(`${l[0]}|${chaveDisc(l[7])}`);
      if (alvo) usadas.add(`${l[0]}|${chaveDisc(alvo)}`);
      else semPar.add(`${l[0]}|${l[7]}`);
    }
    for (const k of semPar)
      a(0, 'consolidadas', `disciplina "${k.split('|')[1]}" do principal sem par nas consolidadas`);
    for (const k of vistas)
      if (!usadas.has(k))
        a(0, 'consolidadas', `consolidada "${k.split('|')[1]}" não aparece no bloco principal`);
  }
  if (editais) {
    const usados = new Set();
    const comAssunto = new Set(reais.map((x) => `${x[1]}|${x[4]}`));
    for (const { l, n } of editais) {
      if (l.length !== CABECALHO_EDITAIS.length) {
        e(n, 'editais', `${l.length} colunas, esperado ${CABECALHO_EDITAIS.length}`);
        continue;
      }
      const [orgao, ano, , url, sit] = l.map(limpar);
      const s = situacaoCanonica(sit);
      const nl = s === 'NÃO LOCALIZADO';
      if (!s) e(n, 'editais', `situação "${sit}" inválida (${SITUACOES.join(', ')})`);
      if (!nl && !/^https?:\/\//i.test(url)) e(n, 'editais', `edital "${orgao} ${ano}" sem url`);
      if (!nl && !/^\d{4}$/.test(ano)) e(n, 'editais', `ano "${ano}" inválido`);
      usados.add(`${orgao}|${ano}`);
      if (nl && comAssunto.has(`${orgao}|${ano}`))
        e(n, 'editais', `${orgao} ${ano} está NÃO LOCALIZADO mas tem assuntos no bloco principal`);
      if (s === 'completo' && !comAssunto.has(`${orgao}|${ano}`))
        a(n, 'editais', `${orgao} ${ano} está "completo" mas não tem assuntos no bloco principal`);
    }
    for (const k of comAssunto)
      if (!usados.has(k))
        a(
          0,
          'editais',
          `edital ${k.replace('|', ' ')} do principal não está na lista de editais usados`,
        );
  }
  return ach;
}

// ---------------------------------------------------------------- conversão

const slug = (s) =>
  semAcento(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Faixa sugerida de uma disciplina pela presença nos editais da amostra (mesma regra que o Perplexity declarou
 * na Magistratura): ≥85% Altíssima, ≥65% Alta, ≥35% Média, abaixo disso Baixa. Com menos de 3 editais não há base.
 */
export function faixaDerivada(presente, total) {
  if (!(total >= 3) || presente < 0 || presente > total) return null;
  const r = presente / total;
  return r >= 0.85 ? 'Altíssima' : r >= 0.65 ? 'Alta' : r >= 0.35 ? 'Média' : 'Baixa';
}

/**
 * Separa as linhas que não entram no catálogo: assunto que virou fragmento (< 6 caracteres) ou número de item
 * que não é numeração (ex.: CNPJ). Linhas NÃO LOCALIZADO ficam. Devolve as mantidas e as descartadas com o motivo.
 */
export function descartar(principal) {
  const mantidas = [];
  const descartadas = [];
  for (const x of principal) {
    if (x.l.length !== CABECALHO_PRINCIPAL.length) {
      mantidas.push(x);
      continue;
    }
    const l = normalizarLinha(x.l);
    if (ehLinhaNl(l)) mantidas.push(x);
    else if (l[10].length < 6) descartadas.push({ ...x, motivo: 'assunto fragmento' });
    else if (l[9] && numeroImplausivel(l[9]))
      descartadas.push({ ...x, motivo: 'numero_item implausível' });
    else mantidas.push(x);
  }
  return { mantidas, descartadas };
}

/**
 * Divide as linhas em que a extração juntou vários assuntos num só (ver `dividir.mjs`) e tira anexos do edital.
 * Cada linha nova herda todos os campos da original; só `numero_item` e `assunto` mudam. Idempotente.
 * Devolve as linhas resultantes e os anexos retirados (para a lista de descartes).
 */
export function dividirLinhas(principal) {
  const vistas = new Set();
  const mantidas = [];
  const descartadas = [];
  for (const x of principal) {
    if (x.l.length !== CABECALHO_PRINCIPAL.length) {
      mantidas.push(x);
      continue;
    }
    const l = normalizarLinha(x.l);
    if (ehLinhaNl(l)) {
      mantidas.push(x);
      continue;
    }
    const partes = dividirItem(l[9] || null, l[10]);
    if (!partes.length) descartadas.push({ ...x, motivo: 'anexo do edital' });
    for (const p of partes) {
      const nova = l.map((v, i) => (i === 9 ? (p.numero ?? '') : i === 10 ? p.assunto : v));
      // a extração às vezes repete o mesmo item gigante; depois de dividido, as cópias ficam idênticas
      const chave = JSON.stringify(nova);
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      mantidas.push({ ...x, l: nova });
    }
  }
  return { mantidas, descartadas };
}

function faixaDaDisciplina(l) {
  const declarada = faixaCanonica(l[5]);
  const derivada = declarada ? null : faixaDerivada(Number(l[3]), Number(l[4]));
  return {
    faixaSugerida: declarada ?? derivada,
    faixaOrigem: declarada ? 'edital' : derivada ? 'derivada' : null,
    faixaBase: declarada || derivada ? `presente em ${l[3]} de ${l[4]} editais` : null,
  };
}

/**
 * JSON por carreira, camelCase, pronto para o B1 (rótulo "baseado no edital X de AAAA" = orgao + ano).
 * Edital = órgão + ano + cargo + fase + fonte_url (duas edições do mesmo ano, como o ENAM, ficam separadas).
 * Disciplinas saem com o nome consolidado (bloco 2), quando existe; `nomeNoEdital` guarda o original.
 */
export function converter({ principal, consolidadas, editais }, carreiraNome) {
  const c = carreiraCanonica(carreiraNome);
  const situacoes = new Map(
    linhasValidas(editais, CABECALHO_EDITAIS.length).map(({ l }) => [
      `${limpar(l[0])}|${limpar(l[1])}`,
      situacaoCanonica(l[4]),
    ]),
  );
  const mapa = mapaDisciplinas(consolidadas);
  const linhas = linhasValidas(principal, CABECALHO_PRINCIPAL.length)
    .map(({ l }) => normalizarLinha(l))
    .filter((l) => l[0] === c.nome);
  const eds = new Map();
  const ids = new Set();
  for (const l of linhas) {
    const [, orgao, uf, banca, ano, cargo, fase, disc, ordem, num, assunto, faixa, obs, rec, url] =
      l;
    const nl = ehLinhaNl(l);
    const chave = nl ? `nl|${orgao}` : [orgao, ano, cargo, fase, url].join('|');
    if (!eds.has(chave)) {
      let id = slug(nl ? `${orgao}-nao-localizado` : `${orgao}-${ano}-${cargo}-${fase}`);
      for (let i = 2; ids.has(id); i++) id = `${id.replace(/-\d+$/, '')}-${i}`;
      ids.add(id);
      eds.set(chave, {
        id,
        orgao,
        uf,
        banca: banca || null,
        ano: nl ? null : Number(ano),
        cargo: cargo || null,
        fase: fase || null,
        situacao: nl ? 'NÃO LOCALIZADO' : (situacoes.get(`${orgao}|${ano}`) ?? 'completo'),
        fonteUrl: url || null,
        rotulo: nl ? null : `baseado no edital ${orgao} de ${ano}`,
        disciplinas: new Map(),
      });
    }
    if (nl) continue;
    const ed = eds.get(chave);
    const nome = mapa.get(`${c.nome}|${chaveDisc(disc)}`) ?? disc;
    if (!ed.disciplinas.has(nome))
      ed.disciplinas.set(nome, { nome, nomeNoEdital: disc, ordem: Number(ordem), itens: [] });
    const d = ed.disciplinas.get(nome);
    d.ordem = Math.min(d.ordem, Number(ordem));
    d.itens.push({
      numero: num || null,
      assunto,
      faixa: faixa || null,
      obsFaixa: obs || null,
      recorrencia: rec || null,
      fonteUrl: url,
    });
  }
  return {
    versao: 1,
    carreira: c.nome,
    slug: c.slug,
    editais: [...eds.values()].map((ed) => ({
      ...ed,
      disciplinas: [...ed.disciplinas.values()].sort((x, y) => x.ordem - y.ordem),
    })),
    disciplinas: linhasValidas(consolidadas, CABECALHO_CONSOLIDADAS.length)
      .filter(({ l }) => carreiraCanonica(l[0])?.nome === c.nome)
      .map(({ l }) => ({
        nome: limpar(l[1]),
        variantes: limpar(l[2]) ? limpar(l[2]).split(/\s*;\s*/) : [],
        presenteEm: Number(l[3]),
        totalEditais: Number(l[4]),
        ...faixaDaDisciplina(l),
      })),
  };
}

/** CSV principal normalizado, com o cabeçalho do contrato. */
export const csvNormalizado = (principal) =>
  escreverCsv([
    CABECALHO_PRINCIPAL,
    ...principal
      .filter(({ l }) => l.length === CABECALHO_PRINCIPAL.length)
      .map(({ l }) => normalizarLinha(l)),
  ]);

/** Carreiras presentes no principal (canônicas). */
export const carreirasDoPrincipal = (principal) => [
  ...new Set(
    principal
      .filter(({ l }) => l.length === CABECALHO_PRINCIPAL.length)
      .map(({ l }) => carreiraCanonica(l[0])?.nome)
      .filter(Boolean),
  ),
];
