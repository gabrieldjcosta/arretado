// Estruturador sobre o corpus, contra o gabarito da 7.3, que não sai do estruturador: a árvore
// estrutural (tipo, rótulo, nome e primeiro artigo de cada nó; 8.2), os blocos pré-normativos
// (regra 2) das 11 páginas, os artigos, em ordem, sem sangria e com a rubrica (regras 4 e 5; 8.3),
// os dispositivos da regra 6 com o endereço canônico, a rubrica e o texto da amostra (8.4) e as
// notas de vigência (regra 7; 8.5), fora do texto, na contagem do gabarito, o status e as
// redações anteriores de cada dispositivo (regras 8 a 10 e VETADO; 8.6), sem tolerância, e o
// anexo (regra 11), a confiança (regra 12) e o relatório de anomalias (regra 13; 8.7). E a métrica
// da regressão do corpus (8.9, `src/testes/metrica.ts`), por página, com a linha de base e o
// relatório, sobre o mesmo rascunho (cada página é sanitizada uma vez no arquivo).
// Colados como texto pelo `?raw` do Vite: src/ não tem os tipos do Node.
import { novoId } from '../../core/ids';
import { Dispositivo, Norma, TextoDeDispositivo, VersaoDeNorma } from '../../core/modelo';
import { sanitizarHtml, type Bloco } from '../../core/seguranca/sanitizador';
import {
  artigosDe,
  artigosEsperados,
  dispositivosDe,
  dispositivosEsperados,
  estruturaDe,
  estruturaEsperada,
  paraComparar,
  type ArtigoLido,
  type Gabarito,
} from '../../testes/gabarito';
import {
  compararComGabarito,
  compararComLinhaDeBase,
  gabaritosPendentes,
  linhaDoPortao,
  linhaDoRelatorio,
  PISO,
  PISO_DA_COMPILADA,
  redacoesEsperadas,
  resumoDasDivergencias,
  type LinhaDeBase,
} from '../../testes/metrica';
import { PROFUNDIDADE, type TipoDeDispositivo } from './dispositivo';
import { estruturar } from './estruturador';
import { prepararLinhas, textoDe } from './linhas';
import { normalizarBlocos } from './normalizacao';
import type { NoRascunho, Rascunho, TipoAnomalia } from './rascunho';
import {
  dadosDaNorma,
  notaMaisRecenteDoModelo,
  notasDaNormaDoModelo,
  registrosDaArvore,
} from './registros';
import { sumarioDoRascunho } from './sumario';
import { GRAVIDADE, validarEstrutura } from './validacao';

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
      // Tachado só na página com todas as redações. Soltas, só as falhas da fonte: na compilada do
      // ECA, "eção I" (a Seção I do Capítulo II do Título I do Livro II sem o "S"); na LC-SP 988, a
      // sobra antes do art. 6º, IV (caso `linha-solta` do gabarito). Tachado sem lugar, só o título
      // de 1940 do CP ("CÓDIGO PENAL", entre o preâmbulo e a Parte Geral de 1940, toda tachada).
      const tipos = new Set(r.anomalias.map((a) => a.tipo));
      expect(r.linhasTachadas > 0).toBe(!id.endsWith('-compilado'));
      expect(
        r.anomalias.filter((a) => a.tipo === 'tachado_sem_dispositivo').map((a) => a.mensagem),
      ).toEqual(id === 'cp' ? ['Linha tachada sem dispositivo: "CÓDIGO PENAL".'] : []);
      expect(r.anomalias.filter((a) => a.tipo === 'linha_solta').map((a) => a.mensagem)).toEqual(
        LINHAS_SOLTAS[id] ?? [],
      );
      expect(tipos.has('sem_artigos')).toBe(false);
      expect(r.anomalias.filter((a) => a.tipo === 'estrutural_substituido')).toHaveLength(
        id === 'cp' ? 2 : 0,
      );
      // Anexo depois da assinatura (regra 11): só na LC-SP 988.
      expect(r.nos.filter((n) => n.tipo === 'anexo').map((n) => n.endereco)).toEqual(
        id === 'lc-sp-988' ? ['anexo'] : [],
      );
      expect(r.nos[r.nos.length - 1]?.tipo === 'anexo').toBe(id === 'lc-sp-988');
    },
    60_000,
  );

  // Regra 11 e a regra 8 no anexo (8.7): os dois anexos antigos, todo tachados ("~~ANEXO~~ / ~~a
  // que se refere o artigo 239, I…~~" e "…artigo 240…"), são as redações anteriores do "ANEXO -
  // Revogado.", com a nota da ALESP logo depois dele; como no gabarito.
  it('o anexo da LC-SP 988: revogado, com a nota e as duas redações tachadas', async () => {
    const r = await rascunho('lc-sp-988');
    const anexo = r.nos[r.nos.length - 1];
    expect(anexo).toMatchObject({
      tipo: 'anexo',
      endereco: 'anexo',
      rotulo: 'ANEXO',
      rotuloLido: 'ANEXO -',
      status: 'revogado',
      trechos: [],
      confianca: 'alta',
      notas: [expect.objectContaining({ lei: 'Lei Complementar nº 1.112', ano: 2010 })],
    });
    expect(
      anexo?.redacoesAnteriores.map((x) => [
        x.origemDeteccao,
        x.confirmada,
        textoDe(x.trechos).split('\n').slice(0, 2),
        x.linhas.fim - x.linhas.inicio + 1,
      ]),
    ).toEqual([
      [
        'tachado',
        true,
        [
          'ANEXO',
          'a que se refere o artigo 239, I, da Lei Complementar nº 988, de 9 de janeiro de 2006',
        ],
        5,
      ],
      [
        'tachado',
        true,
        [
          'ANEXO',
          'a que se refere o artigo 240 da Lei Complementar nº 988, de 9 de janeiro de 2006',
        ],
        4,
      ],
    ]);
  }, 60_000);
});

/**
 * `Rascunho.linhasTachadas` (sumário da 9.5): LC-SP 988 164 desde a 8.7 (155 e as 9 linhas dos
 * dois anexos tachados; a linha tachada antes do primeiro "ANEXO" fica no fecho).
 */
const LINHAS_TACHADAS: Record<string, number> = {
  lep: 86,
  cp: 1_210,
  lc80: 87,
  'lc-sp-988': 164,
  eca: 209,
  cdc: 14,
  cf: 765,
};

/**
 * Regra 12 (8.7): os nós com confiança média, todos por heurística. No CP, as rubricas duvidosas
 * (art. 218-B, terminada em ponto; art. 360, "DISPOSIÇÕES FINAIS", título sem rótulo; o 281, só na
 * compilada), a duplicata do art. 141, § 2º, e o Título VI e o Capítulo I dele, substituídos; no
 * ECA, a duplicata do art. 263; na LC-SP 988, o art. 159, que recebe a linha continuada. Nenhum "a
 * confirmar" no HTML.
 */
const CONFIANCA_MEDIA: Record<string, string[]> = {
  cp: [
    'art141.par2',
    'art218B.nome',
    'art360.nome',
    'parteEspecial.tit6',
    'parteEspecial.tit6.cap1',
  ],
  'cp-compilado': ['art218B.nome', 'art281.nome', 'art360.nome'],
  eca: ['art263.parUnico'],
  'eca-compilado': ['art263.parUnico'],
  'lc-sp-988': ['art159'],
};

describe('estruturador (8.7) no corpus: linhas tachadas e confiança (regras 11 e 12)', () => {
  it.each([...COM_GABARITO, ...COMPILADAS])(
    '%s',
    async (id) => {
      const r = await rascunho(id);
      expect(r.linhasTachadas).toBe(LINHAS_TACHADAS[id] ?? 0);
      const naoAlta: [string, string][] = [];
      const pilha = [...r.nos];
      for (let no = pilha.pop(); no; no = pilha.pop()) {
        if (no.confianca !== 'alta') naoAlta.push([no.endereco, no.confianca]);
        pilha.push(...no.filhos);
      }
      naoAlta.sort(([a], [b]) => (a < b ? -1 : 1));
      expect(naoAlta).toEqual((CONFIANCA_MEDIA[id] ?? []).map((e) => [e, 'media']));
    },
    60_000,
  );
});

/**
 * Relatório de anomalias (regras 12 e 13, 8.7), medido em 30/09/2026: nenhum conflito nas 11
 * páginas. Alínea sem inciso (lei anterior à LC 95/1998; no CP, 24 vigentes e as 3 revogadas do
 * art. 224, que a compilada não tem) e item sem alínea (LC-SP 988; no ECA, o art. 263, que cita o
 * CP) só avisam. O resto, pelo endereço em `AVISOS_DA_VALIDACAO`.
 */
const ANOMALIAS: Record<string, Partial<Record<TipoAnomalia, number>>> = {
  lep: { alinea_sem_inciso: 24 },
  'lep-compilado': { alinea_sem_inciso: 24 },
  cp: {
    duplicata: 1,
    estrutural_substituido: 2,
    tachado_sem_dispositivo: 1,
    artigo_ausente: 1,
    alinea_sem_inciso: 27,
    paragrafo_unico_com_numerado: 2,
    paragrafo_1_sem_2: 2,
  },
  'cp-compilado': {
    artigo_ausente: 1,
    alinea_sem_inciso: 24,
    paragrafo_unico_com_numerado: 1,
    paragrafo_1_sem_2: 1,
  },
  lc80: { estrutural_repetido: 2, alinea_sem_inciso: 10, paragrafo_unico_com_numerado: 1 },
  'lc-sp-988': { linha_solta: 1, linha_continuada: 1, alinea_sem_inciso: 8, item_sem_alinea: 36 },
  eca: { duplicata: 1, alinea_sem_inciso: 28, item_sem_alinea: 5, paragrafo_unico_com_numerado: 1 },
  'eca-compilado': {
    linha_solta: 1,
    duplicata: 1,
    alinea_sem_inciso: 28,
    item_sem_alinea: 5,
    paragrafo_unico_com_numerado: 1,
  },
  cdc: { alinea_sem_inciso: 2 },
  'cdc-compilado': { alinea_sem_inciso: 2 },
  cf: {},
};

/**
 * Os avisos da regra 13 que não são alínea nem item, na ordem do relatório. CP: o art. 359-S some
 * com o Capítulo V, vetado (a página só traz "(VETADO)" sob ele); o art. 92 tem sem tachado o
 * antigo parágrafo único ao lado do § 1º (falha da fonte), e o 216-A, o parágrafo único vetado e o
 * § 2º; o art. 168 tem só o § 1º (lei válida), e no 234 a fonte rotula "§ 1º." o parágrafo único.
 * LC 80: as duas "SEÇÃO IV" e o art. 54 (parágrafo único e § 2º vetados). ECA: o art. 263 lê a
 * alteração do CP (§ 4º do art. 121 e parágrafo único do art. 213) como dispositivos.
 */
const AVISOS_DA_VALIDACAO: Record<string, [TipoAnomalia, string][]> = {
  cp: [
    ['artigo_ausente', 'art359T'],
    ['paragrafo_unico_com_numerado', 'art92'],
    ['paragrafo_unico_com_numerado', 'art216A'],
    ['paragrafo_1_sem_2', 'art168'],
    ['paragrafo_1_sem_2', 'art234'],
  ],
  'cp-compilado': [
    ['artigo_ausente', 'art359T'],
    ['paragrafo_unico_com_numerado', 'art216A'],
    ['paragrafo_1_sem_2', 'art168'],
  ],
  lc80: [
    ['estrutural_repetido', 'tit3.cap1.sec4'],
    ['estrutural_repetido', 'tit3.cap1.sec4.nome'],
    ['paragrafo_unico_com_numerado', 'art54'],
  ],
  eca: [['paragrafo_unico_com_numerado', 'art263']],
  'eca-compilado': [['paragrafo_unico_com_numerado', 'art263']],
};

describe('validação (8.7) no corpus: relatório de anomalias (regras 12 e 13)', () => {
  it.each([...COM_GABARITO, ...COMPILADAS])(
    '%s',
    async (id) => {
      const r = await rascunho(id);
      const porTipo: Partial<Record<TipoAnomalia, number>> = {};
      for (const a of r.anomalias) porTipo[a.tipo] = (porTipo[a.tipo] ?? 0) + 1;
      expect(porTipo).toEqual(ANOMALIAS[id]);
      expect(r.anomalias.filter((a) => a.gravidade === 'conflito')).toEqual([]);
      // Toda anomalia, da leitura ou da validação, tem a gravidade do mapa.
      expect(r.anomalias.filter((a) => a.gravidade !== GRAVIDADE[a.tipo])).toEqual([]);
      const validacao = validarEstrutura(r);
      expect(r.anomalias.slice(r.anomalias.length - validacao.length)).toEqual(validacao);
      expect(
        validacao
          .filter((a) => a.tipo !== 'alinea_sem_inciso' && a.tipo !== 'item_sem_alinea')
          .map((a) => [a.tipo, a.endereco]),
      ).toEqual(AVISOS_DA_VALIDACAO[id] ?? []);
      // A tela mostra uma linha por frase: uma só para todas as alíneas, uma para os itens.
      for (const tipo of ['alinea_sem_inciso', 'item_sem_alinea'] as const) {
        const frases = new Set(r.anomalias.filter((a) => a.tipo === tipo).map((a) => a.mensagem));
        expect(frases.size).toBe(porTipo[tipo] ? 1 : 0);
      }
    },
    60_000,
  );
});

/** Sobras da fonte (linha solta) e o título tachado de 1940 do CP. */
const SOBRAS: Record<string, string[]> = {
  cp: ['CÓDIGO PENAL'],
  'lc-sp-988': ['bracionalização na execução das funções;'],
  'eca-compilado': ['eção I'],
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
      // Todos os artigos do gabarito, os revogados todo tachados também (8.6), sem tolerância.
      const esperados = artigosEsperados(await gabaritoDe(id));
      expect(enderecos).toEqual(esperados.map((e) => e.endereco));
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

  // Salvaguarda da leitura antecipada, agora pela regra 8: nenhuma linha tachada vira texto
  // vigente, e nenhuma some. Cada uma fica numa redação anterior (também a do anexo tachado, 8.7),
  // no fecho ou, só o título de 1940 do CP ("CÓDIGO PENAL", antes da Parte Geral de 1940), numa
  // sobra com aviso; e `linhasTachadas` conta exatamente as de fora do cabeçalho e do fecho (no
  // corpus, nenhuma no texto bruto de um anexo vigente, onde ficaria com a marca e só contaria com
  // o anexo revogado). Linha vigente só é descarte no cabeçalho, no fecho e nas sobras conhecidas.
  it.each([...COM_GABARITO, ...COMPILADAS])(
    '%s: linha tachada nunca vira texto vigente nem some, e linha vigente não vai para o descarte',
    async (id) => {
      const { blocos, rascunho: r } = await entrada(id);
      const linhas = prepararLinhas(normalizarBlocos(blocos).blocos);
      const cobertas = new Set<number>();
      const cobrir = ({ inicio, fim }: { inicio: number; fim: number }) => {
        for (let i = inicio; i <= fim; i++) cobertas.add(i);
      };
      const foraDaNorma = new Set<number>();
      for (const d of r.descartes) {
        cobrir(d.linhas);
        if (d.motivo !== 'sobra')
          for (let i = d.linhas.inicio; i <= d.linhas.fim; i++) foraDaNorma.add(i);
      }
      const pilha = [...r.nos];
      for (let no = pilha.pop(); no; no = pilha.pop()) {
        for (const red of no.redacoesAnteriores) cobrir(red.linhas);
        pilha.push(...no.filhos);
      }
      const tachadas = linhas.filter((l) => l.tachada);
      expect(tachadas.length > 0).toBe(!id.endsWith('-compilado'));
      expect(tachadas.filter((l) => !cobertas.has(l.i)).map((l) => l.texto.slice(0, 60))).toEqual(
        [],
      );
      expect(r.linhasTachadas).toBe(tachadas.filter((l) => !foraDaNorma.has(l.i)).length);
      const sobras = r.descartes
        .filter((d) => d.motivo === 'sobra')
        .map((d) => textoDe(blocos[d.linhas.inicio]?.trechos ?? []));
      expect(sobras).toEqual(SOBRAS[id] ?? []);
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
 * "SEÇÃO IV" no Capítulo I do Título III (a segunda seria a V). A 8.7 avisa (`estrutural_repetido`).
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
      const esperados = dispositivosEsperados(await gabaritoDe(id));
      expect(enderecos).toEqual(esperados.map((e) => e.endereco));
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
      // Texto da amostra (sem o tachado parcial), com "Pena -" depois de uma quebra de linha:
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

/**
 * Regra 7 no texto: parêntese com a chave de nota ou com a renumeração dita a partir do
 * dispositivo ("(Parágrafo único renumerado…)", "(Transformado em § 1º…)", 8.7), ou
 * "Vigência"/"Regulamento"/"Produção de efeitos" no fim.
 */
const NOTA_NO_TEXTO =
  /\((?:Reda[cç][aã]o dada|Inclu[ií]d[oa]|Revogad[oa] pel|Vide|Renumerad|Acrescid|Express[aã]o |NR\)|(?:Par[áa]grafo(?: [úu]nico)?|§ ?\d+ ?[ºo°]?|Inciso [IVXLCDM]+|Al[íi]nea \S+|Item \d+) (?:[Rr]enumerad|[Tt]ransformad)|Transformad[oa]s? em)|(?:Vig[eê]ncia|Regulamento|Produ[cç][aã]o de efeitos?)$/u;

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
      const esperados = dispositivosEsperados(await gabaritoDe(id));
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

describe('estruturador (8.6) no corpus: redação anterior, revogado, renumerado e vetado', () => {
  it.each(COM_GABARITO)(
    '%s: status e redações anteriores de cada dispositivo × gabarito (100%, no endereço certo)',
    async (id) => {
      const gabarito = await gabaritoDe(id);
      const achados = dispositivosDe((await rascunho(id)).nos);
      const porEndereco = new Map(achados.map((d) => [d.endereco, d]));
      // As duas exceções são as regras da métrica (8.9): o tachado parcial sai da conta do gabarito
      // (regra (a), em `dispositivosEsperados`), e a redação de inciso com sufixo sem hífen, que o
      // gabarito não lê, entra (regra (b), `redacoesEsperadas`: CF, art. 93, "~~VIIIA a remoção…~~").
      expect(achados.map((d) => [d.endereco, d.status, d.redacoes])).toEqual(
        dispositivosEsperados(gabarito).map((e) => [
          e.endereco,
          e.status,
          redacoesEsperadas(e, porEndereco.get(e.endereco)),
        ]),
      );
      // As que foram para o ancestral (`enderecoLido`): a Parte Geral de 1940 do CP e as outras.
      expect(achados.reduce((n, d) => n + d.noAncestral, 0)).toBe(
        gabarito.contagens.redacoesNoAncestral,
      );
    },
    60_000,
  );

  it.each([...COM_GABARITO, ...COMPILADAS])(
    '%s: redação por tachado nasce confirmada; a heurística (duplicata), a confirmar',
    async (id) => {
      const r = await rascunho(id);
      const redacoes = comPai(r.nos).flatMap(({ no }) => no.redacoesAnteriores);
      expect(redacoes.filter((x) => (x.origemDeteccao === 'tachado') !== x.confirmada)).toEqual([]);
      // Nas compiladas, nenhuma redação por linha tachada: só o nome com pedaço tachado (ECA, Seção
      // II) e a duplicata do art. 263 do ECA.
      if (id.endsWith('-compilado')) expect(redacoes.length).toBe(id === 'eca-compilado' ? 2 : 0);
    },
    60_000,
  );

  it('nota de renumeração que começa pelo dispositivo (8.7): fora do texto, com o status e a origem', async () => {
    const lidos: unknown[][] = [];
    for (const [id, endereco] of [
      ['cp', 'art153.par1'],
      ['cp-compilado', 'art153.par1'],
      ['cf', 'art102.par1'],
      ['cf', 'art198.par1'],
    ] as const) {
      const no = comPai((await rascunho(id)).nos).find((x) => x.no.endereco === endereco)?.no;
      lidos.push([
        id,
        endereco,
        no?.status,
        no?.renumeradoDe,
        textoDe(no?.trechos ?? []).slice(-24),
        no?.notas.map((n) => n.texto),
      ]);
    }
    expect(lidos).toEqual([
      [
        'cp',
        'art153.par1',
        'renumerado',
        'art153.parUnico',
        ' mediante representação.',
        ['(Parágrafo único renumerado pela Lei nº 9.983, de 2000)'],
      ],
      [
        'cp-compilado',
        'art153.par1',
        'renumerado',
        'art153.parUnico',
        ' mediante representação.',
        ['(Parágrafo único renumerado pela Lei nº 9.983, de 2000)'],
      ],
      [
        'cf',
        'art102.par1',
        'renumerado',
        undefined,
        'ederal, na forma da lei.',
        ['(Transformado em § 1º pela Emenda Constitucional nº 3, de 17/03/93)'],
      ],
      [
        'cf',
        'art198.par1',
        'renumerado',
        'art198.parUnico',
        ', além de outras fontes.',
        ['(Parágrafo único renumerado para § 1º pela Emenda Constitucional nº 29, de 2000)'],
      ],
    ]);
  }, 60_000);
});

/** Os renumerados (regra 10) das páginas, iguais na compilada. */
const RENUMERADOS = {
  lep: ['art34.par1', 'art83.par1'],
  cp: ['art153.par1'],
  eca: ['art14.par1', 'art208.par1'],
};

/**
 * Linha de base da métrica (8.9), medida em 01/10/2026 (estruturador 0.8), por página: os corretos,
 * o denominador (`total + aMais`), cada divergência (endereço e motivo) e os renumerados, que o
 * gabarito não lê (o renumerado é `vigente` nele). As 7 páginas com todas as redações estão em 100%,
 * sem divergência. As das compiladas são da fonte, não do estruturador (cada uma com o porquê).
 * `compararComLinhaDeBase` diz "caiu" ou "mudou" e lista cada diferença; a causa pode ser o
 * estruturador ou o gabarito (a reconferência do Gabriel o muda): examinar antes de gravar o número
 * novo aqui, no mesmo commit.
 */
const LINHA_DE_BASE: Record<string, LinhaDeBase> = {
  lep: { corretos: 736, de: 736, renumerados: RENUMERADOS.lep },
  cp: { corretos: 1_422, de: 1_422, renumerados: RENUMERADOS.cp },
  lc80: { corretos: 719, de: 719, renumerados: ['art104.par1'] },
  'lc-sp-988': { corretos: 1_053, de: 1_053, renumerados: ['art134.incXI', 'art134.par1'] },
  eca: { corretos: 1_265, de: 1_265, renumerados: RENUMERADOS.eca },
  cdc: { corretos: 471, de: 471 },
  cf: {
    corretos: 3_374,
    de: 3_374,
    renumerados: [
      'art28.par1',
      ...['VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'].map((n) => `art29.inc${n}`),
      ...['art98', 'art102', 'art107', 'art134', 'art160', 'art169'].map((a) => `${a}.par1`),
      'art177.par3',
      'art198.par1',
      'adct.art71.par1',
    ],
  },
  'lep-compilado': {
    corretos: 723,
    de: 727,
    renumerados: RENUMERADOS.lep,
    divergencias: [
      'art9A.par1: ausente', // omitido na compilada
      'art18A.par3: notas', // "7.627"
      'art112.par5: notas', // "(Vigência)"
      'art112.par6: notas', // "(Vigência)"
    ],
  },
  'cp-compilado': {
    corretos: 1_357,
    de: 1_372,
    renumerados: RENUMERADOS.cp,
    divergencias: [
      'art47.incIII: notas', // "Redação dada" × "Incluído"
      'art92.parUnico: ausente', // o antigo, sem tachado na página
      'art121.par6: notas', // nota só na compilada
      'art148.par1.incIII: texto', // "quinze" × "15 (quinze)"
      'art169.parUnico.incII: texto', // idem
      // A compilada rotula "Parágrafo único" o que a página rotula "§ 1º." (4 a menos, 4 a mais).
      ...['', '.incI', '.incII', '.incIII'].map((s) => `art234.par1${s}: ausente`),
      // Revogados que a página só tem tachados (o gabarito os leva para a redação do art. 51).
      'art51.par1: a_mais',
      'art51.par2: a_mais',
      ...['', '.incI', '.incII', '.incIII'].map((s) => `art234.parUnico${s}: a_mais`),
    ],
  },
  'eca-compilado': { corretos: 1_262, de: 1_262, renumerados: RENUMERADOS.eca },
  'cdc-compilado': {
    corretos: 467,
    de: 471,
    // "Vide" e "(Vigência)" que a compilada omite ou acrescenta.
    divergencias: ['art82: notas', 'art99: notas', 'art100: notas', 'art100.parUnico: notas'],
  },
};

/**
 * Onde as regras de exceção da métrica valem no corpus, para nenhuma passar a cobrir outro caso sem
 * ser vista: (a) tachado parcial (ECA 16, LC-SP 988 4, CF 1), (b) sufixo sem hífen (CF, art. 93,
 * VIII-A) e (c) filhos do revogado que a compilada resume (LEP: arts. 124 e 182; CP: 56, dos arts.
 * 121, §§ 2º-A e 7º, 188, 214, 231, 281, 350…; ECA: art. 233). As outras páginas, zero.
 */
const EXCECOES: Record<
  string,
  { tachadoParcial?: number; sufixoSemHifen?: number; resumidos?: number }
> = {
  'lc-sp-988': { tachadoParcial: 4 },
  eca: { tachadoParcial: 16 },
  cf: { tachadoParcial: 1, sufixoSemHifen: 1 },
  'lep-compilado': { resumidos: 9 },
  'cp-compilado': { resumidos: 56 },
  'eca-compilado': { resumidos: 3 },
};

/**
 * Gabaritos ainda `pendente` (7.3), na ordem de `COM_GABARITO`. A métrica roda com eles; o portão
 * da F2 (13.4) só se declara medido com a lista vazia (decisão de 01/10/2026).
 */
const GABARITOS_PENDENTES = ['cp', 'eca', 'cdc', 'cf'];

describe('regressão do corpus (8.9): métrica estruturador × gabarito', () => {
  const relatorio = new Map<string, string>();
  const pendentes = async () =>
    gabaritosPendentes(
      await Promise.all(COM_GABARITO.map(async (id) => [id, await gabaritoDe(id)] as const)),
    );

  // Uma linha por página e, à parte, os gabaritos não conferidos (o portão não está medido).
  afterAll(async () => {
    console.info(
      [
        'Métrica do corpus (8.9): corretos/total (%), duplicados, redações no endereço certo, conferência do gabarito',
        ...[...COM_GABARITO, ...COMPILADAS].flatMap((id) => relatorio.get(id) ?? []),
        linhaDoPortao(await pendentes()),
      ].join('\n'),
    );
  });

  it.each([...COM_GABARITO, ...COMPILADAS])(
    '%s: ≥ piso, 0 duplicados, 100% das redações (fora a compilada) e a linha de base',
    async (id) => {
      const r = await rascunho(id);
      const compilada = id.endsWith('-compilado');
      const gabarito = await gabaritoDe(id.replace('-compilado', ''));
      const m = compararComGabarito(
        { dispositivos: dispositivosDe(r.nos), anomalias: r.anomalias },
        gabarito,
        { compilada },
      );
      relatorio.set(id, linhaDoRelatorio(id, m, gabarito.conferencia.estado));
      const divergencias = resumoDasDivergencias(m);
      expect(m.percentual, divergencias).toBeGreaterThanOrEqual(
        compilada ? PISO_DA_COMPILADA : PISO,
      );
      expect(m.duplicados).toEqual([]);
      // A compilada não tem tachado: as redações do gabarito são da página com todas as redações.
      if (compilada) expect(m.redacoes).toBeUndefined();
      else expect(m.redacoes?.completas, divergencias).toBe(true);
      expect({
        tachadoParcial: m.redacoes?.tachadoParcial ?? 0,
        sufixoSemHifen: m.redacoes?.sufixoSemHifen ?? 0,
        resumidos: m.resumidos,
      }).toEqual({ tachadoParcial: 0, sufixoSemHifen: 0, resumidos: 0, ...EXCECOES[id] });
      const base = LINHA_DE_BASE[id];
      if (!base) throw new Error(`sem linha de base: ${id}`);
      expect(compararComLinhaDeBase(m, base), divergencias).toBeUndefined();
    },
    60_000,
  );

  it('gabaritos ainda não conferidos pelo Gabriel: o portão (13.4) não está medido', async () => {
    expect(
      await pendentes(),
      'A conferência dos gabaritos mudou. A sessão que registrar a conferência do Gabriel no ' +
        'gabarito atualiza GABARITOS_PENDENTES e, em docs/planos/F2.md, os "Fatos da regressão do ' +
        'corpus (8.9)" (a tabela e "Portão não medido"), a linha 8.9 do Andamento e a do critério ' +
        'do portão ("LEP e CP do Planalto…"), que listam os pendentes. Se o gabarito mudou, a ' +
        'LINHA_DE_BASE muda junto: examinar cada diferença (gabarito corrigido × estruturador) ' +
        'antes de gravar. O portão da F2 (13.4) só se declara medido com a lista vazia.',
    ).toEqual(GABARITOS_PENDENTES);
  });
});

// A 9.2 grava o rascunho passando cada registro pelo esquema do modelo: um só inválido (link que o
// zod recusa, rótulo acima do limite) recusaria a norma inteira. Conferido sem banco, nas 11 páginas.
describe('registros (9.2) no corpus: todo rascunho vira registros válidos do modelo', () => {
  const COMUNS = {
    usuarioId: novoId(),
    criadoEm: '2026-09-23T12:00:00.000Z',
    atualizadoEm: '2026-09-23T12:00:00.000Z',
    tsLogico: '1758628800000-000000-0000abcd',
    origem: 'importacao' as const,
    excluidoEm: null,
  };
  it.each([...COM_GABARITO, ...COMPILADAS])(
    '%s',
    async (id) => {
      const r = await rascunho(id);
      const normaId = novoId();
      const versaoId = novoId();
      Norma.parse({ ...COMUNS, id: normaId, ...dadosDaNorma(r.metadados, {}) });
      VersaoDeNorma.parse({
        ...COMUNS,
        id: versaoId,
        normaId,
        status: 'rascunho',
        capturadaEm: COMUNS.criadoEm,
        origemEntrada: 'html',
        hash: '0'.repeat(64),
        versaoAdaptador: r.versaoEstruturador,
        notaVigenciaMaisRecente: notaMaisRecenteDoModelo(r.notaVigenciaMaisRecente),
        notasDaNorma: notasDaNormaDoModelo(r.notasDaNorma),
      });
      const { dispositivos, textos } = registrosDaArvore(r.nos, { normaId, versaoId, novoId });
      const vistos = new Set<string>();
      dispositivos.forEach(({ id: dispositivoId, dados }, k) => {
        Dispositivo.parse({ ...COMUNS, id: dispositivoId, ...dados });
        expect(dados.ordem).toBe(k + 1);
        if (dados.paiId !== undefined) expect(vistos.has(dados.paiId)).toBe(true);
        vistos.add(dispositivoId);
      });
      expect(textos.map((t) => t.dados.dispositivoId)).toEqual(dispositivos.map((d) => d.id));
      for (const { dados } of textos)
        TextoDeDispositivo.parse({ ...COMUNS, id: novoId(), ...dados });
    },
    60_000,
  );
});

describe('sumário (9.5) no corpus: a página compilada se reconhece pela falta de tachado', () => {
  it.each([...COM_GABARITO, ...COMPILADAS])(
    '%s',
    async (id) => {
      const sumario = sumarioDoRascunho(await rascunho(id));
      // Aviso "Nenhuma redação anterior depois de colar": só nas compiladas.
      expect(sumario.pareceCompilada).toBe(id.endsWith('-compilado'));
      const artigos = sumario.porTipo.find((t) => t.tipo === 'artigo')?.quantidade ?? 0;
      expect(artigos).toBeGreaterThan(100);
    },
    60_000,
  );
});
