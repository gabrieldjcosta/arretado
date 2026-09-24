// Estruturador sobre o corpus, contra o gabarito da 7.3, que não sai do estruturador: a árvore
// estrutural (tipo, rótulo, nome e primeiro artigo de cada nó; 8.2), os blocos pré-normativos
// (regra 2) das 11 páginas e os artigos, em ordem, sem sangria e com a rubrica (regras 4 e 5; 8.3).
// Colados como texto pelo `?raw` do Vite: src/ não tem os tipos do Node.
import { sanitizarHtml, type Bloco } from '../../core/seguranca/sanitizador';
import {
  artigosDe,
  artigosEsperados,
  estruturaDe,
  estruturaEsperada,
  semRevogadosAusentes,
  type ArtigoLido,
  type Gabarito,
} from '../../testes/gabarito';
import { estruturar } from './estruturador';
import { prepararLinhas, textoDe } from './linhas';
import { normalizarBlocos } from './normalizacao';
import type { Rascunho } from './rascunho';

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
      expect(estruturaDe((await rascunho(id)).nos)).toEqual(estruturaEsperada(id, gabarito));
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
      // Até a 8.6: tachado só na página com todas as redações. Solta, só a falha da fonte na
      // compilada do ECA: "eção I" (a Seção I do Capítulo II do Título I do Livro II sem o "S").
      const tipos = new Set(r.anomalias.map((a) => a.tipo));
      expect(tipos.has('redacao_anterior_nao_tratada')).toBe(!id.endsWith('-compilado'));
      expect(r.anomalias.filter((a) => a.tipo === 'linha_solta').map((a) => a.mensagem)).toEqual(
        id === 'eca-compilado' ? ['Linha fora de artigo: "eção I".'] : [],
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

/** Até a 8.6: artigos revogados todo tachados, fora da árvore (medido em 24/09/2026). */
const REVOGADOS_FORA: Record<string, number> = {
  lep: 1,
  cp: 27,
  lc80: 2,
  'lc-sp-988': 0,
  eca: 1,
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
      const todos = artigosEsperados(id, await gabaritoDe(id));
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
  // descarte `redacao_anterior` é a rubrica de artigo revogado todo tachado (até a 8.6).
  it.each([...COM_GABARITO, ...COMPILADAS])(
    '%s: linha vigente só vai para o descarte como rubrica de artigo revogado',
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
        artigosEsperados(id, gabarito).map((e) => e.endereco),
      );
      expect(sangrias(achados)).toEqual([]);
    },
    60_000,
  );
});
