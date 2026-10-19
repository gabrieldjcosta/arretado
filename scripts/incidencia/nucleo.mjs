// Incidência por assunto (TEC): achata a árvore pública e valida a tabela. Contrato em docs/planos/incidencia-tec.md.
export const CABECALHO = [
  'banca',
  'orgao',
  'cargo',
  'ano_de',
  'ano_ate',
  'disciplina',
  'assunto_tec',
  'hierarquia',
  'nivel',
  'norma_ref',
  'dispositivo_ref',
  'qtd_questoes',
  'pct_disciplina',
  'pct_banca_cargo',
  'total_disciplina',
  'total_banca_cargo',
  'fonte_extracao',
];

const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const REGEX_ARTIGO =
  /\bart(?:s|igos?)?\.?\s*([0-9]+[º°ª]?(?:-[A-Z])?(?:\s*(?:a|ao|e|,)\s*[0-9]+[º°ª]?(?:-[A-Z])?)*)\s*(?:,?\s*(?:do|da|de)\s+)?([A-Za-zÀ-ú0-9/.\- ]{2,25})?/i;

/** Achata a árvore `jsonMateria` de uma matéria em linhas da tabela (recorte global: banca e cargo "*"). */
export function achatar(materia) {
  const linhas = [];
  const percorrer = (assuntos) => {
    for (const a of assuntos) {
      const art = a.nome.match(REGEX_ARTIGO);
      const nivel = art ? 'artigo' : a.filhos?.length ? 'grupo' : 'assunto';
      const pct = materia.totalQuestoes
        ? Math.round((a.totalQuestoes / materia.totalQuestoes) * 1000) / 10
        : '';
      linhas.push({
        banca: '*',
        orgao: '',
        cargo: '*',
        ano_de: '',
        ano_ate: '',
        disciplina: materia.nome,
        assunto_tec: a.nome,
        hierarquia: a.hierarquia,
        nivel,
        norma_ref: art ? (art[2] ?? '').trim() : '',
        dispositivo_ref: art ? art[1] : '',
        qtd_questoes: a.totalQuestoes,
        pct_disciplina: a.porcentagemMateria ?? pct,
        pct_banca_cargo: '',
        total_disciplina: materia.totalQuestoes,
        total_banca_cargo: '',
        fonte_extracao: `tec-publico/${a.url}`,
      });
      if (a.filhos?.length) percorrer(a.filhos);
    }
  };
  percorrer(materia.assuntos ?? []);
  return linhas;
}

export function paraCsv(linhas) {
  return (
    [CABECALHO.join(','), ...linhas.map((l) => CABECALHO.map((c) => csv(l[c])).join(','))].join(
      '\n',
    ) + '\n'
  );
}

/** Valida linhas já lidas (objetos). Erro bloqueia; aviso só informa. */
export function validar(linhas) {
  const erros = [];
  const avisos = [];
  const vistos = new Set();
  const topo = new Map();
  linhas.forEach((l, i) => {
    const n = i + 2;
    const chave = [
      l.banca,
      l.cargo,
      l.ano_de,
      l.ano_ate,
      l.disciplina,
      l.hierarquia,
      l.assunto_tec,
    ].join('|');
    if (vistos.has(chave)) erros.push({ linha: n, regra: 'recorte-duplicado', msg: l.assunto_tec });
    vistos.add(chave);
    for (const c of ['pct_disciplina', 'qtd_questoes', 'total_disciplina']) {
      if (l[c] === '' || Number.isNaN(Number(l[c])))
        erros.push({ linha: n, regra: 'numero-invalido', msg: `${c} de "${l.assunto_tec}"` });
    }
    if (Number(l.pct_disciplina) < 0 || Number(l.pct_disciplina) > 100)
      erros.push({ linha: n, regra: 'pct-fora-de-faixa', msg: l.assunto_tec });
    if (Number(l.qtd_questoes) > Number(l.total_disciplina))
      erros.push({ linha: n, regra: 'assunto-maior-que-materia', msg: l.assunto_tec });
    if (Number(l.total_disciplina) < 30)
      avisos.push({ linha: n, regra: 'amostra-fraca', msg: l.disciplina });
    if (!l.hierarquia.includes('.')) {
      const k = `${l.banca}|${l.cargo}|${l.disciplina}`;
      topo.set(k, (topo.get(k) ?? 0) + Number(l.pct_disciplina));
    }
  });
  for (const [k, soma] of topo) {
    if (Math.abs(soma - 100) > 2)
      avisos.push({ linha: 0, regra: 'soma-do-topo', msg: `${k}: ${soma.toFixed(1)}%` });
  }
  return { erros, avisos };
}

export function lerCsv(texto) {
  const linhas = [];
  let campo = '',
    reg = [],
    aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') {
      reg.push(campo);
      campo = '';
    } else if (c === '\n') {
      reg.push(campo);
      linhas.push(reg);
      reg = [];
      campo = '';
    } else if (c !== '\r') campo += c;
  }
  if (campo || reg.length) {
    reg.push(campo);
    linhas.push(reg);
  }
  const [cab, ...resto] = linhas;
  return resto.map((r) => Object.fromEntries(cab.map((c, i) => [c, r[i] ?? ''])));
}
