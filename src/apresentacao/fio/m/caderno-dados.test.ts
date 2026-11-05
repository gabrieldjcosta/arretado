import { aderirAoItem } from '../../../dominios/acervo/adesao';
import type { ItemDoAcervo } from '../../../dominios/acervo/esquemas';
import { FonteEmMemoria } from '../../../dominios/acervo/fonte-em-memoria';
import { abrirNorma } from '../../../dominios/legislacao/leitor';
import { criarFraseDeTrecho, registrarErro } from '../../../dominios/recall/servico';
import { repositorioDeTeste } from '../../../testes/repositorio';
import {
  carregarCaderno,
  carregarPrimeiras,
  comORotulo,
  FRASES_POR_PAGINA,
  PAGINAS_ATE_A_FRASE,
  pedacosDaLei,
  quandoVolta,
  rotuloDaOrigem,
} from './caderno-dados';

const TEXTO_DO_INCISO = '25% da pena, se o apenado for primário e o prazo for de 30 dias;';
/** Como o "Ler na lei" o mostra: o numeral e o travessão antes do texto, como a lei imprime o inciso. */
const INCISO_COMO_SE_LE = `III – ${TEXTO_DO_INCISO}`;

const no = (
  endereco: string,
  rotulo: string,
  tipo: 'artigo' | 'inciso' | 'sumula',
  texto: string,
  pai?: string,
) => ({
  endereco,
  ...(pai ? { pai } : {}),
  categoria: 'normativo' as const,
  tipo,
  rotulo,
  status: 'vigente' as const,
  confianca: 'alta' as const,
  trechos: [{ texto }],
});

const lep: ItemDoAcervo = {
  id: 'lep',
  versao: 1,
  norma: { tituloCurto: 'LEP', tipo: 'Lei', esfera: 'federal' },
  nos: [
    no('art112', 'Art. 112', 'artigo', 'A pena será executada de forma progressiva.'),
    no('art112.incIII', 'III', 'inciso', TEXTO_DO_INCISO, 'art112'),
  ],
};

const sumulas: ItemDoAcervo = {
  id: 'sumulas-stj',
  versao: 1,
  norma: { tituloCurto: 'Súmulas STJ', tipo: 'Súmulas', esfera: 'federal', especie: 'sumulas' },
  nos: [no('s593', 'Súmula 593', 'sumula', 'O crime é de ação penal pública.')],
};

async function cenario() {
  const { repo, relogio } = await repositorioDeTeste();
  const fonte = await FonteEmMemoria.criar([{ item: lep }, { item: sumulas }]);
  const ids: Record<string, string> = {};
  for (const entrada of (await fonte.listar()).itens) {
    const r = await aderirAoItem(repo, fonte, entrada);
    if (r.estado === 'adicionada') ids[entrada.id] = r.normaId;
  }
  const aberta = async (chave: 'lep' | 'sumulas-stj') => abrirNorma(repo, ids[chave] ?? '');
  /** O dispositivo de um endereço da norma, com o texto que ele tem. */
  const dispositivo = async (chave: 'lep' | 'sumulas-stj', endereco: string) => {
    const norma = await aberta(chave);
    const achado = norma.nos.find((n) => n.dispositivo.endereco === endereco);
    if (!achado) throw new Error(`sem ${endereco}`);
    return { id: achado.dispositivo.id, versaoId: norma.versao.id };
  };
  /** Uma Frase tirada de um dispositivo, como o "Enviar às frases" e o Guardar a fazem. */
  const frasePorTrecho = async (
    chave: 'lep' | 'sumulas-stj',
    endereco: string,
    texto: string,
    sobre = texto,
  ) => {
    const d = await dispositivo(chave, endereco);
    return criarFraseDeTrecho(repo, {
      texto,
      trecho: {
        dispositivoId: d.id,
        versaoId: d.versaoId,
        texto: sobre,
        inicio: 0,
        fim: sobre.length,
      },
    });
  };
  return { repo, relogio, ids, dispositivo, frasePorTrecho };
}

describe('quando a Frase volta', () => {
  it('atrasada ou de hoje é "hoje" (nada que soe como dívida); amanhã e depois dizem os dias', () => {
    expect(quandoVolta('2026-09-20', '2026-09-23')).toBe('volta hoje');
    expect(quandoVolta('2026-09-23', '2026-09-23')).toBe('volta hoje');
    expect(quandoVolta('2026-09-24', '2026-09-23')).toBe('volta amanhã');
    expect(quandoVolta('2026-09-28', '2026-09-23')).toBe('volta em 5 dias');
  });
});

describe('de onde a Frase veio', () => {
  it('diz em palavras de quem estuda', () => {
    expect(rotuloDaOrigem({ origemTipo: 'erro' })).toBe('De um erro');
    expect(rotuloDaOrigem({ origemTipo: 'trecho' })).toBe('Da lei');
    expect(
      rotuloDaOrigem({
        origemTipo: 'trecho',
        trechoDeNota: { notaId: 'n', texto: 'x', inicio: 0, fim: 1 },
      }),
    ).toBe('De um resumo');
    expect(
      rotuloDaOrigem({
        origemTipo: 'trecho',
        trechoDePrecedente: { precedenteId: 'p', texto: 'x', inicio: 0, fim: 1 },
      }),
    ).toBe('De um precedente');
    expect(rotuloDaOrigem({ origemTipo: 'manual' })).toBe('Escrita por você');
    expect(rotuloDaOrigem({ origemTipo: 'ia' })).toBe('Sugerida');
  });
});

describe('o texto da lei com os grifos do app', () => {
  it('parte o texto sem perder uma letra e marca o que o app grifa', () => {
    const pedacos = pedacosDaLei(`  ${TEXTO_DO_INCISO}  `);
    expect(pedacos.map((p) => p.texto).join('')).toBe(TEXTO_DO_INCISO);
    const grifados = pedacos.filter((p) => p.grifo).map((p) => p.texto);
    expect(grifados.length).toBeGreaterThan(0);
    expect(grifados.join(' ')).toMatch(/30 dias/);
  });

  it('texto sem nada a grifar é um pedaço só', () => {
    expect(pedacosDaLei('A pena será executada.')).toEqual([
      { texto: 'A pena será executada.', grifo: false },
    ]);
    expect(pedacosDaLei('   ')).toEqual([]);
  });
});

describe('o texto da lei como a lei o imprime', () => {
  it('o inciso leva o numeral e o travessão; a alínea e o parágrafo, o rótulo; o artigo e a súmula, só o texto', () => {
    expect(comORotulo({ tipo: 'inciso', rotulo: 'II' }, '20% da pena;')).toBe('II – 20% da pena;');
    expect(comORotulo({ tipo: 'alinea', rotulo: 'a)' }, 'o juiz;')).toBe('a) o juiz;');
    expect(comORotulo({ tipo: 'paragrafo', rotulo: '§ 1º' }, 'Em todos os casos.')).toBe(
      '§ 1º Em todos os casos.',
    );
    expect(comORotulo({ tipo: 'item', rotulo: '1.' }, 'a pena.')).toBe('1. a pena.');
    expect(comORotulo({ tipo: 'artigo', rotulo: 'Art. 112' }, 'A pena será progressiva.')).toBe(
      'A pena será progressiva.',
    );
    expect(comORotulo({ tipo: 'sumula', rotulo: 'Súmula 593' }, 'O crime é de ação pública.')).toBe(
      'O crime é de ação pública.',
    );
  });

  it('sem rótulo ou sem texto, não inventa nada', () => {
    expect(comORotulo({ tipo: 'inciso' }, 'texto')).toBe('texto');
    expect(comORotulo({ tipo: 'inciso', rotulo: 'III' }, '')).toBe('');
  });
});

describe('o Caderno de Frases', () => {
  it('lista as Frases ativas da mais nova à mais velha, com a origem, quando volta e o artigo da lei', async () => {
    const { repo, relogio, frasePorTrecho } = await cenario();
    await registrarErro(repo, { fraseCorreta: 'Reincidente sem violência progride com 20%.' });
    relogio.avancar(60_000);
    await repo.colecao('frases').criar({
      texto: 'A progressão é decidida pelo juiz.',
      origemTipo: 'manual',
      estado: 'ativa',
      proximaRevisao: '2026-09-30',
    });
    relogio.avancar(60_000);
    await frasePorTrecho('lep', 'art112.incIII', TEXTO_DO_INCISO);

    const { frases, proximoCursor } = await carregarCaderno(repo);
    expect(proximoCursor).toBeNull();
    expect(frases.map((f) => f.origem)).toEqual(['Da lei', 'Escrita por você', 'De um erro']);

    const [daLei, manual, doErro] = frases;
    expect(daLei).toMatchObject({
      texto: TEXTO_DO_INCISO,
      artigo: 'LEP, art. 112, III',
      volta: 'volta amanhã',
      nova: true,
    });
    expect(daLei?.lei?.citacao).toBe('LEP, art. 112, III');
    expect(daLei?.lei?.pedacos.map((p) => p.texto).join('')).toBe(INCISO_COMO_SE_LE);
    expect(daLei?.lei?.pedacos.some((p) => p.grifo)).toBe(true);
    // Só a mais nova do caderno acende a borda ("a que acabou de entrar"), mesmo que as outras também sejam de hoje.
    expect(frases.map((f) => f.nova)).toEqual([true, false, false]);
    // A que o pessoa escreveu e a do erro não vêm de um dispositivo: sem artigo e sem "Ler na lei".
    expect(manual).toMatchObject({ artigo: undefined, lei: undefined, volta: 'volta em 7 dias' });
    expect(doErro).toMatchObject({ artigo: undefined, lei: undefined, volta: 'volta amanhã' });
  });

  it('a Frase tirada de uma súmula cita o rótulo dela, e a "nova" é só a de hoje', async () => {
    const { repo, relogio, frasePorTrecho } = await cenario();
    await frasePorTrecho('sumulas-stj', 's593', 'O crime é de ação penal pública.');
    relogio.avancar(2 * 86_400_000);
    const [frase] = (await carregarCaderno(repo)).frases;
    expect(frase).toMatchObject({
      artigo: 'Súmulas STJ, Súmula 593',
      volta: 'volta hoje',
      nova: false,
    });
  });

  it('o elo que quebrou deixa a Frase na lista, sem artigo', async () => {
    const { repo } = await cenario();
    await criarFraseDeTrecho(repo, {
      texto: 'Uma Frase de um dispositivo que sumiu.',
      trecho: { dispositivoId: crypto.randomUUID(), texto: 'x', inicio: 0, fim: 1 },
    });
    const { frases } = await carregarCaderno(repo);
    expect(frases).toHaveLength(1);
    expect(frases[0]).toMatchObject({ origem: 'Da lei', artigo: undefined, lei: undefined });
  });

  it('as arquivadas não entram, e a lista vem em páginas', async () => {
    const { repo, relogio } = await cenario();
    const feitas: string[] = [];
    for (let i = 0; i < 5; i++) {
      relogio.avancar(60_000);
      const f = await repo.colecao('frases').criar({
        texto: `Frase ${String(i)}`,
        origemTipo: 'manual',
        estado: 'ativa',
        proximaRevisao: '2026-09-24',
      });
      feitas.push(f.id);
    }
    await repo.colecao('frases').atualizar(feitas[0] ?? '', { estado: 'arquivada' });

    const primeira = await carregarCaderno(repo, null, 2);
    expect(primeira.frases.map((f) => f.texto)).toEqual(['Frase 4', 'Frase 3']);
    expect(primeira.proximoCursor).not.toBeNull();
    const segunda = await carregarCaderno(repo, primeira.proximoCursor, 2);
    expect(segunda.frases.map((f) => f.texto)).toEqual(['Frase 2', 'Frase 1']);
    // A arquivada ficou de fora: não há terceira página.
    expect(segunda.proximoCursor).toBeNull();
  });

  it('sem Frase nenhuma, a lista é vazia; a página padrão é de 50', async () => {
    const { repo } = await cenario();
    expect(await carregarCaderno(repo)).toEqual({ frases: [], proximoCursor: null });
    expect(FRASES_POR_PAGINA).toBe(50);
  });
});

describe('a primeira carga do Caderno', () => {
  /** Sete Frases escritas à mão, uma por minuto: `ids[0]` é a mais velha. */
  async function sete() {
    const { repo, relogio } = await cenario();
    const ids: string[] = [];
    for (let i = 0; i < 7; i++) {
      relogio.avancar(60_000);
      const f = await repo.colecao('frases').criar({
        texto: `Frase ${String(i)}`,
        origemTipo: 'manual',
        estado: 'ativa',
        proximaRevisao: '2026-09-30',
      });
      ids.push(f.id);
    }
    return { repo, ids };
  }

  it('sem Frase a achar, é só a primeira página, com o cursor de onde "Mostrar mais" continua', async () => {
    const { repo } = await sete();
    const carga = await carregarPrimeiras(repo, undefined, { limite: 3 });
    expect(carga.frases.map((f) => f.texto)).toEqual(['Frase 6', 'Frase 5', 'Frase 4']);
    expect(carga.cursor).not.toBeNull();
  });

  it('com a Frase da busca na primeira página, não lê mais nada', async () => {
    const { repo, ids } = await sete();
    const carga = await carregarPrimeiras(repo, ids[6], { limite: 3 });
    expect(carga.frases).toHaveLength(3);
    expect(carga.cursor).not.toBeNull();
  });

  it('segue pelas páginas até achar a Frase, e as do caminho ficam na lista', async () => {
    const { repo, ids } = await sete();
    // A mais velha está na terceira página de 3: vêm as 7, e não sobra página.
    const carga = await carregarPrimeiras(repo, ids[0], { limite: 3 });
    expect(carga.frases.map((f) => f.texto)).toEqual([
      'Frase 6',
      'Frase 5',
      'Frase 4',
      'Frase 3',
      'Frase 2',
      'Frase 1',
      'Frase 0',
    ]);
    expect(carga.cursor).toBeNull();
  });

  it('para no limite de páginas: uma Frase que já saiu da lista não faz ler o caderno inteiro', async () => {
    const { repo } = await sete();
    const carga = await carregarPrimeiras(repo, 'frase-que-sumiu', { limite: 2, paginas: 2 });
    expect(carga.frases).toHaveLength(4);
    expect(carga.cursor).not.toBeNull();
    // O limite padrão cobre as 200 que a busca lê, mais uma página de folga.
    expect(PAGINAS_ATE_A_FRASE * FRASES_POR_PAGINA).toBeGreaterThan(200);
  });
});
