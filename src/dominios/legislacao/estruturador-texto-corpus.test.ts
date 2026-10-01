// Reserva em texto puro (8.8) no corpus: o `text/plain` de cada página (`*.colado.txt`, o que o
// navegador entrega ao colar sem formatação, por `textoParaBlocos`) × a mesma página em HTML, que
// bate 100% com o gabarito (`estruturador-corpus.test.ts`). Sem tachado, a redação anterior sai das
// notas e da repetição do endereço (Parte 2 §10.6, regras 8 e 9 no texto puro): os dispositivos, o
// status, a renumeração, as notas e o número de redações de cada um ficam iguais aos do HTML, fora
// o que só o tachado diz (cada caso abaixo, com o porquê). Tudo "a confirmar" (regra 12), nenhum
// conflito (regra 13), nenhuma linha perdida. Colados como texto pelo `?raw` do Vite.
import { novoId } from '../../core/ids';
import { Dispositivo, Norma, TextoDeDispositivo, VersaoDeNorma } from '../../core/modelo';
import { sanitizarHtml, textoParaBlocos, type Bloco } from '../../core/seguranca/sanitizador';
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

const COLADOS = import.meta.glob<string>(
  ['../../../corpus/normas/*.colado.html', '../../../corpus/normas/*.colado.txt'],
  { query: '?raw', import: 'default', eager: false },
);

type Formato = 'html' | 'texto';
/** Cada colado é lido e estruturado uma vez por formato. */
const lidos = new Map<string, Promise<{ blocos: Bloco[]; rascunho: Rascunho }>>();
function ler(id: string, formato: Formato): Promise<{ blocos: Bloco[]; rascunho: Rascunho }> {
  const chave = `${id}.${formato}`;
  let lido = lidos.get(chave);
  if (!lido) {
    const carregar =
      COLADOS[`../../../corpus/normas/${id}.colado.${formato === 'html' ? 'html' : 'txt'}`];
    if (!carregar) throw new Error(`sem colado: ${chave}`);
    lido = carregar().then((conteudo) => {
      const blocos =
        formato === 'html' ? sanitizarHtml(conteudo).blocos : textoParaBlocos(conteudo);
      return { blocos, rascunho: estruturar(blocos, { formato }) };
    });
    lidos.set(chave, lido);
  }
  return lido;
}
const texto = async (id: string) => (await ler(id, 'texto')).rascunho;
const html = async (id: string) => (await ler(id, 'html')).rascunho;

const COM_GABARITO = ['lep', 'cp', 'lc80', 'lc-sp-988', 'eca', 'cdc', 'cf'] as const;
const COMPILADAS = ['lep-compilado', 'cp-compilado', 'eca-compilado', 'cdc-compilado'] as const;
const TODAS = [...COM_GABARITO, ...COMPILADAS];

/** Todos os nós, em pré-ordem, com o pai. */
function comPai(
  nos: readonly NoRascunho[],
  pai?: NoRascunho,
): { no: NoRascunho; pai?: NoRascunho }[] {
  return nos.flatMap((no) => [{ no, ...(pai ? { pai } : {}) }, ...comPai(no.filhos, no)]);
}

/**
 * Anomalias do texto puro, medidas em 01/10/2026 (versão 0.8). Nenhum conflito; o aviso dos 20%
 * em todas ("O texto chegou sem formatação"). Em relação ao HTML (`ANOMALIAS` de
 * `estruturador-corpus.test.ts`): a duplicata é cada cópia antiga fundida (no HTML, tachada); o
 * nó estrutural antigo logo antes do novo, sem artigo no meio, é `estrutural_substituido` (no
 * HTML, tachado: CP, Capítulos II e V do Título VI e o Título VI de 1940; LC-SP 988, Subseção VII;
 * CF, Título IV, Capítulo IV do Título IV, Seções III e V e o Capítulo IV do Título VIII); o
 * "CÓDIGO PENAL" de 1940 é o título oficial (no HTML, tachado e sem lugar); e o parágrafo único
 * antigo do art. 92 do CP, que o Planalto não tachou, vira redação (ver `PARAGRAFO_UNICO_ANTIGO`).
 */
const ANOMALIAS_DO_TEXTO: Record<string, Partial<Record<TipoAnomalia, number>>> = {
  lep: { duplicata: 64, alinea_sem_inciso: 24 },
  'lep-compilado': { alinea_sem_inciso: 24 },
  cp: {
    duplicata: 146,
    estrutural_substituido: 5,
    artigo_ausente: 1,
    alinea_sem_inciso: 27,
    paragrafo_unico_com_numerado: 1,
    paragrafo_1_sem_2: 2,
  },
  'cp-compilado': {
    artigo_ausente: 1,
    alinea_sem_inciso: 24,
    paragrafo_unico_com_numerado: 1,
    paragrafo_1_sem_2: 1,
  },
  lc80: {
    duplicata: 72,
    estrutural_repetido: 2,
    alinea_sem_inciso: 10,
    paragrafo_unico_com_numerado: 1,
  },
  'lc-sp-988': {
    duplicata: 104,
    estrutural_substituido: 1,
    linha_solta: 1,
    linha_continuada: 1,
    alinea_sem_inciso: 8,
    item_sem_alinea: 36,
  },
  eca: {
    duplicata: 144,
    alinea_sem_inciso: 28,
    item_sem_alinea: 5,
    paragrafo_unico_com_numerado: 1,
  },
  'eca-compilado': {
    linha_solta: 1,
    duplicata: 1,
    alinea_sem_inciso: 28,
    item_sem_alinea: 5,
    paragrafo_unico_com_numerado: 1,
  },
  cdc: { duplicata: 11, alinea_sem_inciso: 2 },
  'cdc-compilado': { alinea_sem_inciso: 2 },
  cf: { duplicata: 446, estrutural_substituido: 5 },
};

describe('reserva em texto puro (8.8) no corpus: tudo a confirmar, sem conflito, nada perdido', () => {
  it.each(TODAS)(
    '%s',
    async (id) => {
      const { blocos, rascunho: r } = await ler(id, 'texto');
      const nos = comPai(r.nos).map(({ no }) => no);
      // Regra 12: todo nó "a confirmar", e toda redação heurística, a confirmar.
      expect(nos.filter((n) => n.confianca !== 'a_confirmar').map((n) => n.endereco)).toEqual([]);
      expect(
        nos
          .flatMap((n) => n.redacoesAnteriores)
          .filter((x) => x.origemDeteccao !== 'heuristica' || x.confirmada).length,
      ).toBe(0);
      expect(r.linhasTachadas).toBe(0);
      expect(sumarioDoRascunho(r).pareceCompilada).toBe(false);
      // Regras 12 e 13: o aviso do texto puro, por último, e nenhum conflito.
      const porTipo: Partial<Record<TipoAnomalia, number>> = {};
      for (const a of r.anomalias) porTipo[a.tipo] = (porTipo[a.tipo] ?? 0) + 1;
      expect(porTipo).toEqual({ ...ANOMALIAS_DO_TEXTO[id], a_confirmar_acima_do_limite: 1 });
      expect(r.anomalias.filter((a) => a.gravidade === 'conflito')).toEqual([]);
      expect(r.anomalias.at(-1)?.mensagem).toMatch(
        /^O texto chegou sem formatação: ([\d.]+) de \1 dispositivos \(100%\) ficaram a confirmar\.$/,
      );
      // Os metadados e as notas da norma são os do HTML (sem o link, que o texto não traz, e com a
      // linha do texto); no CP, o título de 1940 ("CÓDIGO PENAL", tachado no HTML) é o título
      // oficial.
      const h = await html(id);
      expect(r.metadados).toEqual({
        ...h.metadados,
        ...(id === 'cp' ? { tituloOficial: 'CÓDIGO PENAL' } : {}),
      });
      const semLinhaNemLink = (ns: Rascunho['notasDaNorma']) =>
        ns.map((n) => [n.texto, n.tipo, n.lei, n.ano]);
      expect(r.notasDaNorma.every((n) => n.link === undefined)).toBe(true);
      expect(semLinhaNemLink(r.notasDaNorma)).toEqual(semLinhaNemLink(h.notasDaNorma));
      expect(r.notaVigenciaMaisRecente).toEqual(h.notaVigenciaMaisRecente);
      // Nenhuma linha some: do preâmbulo em diante, cada uma está na faixa de um nó, de uma
      // redação anterior (com a rubrica que a cópia antiga trazia: CP, art. 231, "Tráfico de
      // mulheres") ou de um descarte, é a linha de uma nota ou é o título oficial.
      const cobertas = new Set<number>();
      const cobrir = ({ inicio, fim }: { inicio: number; fim: number }) => {
        for (let i = inicio; i <= fim; i++) cobertas.add(i);
      };
      for (const d of r.descartes) cobrir(d.linhas);
      for (const no of nos) {
        cobrir(no.linhas);
        for (const x of no.redacoesAnteriores) cobrir(x.linhas);
        for (const n of no.notas) cobertas.add(n.linha);
      }
      const inicio = r.nos[0]?.linhas.inicio ?? 0;
      const linhas = prepararLinhas(normalizarBlocos(blocos).blocos);
      expect(
        linhas
          .filter(
            (l) => l.i >= inicio && !cobertas.has(l.i) && l.texto !== r.metadados.tituloOficial,
          )
          .map((l) => l.texto),
      ).toEqual([]);
      // Nenhuma nota de mudança some (achado na revisão da 8.8: a rubrica do revogado com texto e
      // o nó estrutural substituído perdiam as suas, 43 no CP): cada uma da entrada está na saída,
      // nas notas dos nós (e dos nomes), nas das redações, no texto (CF, art. 115: "… (Redação
      // dada…) }", a nota antes de um "}" da fonte), nas da norma ou numa linha descartada.
      const entrada = contarNotas(linhas.map((l) => l.texto));
      const saida = contarNotas([
        ...nos.flatMap((no) => [
          ...no.notas.map((n) => n.texto),
          textoDe(no.trechos),
          ...no.redacoesAnteriores.flatMap((x) => [x.nota ?? '', textoDe(x.trechos)]),
        ]),
        ...r.notasDaNorma.map((n) => n.texto),
        ...r.descartes.flatMap((d) =>
          linhas.slice(d.linhas.inicio, d.linhas.fim + 1).map((l) => l.texto),
        ),
      ]);
      expect(
        [...entrada].filter(([nota, n]) => (saida.get(nota) ?? 0) < n).map(([nota]) => nota),
      ).toEqual([]);
    },
    60_000,
  );
});

/** Nota de mudança: "(Redação dada…", "(Incluído…", "(Revogado pel…", "(Renumerado…". */
const NOTA_DE_MUDANCA =
  /\((?:Reda[cç][aã]o dada|Inclu[ií]d[oa]|Revogad[oa] pel|Renumerad[oa])[^()]*\)?/giu;

/** Quantas vezes cada nota de mudança aparece (sem o fecho nem a pontuação: "7.4.1997 :"). */
function contarNotas(textos: readonly string[]): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const t of textos)
    for (const m of t.match(NOTA_DE_MUDANCA) ?? []) {
      const nota = m.replace(/[\s:;.,)]+$/u, '').replace(/\s+/gu, ' ');
      contagem.set(nota, (contagem.get(nota) ?? 0) + 1);
    }
  return contagem;
}

interface NoComparado {
  endereco: string;
  status: string;
  renumeradoDe: string | null;
  notas: number;
  nome: string | null;
  /** O texto vigente com o tachado parcial lido como texto (o texto puro não o separa). */
  texto: string;
  redacoes: number;
  noAncestral: number;
}

const unificar = (s: string) => s.replace(/\s+/g, ' ').trim();

function comparaveis(nos: readonly NoRascunho[], fora = new Set<NoRascunho>()): NoComparado[] {
  return comPai(nos)
    .filter(({ no }) => no.tipo !== 'nome' && !fora.has(no))
    .map(({ no }) => {
      const nome = no.filhos.find((f) => f.tipo === 'nome');
      return {
        endereco: no.endereco,
        status: no.status,
        renumeradoDe: no.renumeradoDe ?? null,
        notas: no.notas.length,
        nome: nome ? unificar(textoDe(nome.trechos)) : null,
        texto: unificar(textoDe(no.trechos)),
        redacoes: no.redacoesAnteriores.length + (nome?.redacoesAnteriores.length ?? 0),
        noAncestral: no.redacoesAnteriores.filter((x) => x.enderecoLido !== undefined).length,
      };
    });
}

const vivo = (no: NoRascunho) => no.status !== 'revogado' && no.status !== 'vetado';

/**
 * O parágrafo único vivo seguido do § 1º vivo no mesmo pai é o antigo: no texto puro ele vai,
 * com a subárvore, para o pai, com o endereço lido (no HTML, tachado: CP, arts. 141, 147, 153, 266,
 * 288 e 327; CDC, arts. 8º e 65; LEP, arts. 34, 41 e 72; CF, art. 160…). Na página do CP, o
 * Planalto não tachou o do art. 92 (falha da fonte; aviso `paragrafo_unico_com_numerado` do HTML,
 * 8.7): o HTML o deixa vigente, e nada no texto o distingue do art. 288. A comparação aplica ao
 * HTML a mesma regra: o parágrafo único sai, e o pai fica com as redações dele e a dele.
 */
function comARegraDoParagrafoUnico(r: Rascunho): NoComparado[] {
  const fora = new Set<NoRascunho>();
  const aMais = new Map<string, number>();
  for (const { no } of comPai(r.nos)) {
    const [unico, primeiro] = no.filhos.filter((f) => f.tipo === 'paragrafo');
    if (
      !unico?.endereco.endsWith('.parUnico') ||
      !primeiro?.endereco.endsWith('.par1') ||
      !vivo(unico) ||
      !vivo(primeiro)
    )
      continue;
    for (const { no: d } of comPai([unico])) {
      if (d.tipo === 'nome') continue;
      fora.add(d);
      aMais.set(no.endereco, (aMais.get(no.endereco) ?? 0) + 1 + d.redacoesAnteriores.length);
    }
  }
  return comparaveis(r.nos, fora).map((c) => {
    const n = aMais.get(c.endereco) ?? 0;
    return n ? { ...c, redacoes: c.redacoes + n, noAncestral: c.noAncestral + n } : c;
  });
}

/** O parágrafo único antigo sem tachado, por página (a regra de `comARegraDoParagrafoUnico`). */
const PARAGRAFO_UNICO_ANTIGO: Record<string, string[]> = { cp: ['art92.parUnico'] };

/**
 * Onde a heurística erra contra o HTML, por endereço: [redações no texto, no HTML], com o nome
 * quando ele também muda. CP, art. 216, parágrafo único: as duas linhas antigas, sem nota
 * ("Parágrafo único - Se a ofendida é menor de dezoito…" e a pena), são uma redação; o tachado as
 * separa em duas. ECA (as duas páginas), Seção II do Capítulo III do Título VI do Livro II: o nome
 * "Da Perda e da Suspensão do ~~Pátrio Poder~~ Poder Familiar" tem o pedaço tachado, que o texto
 * puro não separa (tachado parcial: fica no nome, sem redação).
 */
const ONDE_ERRA: Record<string, Record<string, { redacoes: [number, number]; nome?: string }>> = {
  cp: { 'art216.parUnico': { redacoes: [3, 4] } },
  eca: {
    'parteEspecial.tit6.cap3.sec2': {
      redacoes: [0, 1],
      nome: 'Da Perda e da Suspensão do Pátrio Poder Poder Familiar',
    },
  },
  'eca-compilado': {
    'parteEspecial.tit6.cap3.sec2': {
      redacoes: [0, 1],
      nome: 'Da Perda e da Suspensão do Pátrio Poder Poder Familiar',
    },
  },
};

/**
 * Redações anteriores por página (do nó e do nome), texto puro × HTML, medidas em 01/10/2026: as
 * mesmas, fora `ONDE_ERRA`. No HTML, todas pelo tachado (fora as 3 heurísticas do CP); no texto
 * puro, todas pela heurística. No CP, o total bate por compensação: o art. 92 ganha 2 (o parágrafo
 * único antigo, `PARAGRAFO_UNICO_ANTIGO`, e a redação dele), e o art. 216, parágrafo único, perde 1.
 */
const REDACOES: Record<string, [number, number]> = {
  lep: [86, 86],
  cp: [907, 907],
  lc80: [87, 87],
  'lc-sp-988': [111, 111],
  eca: [198, 199],
  cdc: [14, 14],
  cf: [760, 760],
  'lep-compilado': [0, 0],
  'cp-compilado': [0, 0],
  'eca-compilado': [1, 2],
  'cdc-compilado': [0, 0],
};

describe('reserva em texto puro (8.8) no corpus × HTML: a mesma árvore', () => {
  it.each(TODAS)(
    '%s: dispositivos, status, renumeração, notas, texto vigente e redações',
    async (id) => {
      const t = comparaveis((await texto(id)).nos);
      const bruto = comparaveis((await html(id)).nos);
      const h = comARegraDoParagrafoUnico(await html(id));
      const naRegra = new Set(h.map((x) => x.endereco));
      expect(bruto.filter((c) => !naRegra.has(c.endereco)).map((c) => c.endereco)).toEqual(
        PARAGRAFO_UNICO_ANTIGO[id] ?? [],
      );
      // Endereço, status (com o renumerado e o vetado), a origem da renumeração e o número de
      // notas: iguais, na mesma ordem (nós estruturais, artigos e dispositivos).
      const forma = (c: NoComparado) => [c.endereco, c.status, c.renumeradoDe, c.notas];
      expect(t.map(forma)).toEqual(h.map(forma));
      // O texto vigente: igual, com o tachado parcial do HTML lido como texto (ECA, "pátrio poder
      // poder familiar"; LC-SP 988, a expressão declarada inconstitucional; CF, art. 100, § 11).
      const vigentes = (cs: NoComparado[]) =>
        cs.filter((c) => c.status !== 'revogado').map((c) => [c.endereco, c.texto]);
      expect(vigentes(t)).toEqual(vigentes(h));
      // As redações (do nó e do nome) e as que foram para o ancestral, fora `ONDE_ERRA`.
      const erros = ONDE_ERRA[id] ?? {};
      const diferencas = t.flatMap((c, k) => {
        const x = h[k];
        return x && (c.redacoes !== x.redacoes || c.noAncestral !== x.noAncestral)
          ? [[c.endereco, c.redacoes, x.redacoes]]
          : [];
      });
      expect(diferencas).toEqual(
        Object.entries(erros).map(([endereco, e]) => [endereco, ...e.redacoes]),
      );
      const total = (cs: NoComparado[]) => cs.reduce((n, c) => n + c.redacoes, 0);
      expect([total(t), total(bruto)]).toEqual(REDACOES[id]);
      // O nome (a rubrica): igual, fora `ONDE_ERRA`, e o revogado com texto cuja rubrica o HTML
      // não tacha (CP, arts. 121, § 2º, VI, 185, 279 e 350): no texto puro, ela vai para a
      // primeira redação, como quando vem tachada (CP, art. 187, e outros 33).
      const r = await texto(id);
      const porEndereco = new Map(comPai(r.nos).map(({ no }) => [no.endereco, no]));
      const nomes = t.flatMap((c, k) => {
        const x = h[k];
        if (!x || c.nome === x.nome) return [];
        const erro = erros[c.endereco];
        if (erro?.nome === c.nome) return [];
        const primeira = porEndereco.get(c.endereco)?.redacoesAnteriores[0];
        if (c.nome === null && c.status === 'revogado' && primeira)
          if (textoDe(primeira.trechos).startsWith(`${x.nome ?? ''}\n`)) return [];
        return [[c.endereco, c.nome, x.nome]];
      });
      expect(nomes).toEqual([]);
    },
    60_000,
  );

  // Regra 11 no texto puro: os dois "ANEXO" sem número (os subanexos antigos, tachados no HTML)
  // fundem como duplicata no "ANEXO - Revogado.", que fica com as duas antigas como redações
  // heurísticas, a confirmar, e a nota da revogação; o mesmo status e as mesmas faixas do HTML.
  it('o anexo da LC-SP 988: revogado, com a nota e as duas antigas como redações heurísticas', async () => {
    const anexoDe = (r: Rascunho) => r.nos[r.nos.length - 1];
    const t = anexoDe(await texto('lc-sp-988'));
    const h = anexoDe(await html('lc-sp-988'));
    expect(t).toMatchObject({
      tipo: 'anexo',
      endereco: 'anexo',
      status: 'revogado',
      trechos: [],
      confianca: 'a_confirmar',
      notas: [expect.objectContaining({ lei: 'Lei Complementar nº 1.112', ano: 2010 })],
    });
    expect(
      t?.redacoesAnteriores.map((x) => [
        x.origemDeteccao,
        x.confirmada,
        textoDe(x.trechos).split('\n')[0],
        x.linhas.fim - x.linhas.inicio + 1,
      ]),
    ).toEqual([
      [
        'heuristica',
        false,
        'ANEXO a que se refere o artigo 239, I, da Lei Complementar nº 988, de 9 de janeiro de 2006',
        h?.redacoesAnteriores[0] &&
          h.redacoesAnteriores[0].linhas.fim - h.redacoesAnteriores[0].linhas.inicio + 1,
      ],
      [
        'heuristica',
        false,
        'ANEXO a que se refere o artigo 240 da Lei Complementar nº 988, de 9 de janeiro de 2006',
        h?.redacoesAnteriores[1] &&
          h.redacoesAnteriores[1].linhas.fim - h.redacoesAnteriores[1].linhas.inicio + 1,
      ],
    ]);
  }, 60_000);
});

// A 9.2 grava o rascunho passando cada registro pelo esquema do modelo: o texto puro também (a
// origem `texto`, com tudo "a confirmar"). Conferido sem banco, nas 11 páginas.
describe('registros (9.2) no corpus, em texto puro: todo rascunho vira registros válidos', () => {
  const COMUNS = {
    usuarioId: novoId(),
    criadoEm: '2026-10-01T12:00:00.000Z',
    atualizadoEm: '2026-10-01T12:00:00.000Z',
    tsLogico: '1790000000000-000000-0000abcd',
    origem: 'importacao' as const,
    excluidoEm: null,
  };
  it.each(TODAS)(
    '%s',
    async (id) => {
      const r = await texto(id);
      const normaId = novoId();
      const versaoId = novoId();
      Norma.parse({ ...COMUNS, id: normaId, ...dadosDaNorma(r.metadados, {}) });
      VersaoDeNorma.parse({
        ...COMUNS,
        id: versaoId,
        normaId,
        status: 'rascunho',
        capturadaEm: COMUNS.criadoEm,
        origemEntrada: 'texto',
        hash: '0'.repeat(64),
        versaoAdaptador: r.versaoEstruturador,
        notaVigenciaMaisRecente: notaMaisRecenteDoModelo(r.notaVigenciaMaisRecente),
        notasDaNorma: notasDaNormaDoModelo(r.notasDaNorma),
      });
      const { dispositivos, textos } = registrosDaArvore(r.nos, { normaId, versaoId, novoId });
      dispositivos.forEach(({ id: dispositivoId, dados }, k) => {
        Dispositivo.parse({ ...COMUNS, id: dispositivoId, ...dados });
        expect(dados.ordem).toBe(k + 1);
        expect(dados.confianca).toBe('a_confirmar');
      });
      for (const { dados } of textos) {
        TextoDeDispositivo.parse({ ...COMUNS, id: novoId(), ...dados });
        for (const x of dados.redacoesAnteriores ?? [])
          expect([x.origemDeteccao, x.confirmada]).toEqual(['heuristica', false]);
      }
    },
    60_000,
  );
});
