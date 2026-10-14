// Núcleo do catálogo de concursos (B0): lê o CSV do Perplexity, valida, normaliza e converte em JSON por carreira.
// Contrato: docs/planos/catalogo-formato.md. Sem rede, sem dependências.

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
  if (!saida.principal && !erros.length)
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
    uf.toUpperCase(),
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
    else if (anoN < 2023) a(n, 'ano', `edital de ${anoN}: fora da janela preferida (2023 a 2026)`);
    if (!cargo) a(n, 'cargo', 'cargo vazio');
    if (fase && !FASES.includes(fase))
      e(n, 'fase', `fase "${fase}" inválida (${FASES.join(', ')} ou vazio)`);
    if (!disc) e(n, 'disciplina', 'disciplina vazia');
    if (disc && !nl && !disc.startsWith(PREFIXO_GERAL) && GERAIS.test(disc))
      a(n, 'geral', `disciplina geral sem prefixo "${PREFIXO_GERAL}"`);

    if (!/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(url)) {
      nl
        ? a(n, 'fonte_url', 'NÃO LOCALIZADO sem URL')
        : e(n, 'fonte_url', `fonte_url ausente ou inválida: "${url}"`);
    } else {
      const host = new URL(url).host;
      if (FONTES_PROIBIDAS.test(host + '.'))
        e(n, 'fonte_url', `fonte não oficial (${host}); só edital oficial`);
    }

    if (nl) {
      for (const [campo, v] of [
        ['assunto', assunto && !ehNaoLocalizado(assunto) ? assunto : ''],
        ['numero_item', num],
        ['faixa', faixa],
        ['obs_faixa', obs],
        ['recorrencia', rec],
      ])
        if (v) e(n, 'nao_localizado', `linha NÃO LOCALIZADO não pode ter ${campo} ("${v}")`);
      continue;
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

    const chaveEd = [carreira, orgao, ano, cargo, fase].join('|');
    let ed = edital.get(chaveEd);
    if (!ed) edital.set(chaveEd, (ed = { banca, disc: new Map(), ordens: new Map(), linha: n }));
    if (ed.banca !== banca)
      e(n, 'banca', `banca "${banca}" difere de "${ed.banca}" no mesmo edital (${orgao} ${ano})`);
    if (/^\d+$/.test(ordem)) {
      if (ed.disc.has(disc) && ed.disc.get(disc) !== ordem)
        e(n, 'ordem', `"${disc}" com ordem ${ordem} e ${ed.disc.get(disc)} no mesmo edital`);
      else ed.disc.set(disc, ordem);
      if (ed.ordens.has(ordem) && ed.ordens.get(ordem) !== disc)
        e(
          n,
          'ordem',
          `ordem ${ordem} usada por "${ed.ordens.get(ordem)}" e "${disc}" no mesmo edital`,
        );
      else ed.ordens.set(ordem, disc);
    }

    const chaveLinha = [chaveEd, disc, num, assunto].join('|');
    if (vistos.has(chaveLinha)) e(n, 'duplicata', `linha repete a ${vistos.get(chaveLinha)}`);
    else vistos.set(chaveLinha, n);
    if (num) {
      const chaveItem = [chaveEd, disc, num].join('|');
      if (itens.has(chaveItem) && itens.get(chaveItem) !== assunto)
        e(n, 'item', `item ${num} de "${disc}" com dois assuntos diferentes no mesmo edital`);
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

/** Bloco 2 (consolidadas) e bloco 3 (editais usados), cruzados com o principal. Só avisos, exceto campos inválidos. */
export function validarComplementares({ principal, consolidadas, editais }) {
  const ach = [];
  const e = (n, regra, msg) => ach.push({ nivel: 'erro', linha: n, regra, msg, bloco: undefined });
  const a = (n, regra, msg) => ach.push({ nivel: 'aviso', linha: n, regra, msg });
  const p = principal
    .filter(({ l }) => l.length === CABECALHO_PRINCIPAL.length)
    .map(({ l }) => normalizarLinha(l));
  const discPrincipal = new Set(
    p.filter((l) => !ehNaoLocalizado(l[7])).map((l) => `${l[0]}|${l[7]}`),
  );
  if (consolidadas) {
    const vistas = new Set();
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
      const k = `${c?.nome ?? car}|${disc}`;
      if (vistas.has(k)) e(n, 'consolidadas', `disciplina "${disc}" repetida`);
      vistas.add(k);
      if (
        c &&
        !discPrincipal.has(k) &&
        !discPrincipal.has(`${c.nome}|${PREFIXO_GERAL}${disc.replace(/^\[\s*geral\s*\]\s*/i, '')}`)
      )
        a(n, 'consolidadas', `"${disc}" não aparece no bloco principal`);
    }
    const consol = new Set(
      consolidadas
        .filter(({ l }) => l.length === CABECALHO_CONSOLIDADAS.length)
        .map(({ l }) => `${carreiraCanonica(l[0])?.nome ?? limpar(l[0])}|${limpar(l[1])}`),
    );
    for (const k of discPrincipal)
      if (!consol.has(k) && !consol.has(k.replace(PREFIXO_GERAL, '')))
        a(
          0,
          'consolidadas',
          `disciplina "${k.split('|')[1]}" do principal ausente nas consolidadas`,
        );
  }
  if (editais) {
    const usados = new Set();
    for (const { l, n } of editais) {
      if (l.length !== CABECALHO_EDITAIS.length) {
        e(n, 'editais', `${l.length} colunas, esperado ${CABECALHO_EDITAIS.length}`);
        continue;
      }
      const [orgao, ano, , url, sit] = l.map(limpar);
      const s = situacaoCanonica(sit);
      if (!s) e(n, 'editais', `situação "${sit}" inválida (${SITUACOES.join(', ')})`);
      if (s !== 'NÃO LOCALIZADO' && !/^https?:\/\//i.test(url))
        e(n, 'editais', `edital "${orgao} ${ano}" sem url`);
      if (!/^\d{4}$/.test(ano)) e(n, 'editais', `ano "${ano}" inválido`);
      usados.add(`${orgao}|${ano}`);
      if (
        s === 'NÃO LOCALIZADO' &&
        p.some((x) => x[1] === orgao && x[4] === ano && !ehNaoLocalizado(x[7]))
      )
        e(n, 'editais', `${orgao} ${ano} está NÃO LOCALIZADO mas tem assuntos no bloco principal`);
    }
    for (const k of new Set(p.map((x) => `${x[1]}|${x[4]}`)))
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

/** JSON por carreira, camelCase, pronto para o B1 (rótulo "baseado no edital X de AAAA" = orgao + ano). */
export function converter({ principal, consolidadas, editais }, carreiraNome) {
  const c = carreiraCanonica(carreiraNome);
  const linhas = principal
    .filter(({ l }) => l.length === CABECALHO_PRINCIPAL.length)
    .map(({ l }) => normalizarLinha(l))
    .filter((l) => l[0] === c.nome);
  const situacoes = new Map(
    (editais ?? [])
      .filter(({ l }) => l.length === CABECALHO_EDITAIS.length)
      .map(({ l }) => [`${limpar(l[0])}|${limpar(l[1])}`, situacaoCanonica(l[4])]),
  );
  const eds = new Map();
  for (const l of linhas) {
    const [, orgao, uf, banca, ano, cargo, fase, disc, ordem, num, assunto, faixa, obs, rec, url] =
      l;
    const id = slug(`${orgao}-${ano}-${cargo}-${fase}`);
    if (!eds.has(id))
      eds.set(id, {
        id,
        orgao,
        uf,
        banca,
        ano: Number(ano),
        cargo,
        fase: fase || null,
        situacao: ehNaoLocalizado(disc)
          ? 'NÃO LOCALIZADO'
          : (situacoes.get(`${orgao}|${ano}`) ?? 'completo'),
        fonteUrl: url,
        rotulo: `baseado no edital ${orgao} de ${ano}`,
        disciplinas: new Map(),
      });
    if (ehNaoLocalizado(disc)) continue;
    const ed = eds.get(id);
    if (!ed.disciplinas.has(disc))
      ed.disciplinas.set(disc, { nome: disc, ordem: Number(ordem), itens: [] });
    ed.disciplinas.get(disc).itens.push({
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
    disciplinas: (consolidadas ?? [])
      .filter(
        ({ l }) =>
          l.length === CABECALHO_CONSOLIDADAS.length && carreiraCanonica(l[0])?.nome === c.nome,
      )
      .map(({ l }) => ({
        nome: limpar(l[1]),
        variantes: limpar(l[2]) ? limpar(l[2]).split(/\s*[;|]\s*/) : [],
        presenteEm: Number(l[3]),
        totalEditais: Number(l[4]),
        faixaSugerida: faixaCanonica(l[5]) ?? null,
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
