// Estruturador sobre o corpus, contra o gabarito da 7.3, que não sai do estruturador: a árvore
// estrutural (tipo, rótulo, nome e primeiro artigo de cada nó; 8.2), os blocos pré-normativos
// (regra 2) das 11 páginas, os artigos, em ordem, sem sangria e com a rubrica (regras 4 e 5; 8.3),
// os dispositivos da regra 6 com o endereço canônico, a rubrica e o texto da amostra (8.4) e as
// notas de vigência (regra 7; 8.5), fora do texto, na contagem do gabarito.
// Colados como texto pelo `?raw` do Vite: src/ não tem os tipos do Node.
import { sanitizarHtml, type Bloco } from '../../core/seguranca/sanitizador';
import {
  artigosDe,
  artigosEsperados,
  dispositivosDe,
  dispositivosEsperados,
  estruturaDe,
  estruturaEsperada,
  paraComparar,
  semRevogadosAusentes,
  type ArtigoLido,
  type Gabarito,
} from '../../testes/gabarito';
import { PROFUNDIDADE, type TipoDeDispositivo } from './dispositivo';
import { estruturar } from './estruturador';
import { prepararLinhas, textoDe } from './linhas';
import { normalizarBlocos } from './normalizacao';
import type { NoRascunho, Rascunho } from './rascunho';

const HTML = import.meta.glob<string>('../../../corpus/normas/*.colado.html', {
  query: '?raw',
  import: 'default',
  eager: false,
});
const GABARITOS = import.meta.glob<Gabarito>('../../../corpus/normas/*.gabarito.json', {
  import: 'default',
  eager: false,
});

/** Cada colado é sanitizado uma vez (de 1 a 4 s nas páginas grandes). */
const entradas = new Map<string, Promise<{ blocos: Bloco[]; rascunho: Rascunho }>>();
function entrada(id: string): Promise<{ blocos: Bloco[]; rascunho: Rascunho }> {
  let e = entradas.get(id);
  if (!e) {
    const carregar = HTML[`../../../corpus/normas/${id}.colado.html`];
    if (!carregar) throw new Error(`sem colado: ${id}`);
    e = carregar().then((html) => {
      const { blocos } = sanitizarHtml(html);
      return { blocos, rascunho: estruturar(blocos) };
    });
    entradas.set(id, e);
  }
  return e;
}
const rascunho = async (id: string) => (await entrada(id)).rascunho;

const COM_GABARITO = ['lep', 'cp', 'lc80', 'lc-sp-988', 'eca', 'cdc', 'cf'] as const;

async function gabaritoDe(id: string): Promise<Gabarito> {
  const gabarito = await GABARITOS[`../../../corpus/normas/${id}.gabarito.json`]?.();
  if (!gabarito) throw new Error(`sem gabarito: ${id}`);
  return gabarito;
}

describe('estruturador (8.2) no corpus', () => {
  it.each(COM_GABARITO)(
    'árvore estrutural × gabarito: %s',
    async (id) => {
      const gabarito = await gabaritoDe(id);
      expect(estruturaDe((await rascunho(id)).nos)).toEqual(estruturaEsperada(gabarito));
    },
    60_000,
  );
});

/** Regra 2 nas 11 páginas (conferido nos colados em 24/09/2026). */
const PRE_NORMATIVO: Record<
  string,
  { tipo: string; referencia?: string; ementa?: RegExp; preambulo: RegExp; notas: number }
> = {
  lep: {
    tipo: 'Lei',
    referencia: '7.210/1984',
    ementa: /^Institui a Lei de Execução Penal\.$/,
    preambulo: /^O PRESIDENTE DA REPÚBLICA, faço saber que .* a seguinte Lei:$/,
    notas: 2,
  },
  cp: {
    tipo: 'Decreto-Lei',
    referencia: '2.848/1940',
    ementa: /^Código Penal\.$/,
    preambulo: /^O PRESIDENTE DA REPÚBLICA ?, usando da atribuição .* decreta a seguinte Lei:$/,
    notas: 11,
  },
  lc80: {
    tipo: 'Lei Complementar',
    referencia: '80/1994',
    ementa: /^Organiza a Defensoria Pública da União, do Distrito Federal e dos Territórios /,
    preambulo: /^O PRESIDENTE DA REPÚBLICA Faço saber que .* a seguinte lei:$/,
    notas: 0,
  },
  'lc-sp-988': {
    tipo: 'Lei Complementar',
    referencia: '988/2006',
    ementa: /^Organiza a Defensoria Pública do Estado, institui o regime jurídico /,
    // Duas linhas na ALESP.
    preambulo: /^O GOVERNADOR DO ESTADO DE SÃO PAULO: Faço saber que .* lei complementar:$/,
    notas: 1,
  },
  eca: {
    tipo: 'Lei',
    referencia: '8.069/1990',
    ementa: /^Dispõe sobre o Estatuto da Criança e do Adolescente e dá outras providências\.$/,
    preambulo: /^O PRESIDENTE DA REPÚBLICA: Faço saber que .* a seguinte Lei:$/,
    notas: 9,
  },
  cdc: {
    tipo: 'Lei',
    referencia: '8.078/1990',
    ementa: /^Dispõe sobre a proteção do consumidor e dá outras providências\.$/,
    preambulo: /^O PRESIDENTE DA REPÚBLICA, faço saber que .* a seguinte lei:$/,
    notas: 14,
  },
  // Sem número nem ementa; o preâmbulo tem rótulo próprio.
  cf: { tipo: 'Constituição', preambulo: /^Nós, representantes do povo brasileiro, /, notas: 7 },
};
const COMPILADAS = ['lep-compilado', 'cp-compilado', 'eca-compilado', 'cdc-compilado'] as const;
const LINHAS_SOLTAS: Record<string, string[]> = {
  'eca-compilado': ['Linha fora de artigo: "eção I".'],
  'lc-sp-988': ['Linha solta no artigo, sem rótulo: "bracionalização na execução das funções;".'],
};

describe('estruturador (8.2) no corpus: blocos pré-normativos (regra 2)', () => {
  it.each([...Object.keys(PRE_NORMATIVO), ...COMPILADAS])(
    '%s',
    async (id) => {
      const r = await rascunho(id);
      const esperado = PRE_NORMATIVO[id.replace('-compilado', '')];
      if (!esperado) throw new Error(id);
      const { metadados: m } = r;
      expect(m.tipo).toBe(esperado.tipo);
      expect(m.referencia).toBe(esperado.referencia);
      expect(m.epigrafe).toMatch(
        esperado.tipo === 'Constituição' ? /^CONSTITUIÇÃO / : /^(?:LEI|DECRETO-LEI) /,
      );
      if (esperado.ementa) expect(m.ementa).toMatch(esperado.ementa);
      else expect(m.ementa).toBeUndefined();
      expect(m.preambulo).toMatch(esperado.preambulo);
      expect(r.notasDaNorma).toHaveLength(esperado.notas);
      // O preâmbulo também é o primeiro nó; o cabeçalho do portal abre a página; o fecho existe.
      const [primeiro] = r.nos;
      expect(primeiro?.tipo).toBe('preambulo');
      expect(primeiro?.rotulo).toBe(id === 'cf' ? 'PREÂMBULO' : undefined);
      expect(r.descartes[0]?.motivo).toBe('cabecalho');
      expect(r.descartes.some((d) => d.motivo === 'fecho')).toBe(true);
      // Até a 8.6: tachado só na página com todas as redações. Soltas, só as falhas da fonte: na
      // compilada do ECA, "eção I" (a Seção I do Capítulo II do Título I do Livro II sem o "S"); na
      // LC-SP 988, a sobra antes do art. 6º, IV (caso `linha-solta` do gabarito).
      const tipos = new Set(r.anomalias.map((a) => a.tipo));
      expect(tipos.has('redacao_anterior_nao_tratada')).toBe(!id.endsWith('-compilado'));
      expect(r.anomalias.filter((a) => a.tipo === 'linha_solta').map((a) => a.mensagem)).toEqual(
        LINHAS_SOLTAS[id] ?? [],
      );
      expect(tipos.has('sem_artigos')).toBe(false);
      expect(r.anomalias.filter((a) => a.tipo === 'estrutural_substituido')).toHaveLength(
        id === 'cp' ? 2 : 0,
      );
      // Anexo depois da assinatura (regra 11, a 8.7 completa): só na LC-SP 988.
      expect(r.nos[r.nos.length - 1]?.tipo === 'anexo').toBe(id === 'lc-sp-988');
    },
    60_000,
  );
});

/**
 * Até a 8.6: artigos revogados todo tachados, fora da árvore (medido em 24/09/2026; no ECA, o art.
 * 233 desde a 8.5, que leu a nota sem o parêntese de fecho).
 */
const REVOGADOS_FORA: Record<string, number> = {
  lep: 1,
  cp: 27,
  lc80: 2,
  'lc-sp-988': 0,
  eca: 2,
  cdc: 0,
  cf: 13,
};

/** Faixas que se sobrepõem (sangria: rubrica ou texto de um artigo na faixa do outro). */
const sangrias = (artigos: readonly ArtigoLido[]) =>
  artigos.flatMap((a, k) => {
    const anterior = artigos[k - 1];
    return anterior && a.linhas.inicio <= anterior.linhas.fim
      ? [`${anterior.endereco} × ${a.endereco}`]
      : [];
  });

describe('estruturador (8.3) no corpus: artigos em ordem, sem sangria, com a rubrica', () => {
  it.each(COM_GABARITO)(
    '%s',
    async (id) => {
      const achados = artigosDe((await rascunho(id)).nos);
      const enderecos = achados.map((a) => a.endereco);
      const todos = artigosEsperados(await gabaritoDe(id));
      const esperados = semRevogadosAusentes(todos, enderecos);
      expect(enderecos).toEqual(esperados.map((e) => e.endereco));
      expect(todos.length - esperados.length).toBe(REVOGADOS_FORA[id]);
      expect(sangrias(achados)).toEqual([]);
      // Rubrica: os mesmos artigos com nome; o texto, igual ao da amostra conferida.
      expect(achados.filter((a) => a.nome !== undefined).map((a) => a.endereco)).toEqual(
        esperados.filter((e) => e.nome).map((e) => e.endereco),
      );
      const textos = esperados.flatMap((e, k) =>
        e.textoDoNome === undefined ? [] : [[e.endereco, achados[k]?.nome]],
      );
      expect(textos).toEqual(
        esperados.flatMap((e) =>
          e.textoDoNome === undefined ? [] : [[e.endereco, e.textoDoNome]],
        ),
      );
    },
    60_000,
  );

  // Salvaguarda da leitura antecipada: linha vigente nunca some da norma. A única que vai para o
  // descarte `redacao_anterior` é a rubrica de artigo ou dispositivo revogado todo tachado (até a
  // 8.6).
  it.each([...COM_GABARITO, ...COMPILADAS])(
    '%s: linha vigente só vai para o descarte como rubrica de artigo ou dispositivo revogado',
    async (id) => {
      const { blocos, rascunho: r } = await entrada(id);
      const tachadas = new Set(
        prepararLinhas(normalizarBlocos(blocos).blocos)
          .filter((l) => l.tachada)
          .map((l) => l.i),
      );
      const vigentes = r.descartes
        .filter((d) => d.motivo === 'redacao_anterior' && !tachadas.has(d.linhas.inicio))
        .map((d) => textoDe(blocos[d.linhas.inicio]?.trechos ?? []));
      expect(vigentes).toEqual(
        id === 'cp'
          ? [
              'Feminicídio  (Incluído pela Lei nº 13.104, de 2015)', // art. 121, § 2º, VI (8.4)
              'Usurpação de nome ou pseudônimo alheio', // art. 185
              'Substância avariada', // art. 279
              'Exercício arbitrário ou abuso de poder', // art. 350
            ]
          : [],
      );
    },
    60_000,
  );

  // A compilada não tem tachado: todos os artigos do gabarito, sem tolerância nenhuma.
  it.each(COMPILADAS)(
    '%s: todos os artigos do gabarito da página, em ordem',
    async (id) => {
      const achados = artigosDe((await rascunho(id)).nos);
      const gabarito = await gabaritoDe(id.replace('-compilado', ''));
      expect(achados.map((a) => a.endereco)).toEqual(
        artigosEsperados(gabarito).map((e) => e.endereco),
      );
      expect(sangrias(achados)).toEqual([]);
    },
    60_000,
  );
});

/**
 * Até a 8.6: artigos e dispositivos revogados todo tachados, fora da árvore (medido em 24/09/2026;
 * no ECA, o art. 233 e os §§ 1º a 3º desde a 8.5).
 */
const DISPOSITIVOS_REVOGADOS_FORA: Record<string, number> = {
  lep: 10,
  cp: 90,
  lc80: 4,
  'lc-sp-988': 0,
  eca: 10,
  cdc: 0,
  cf: 44,
};

/**
 * A compilada × o gabarito da página com todas as redações (fatos da 7.3): a compilada resume numa
 * linha o dispositivo revogado, sem os filhos; e as falhas de uma das páginas, em `DECISOES`.
 */
const DIFERENCA_DA_COMPILADA: Record<string, { aMais: string[]; aMenos: string[] }> = {
  // A compilada omite o § 1º do art. 9º-A.
  'lep-compilado': { aMais: [], aMenos: ['art9A.par1'] },
  'cp-compilado': {
    aMais: [
      // Revogados que a página só tem tachados (o gabarito os leva para a redação do art. 51).
      'art51.par1',
      'art51.par2',
      // A compilada escreve "Parágrafo único" onde a página rotula "§ 1º.".
      'art234.parUnico',
      ...['I', 'II', 'III'].map((n) => `art234.parUnico.inc${n}`),
    ],
    aMenos: [
      // A página traz sem tachado o antigo parágrafo único do art. 92.
      'art92.parUnico',
      'art234.par1',
      ...['I', 'II', 'III'].map((n) => `art234.par1.inc${n}`),
    ],
  },
  // A compilada resume o art. 233 (revogado) numa linha; os §§ 1º a 3º são filhos do revogado.
  'eca-compilado': { aMais: [], aMenos: [] },
  'cdc-compilado': { aMais: [], aMenos: [] },
};

/**
 * Nó estrutural repetido com artigo no meio (falha da fonte, também no gabarito): a LC 80 tem duas
 * "SEÇÃO IV" no Capítulo I do Título III (a segunda seria a V). A 8.7 acusa `endereco_duplicado`.
 */
const ESTRUTURAL_REPETIDO: Record<string, string[]> = {
  lc80: ['tit3.cap1.sec4', 'tit3.cap1.sec4.nome'],
};

/** Artigo e dispositivos repetidos sem tachado (caso `duplicata`; o gabarito conta os mesmos). */
const DUPLICATAS: Record<string, string[]> = {
  cp: ['art141.par2'], // "(VETADO)" e depois o texto incluído com a derrubada do veto
  eca: ['art263.parUnico'], // dois "Parágrafo único" na alteração do CP (arts. 213 e 214)
  'eca-compilado': ['art263.parUnico'],
};

/** Todos os nós, em pré-ordem, com o pai. */
function comPai(
  nos: readonly NoRascunho[],
  pai?: NoRascunho,
): { no: NoRascunho; pai?: NoRascunho }[] {
  return nos.flatMap((no) => [{ no, ...(pai ? { pai } : {}) }, ...comPai(no.filhos, no)]);
}

describe('estruturador (8.4) no corpus: caput, parágrafo, inciso, alínea e item (regra 6)', () => {
  it.each(COM_GABARITO)(
    '%s: endereços, rubricas e texto da amostra × gabarito',
    async (id) => {
      const achados = dispositivosDe((await rascunho(id)).nos);
      const enderecos = achados.map((d) => d.endereco);
      const todos = dispositivosEsperados(await gabaritoDe(id));
      const esperados = semRevogadosAusentes(todos, enderecos);
      expect(enderecos).toEqual(esperados.map((e) => e.endereco));
      expect(todos.length - esperados.length).toBe(DISPOSITIVOS_REVOGADOS_FORA[id]);
      // Rubrica de artigo e de dispositivo (CP: "Aumento de pena" antes do § 7º).
      expect(achados.filter((d) => d.nome !== undefined).map((d) => d.endereco)).toEqual(
        esperados.filter((e) => e.nome).map((e) => e.endereco),
      );
      const nomes = esperados.flatMap((e, k) =>
        e.textoDoNome === undefined ? [] : [[e.endereco, achados[k]?.nome]],
      );
      expect(nomes).toEqual(
        esperados.flatMap((e) =>
          e.textoDoNome === undefined ? [] : [[e.endereco, e.textoDoNome]],
        ),
      );
      // Texto da amostra (sem o tachado parcial, 8.6), com "Pena -" depois de uma quebra de linha:
      // cada dispositivo com o seu texto, sem sangria e sem as notas (8.5).
      const textos = esperados.flatMap((e, k) =>
        e.texto === undefined ? [] : [[e.endereco, paraComparar(achados[k]?.texto ?? '')]],
      );
      expect(textos).toEqual(
        esperados.flatMap((e) =>
          e.texto === undefined ? [] : [[e.endereco, paraComparar(e.texto.texto)]],
        ),
      );
    },
    60_000,
  );

  it.each(COMPILADAS)(
    '%s: endereços × gabarito da página (sem os filhos do revogado)',
    async (id) => {
      const achados = dispositivosDe((await rascunho(id)).nos).map((d) => d.endereco);
      const esperados = dispositivosEsperados(await gabaritoDe(id.replace('-compilado', '')));
      const status = new Map(esperados.map((e) => [e.endereco, e.status]));
      const filhoDeRevogado = (e: string) =>
        e
          .split('.')
          .slice(0, -1)
          .some((_, k, s) => status.get(s.slice(0, k + 1).join('.')) === 'revogado');
      const naPagina = new Set(esperados.map((e) => e.endereco));
      const naCompilada = new Set(achados);
      const { aMais, aMenos } = DIFERENCA_DA_COMPILADA[id] ?? { aMais: [], aMenos: [] };
      expect(achados.filter((e) => !naPagina.has(e))).toEqual(aMais);
      expect(
        esperados
          .filter((e) => !naCompilada.has(e.endereco) && !filhoDeRevogado(e.endereco))
          .map((e) => e.endereco),
      ).toEqual(aMenos);
    },
    60_000,
  );

  it.each([...COM_GABARITO, ...COMPILADAS])(
    '%s: endereços únicos, hierarquia por sequência e toda alínea sob inciso',
    async (id) => {
      const r = await rascunho(id);
      const nos = comPai(r.nos);
      const vistos = new Set<string>();
      const repetidos = nos
        .map((n) => n.no.endereco)
        .filter((e) => vistos.size === vistos.add(e).size);
      expect(repetidos).toEqual(ESTRUTURAL_REPETIDO[id] ?? []);
      expect(r.anomalias.filter((a) => a.tipo === 'duplicata').map((a) => a.endereco)).toEqual(
        DUPLICATAS[id] ?? [],
      );
      const fora: string[] = [];
      for (const { no, pai } of nos) {
        if (!(no.tipo in PROFUNDIDADE) || no.tipo === 'artigo') continue;
        const tipo = no.tipo as TipoDeDispositivo;
        const tipoDoPai = (pai?.tipo ?? '') as TipoDeDispositivo;
        // O pai é o último aberto de nível menor, e o endereço é o dele mais o segmento.
        if (!pai || !(pai.tipo in PROFUNDIDADE) || PROFUNDIDADE[tipoDoPai] >= PROFUNDIDADE[tipo])
          fora.push(`${no.endereco}: pai ${pai?.tipo ?? '-'}`);
        else if (!no.endereco.startsWith(`${pai.endereco}.`)) fora.push(`${no.endereco}: endereço`);
        // Alínea fora de inciso só onde o parágrafo ou o caput não tem inciso antes dela (lei
        // anterior à LC 95/1998: LEP, art. 29, § 1º); item fora de alínea, idem.
        const irmaos = pai?.filhos.slice(0, pai.filhos.indexOf(no)) ?? [];
        if (tipo === 'alinea' && tipoDoPai !== 'inciso' && irmaos.some((f) => f.tipo === 'inciso'))
          fora.push(`${no.endereco}: alínea fora do inciso`);
        if (tipo === 'item' && tipoDoPai !== 'alinea' && irmaos.some((f) => f.tipo === 'alinea'))
          fora.push(`${no.endereco}: item fora da alínea`);
      }
      expect(fora).toEqual([]);
    },
    60_000,
  );

  it('blocos com numeração própria: o ADCT da CF (nó do bloco) e as disposições transitórias da LC-SP 988', async () => {
    const cf = await rascunho('cf');
    const adct = cf.nos.find((n) => n.tipo === 'bloco');
    expect(adct).toMatchObject({
      endereco: 'adct',
      rotulo: 'ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS',
      notas: [
        expect.objectContaining({ tipo: 'vide' }),
        expect.objectContaining({ tipo: 'vigencia' }),
      ],
    });
    const artigosDoAdct = adct?.filhos.filter((f) => f.tipo === 'artigo') ?? [];
    expect(artigosDoAdct[0]?.endereco).toBe('adct.art1');
    expect(artigosDoAdct.every((a) => a.endereco.startsWith('adct.art'))).toBe(true);
    // O fecho de 1988 acaba antes do título; o do ADCT, depois do art. 138.
    const fechos = cf.descartes.filter((d) => d.motivo === 'fecho');
    expect(fechos[0]?.linhas.fim).toBe((adct?.linhas.inicio ?? 0) - 1);
    const lcsp = await rascunho('lc-sp-988');
    const artigos = artigosDe(lcsp.nos).map((a) => a.endereco);
    expect(artigos.slice(artigos.indexOf('art244'), artigos.indexOf('art244') + 3)).toEqual([
      'art244',
      'dt.art1',
      'dt.art2',
    ]);
    expect(artigos[artigos.length - 1]).toBe('dt.art21');
    expect(lcsp.nos.some((n) => n.tipo === 'bloco')).toBe(false);
  }, 60_000);
});

/** Regra 7 no texto: parêntese com a chave de nota, ou "Vigência"/"Regulamento"/"Produção de efeitos" no fim. */
const NOTA_NO_TEXTO =
  /\((?:Reda[cç][aã]o dada|Inclu[ií]d[oa]|Revogad[oa] pel|Vide|Renumerad|Acrescid|Express[aã]o |NR\))|(?:Vig[eê]ncia|Regulamento|Produ[cç][aã]o de efeitos?)$/u;

/**
 * A nota com lei e ano mais recente de cada norma (8.5), só entre as que alteram o texto: sem o
 * "Vide", a da CF seria a "(Vide Lei Complementar nº 230, de 2026)" e a do CDC, o decreto que o
 * regulamenta (Decreto 11.034/2022).
 */
const MAIS_RECENTE: Record<string, { lei: string; ano: number }> = {
  lep: { lei: 'Lei nº 15.410', ano: 2026 },
  cp: { lei: 'Lei nº 15.517', ano: 2026 },
  lc80: { lei: 'Lei Complementar nº 132', ano: 2009 },
  'lc-sp-988': { lei: 'Lei Complementar nº 1.434', ano: 2025 },
  eca: { lei: 'Lei nº 15.512', ano: 2026 },
  cdc: { lei: 'Lei nº 14.181', ano: 2021 },
  cf: { lei: 'Emenda Constitucional nº 139', ano: 2026 },
};

describe('estruturador (8.5) no corpus: notas de vigência (regra 7)', () => {
  it.each(COM_GABARITO)(
    '%s: notas fora do texto, na contagem do gabarito e com o texto da amostra',
    async (id) => {
      const r = await rascunho(id);
      const achados = dispositivosDe(r.nos);
      const esperados = semRevogadosAusentes(
        dispositivosEsperados(await gabaritoDe(id)),
        achados.map((d) => d.endereco),
      );
      // A mesma lista da 8.4, com a contagem de notas de cada dispositivo.
      expect(achados.map((d) => [d.endereco, d.notas.length])).toEqual(
        esperados.map((e) => [e.endereco, e.notas]),
      );
      const notas = esperados.flatMap((e, k) =>
        e.texto === undefined ? [] : [[e.endereco, (achados[k]?.notas ?? []).map(paraComparar)]],
      );
      expect(notas).toEqual(
        esperados.flatMap((e) =>
          e.texto === undefined ? [] : [[e.endereco, e.texto.notas.map(paraComparar)]],
        ),
      );
      // Nenhuma nota no texto ("(Revogado)" sozinho é texto).
      expect(achados.filter((d) => NOTA_NO_TEXTO.test(d.texto)).map((d) => d.endereco)).toEqual([]);
      expect(r.notaVigenciaMaisRecente).toEqual(MAIS_RECENTE[id]);
    },
    60_000,
  );
});
