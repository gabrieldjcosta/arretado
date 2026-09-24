// Estruturador (8.2) sobre o corpus: a árvore estrutural (tipo, rótulo, nome e primeiro artigo de
// cada nó) bate com a do gabarito da 7.3, que não sai do estruturador; e os blocos pré-normativos
// (regra 2) das 11 páginas. Colados como texto pelo `?raw` do Vite: src/ não tem os tipos do Node.
import { sanitizarHtml } from '../../core/seguranca/sanitizador';
import { estruturaDe, estruturaEsperada, type Gabarito } from '../../testes/gabarito';
import { estruturar } from './estruturador';
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
const rascunhos = new Map<string, Promise<Rascunho>>();
function rascunho(id: string): Promise<Rascunho> {
  let r = rascunhos.get(id);
  if (!r) {
    const carregar = HTML[`../../../corpus/normas/${id}.colado.html`];
    if (!carregar) throw new Error(`sem colado: ${id}`);
    r = carregar().then((html) => estruturar(sanitizarHtml(html).blocos));
    rascunhos.set(id, r);
  }
  return r;
}

const COM_GABARITO = ['lep', 'cp', 'lc80', 'lc-sp-988', 'eca', 'cdc', 'cf'] as const;

describe('estruturador (8.2) no corpus', () => {
  it.each(COM_GABARITO)(
    'árvore estrutural × gabarito: %s',
    async (id) => {
      const gabarito = await GABARITOS[`../../../corpus/normas/${id}.gabarito.json`]?.();
      if (!gabarito) throw new Error(`sem gabarito: ${id}`);
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
      // Até a 8.6: tachado só na página com todas as redações; nada solto nas 11 páginas.
      const tipos = new Set(r.anomalias.map((a) => a.tipo));
      expect(tipos.has('redacao_anterior_nao_tratada')).toBe(!id.endsWith('-compilado'));
      expect(tipos.has('linha_solta')).toBe(false);
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
