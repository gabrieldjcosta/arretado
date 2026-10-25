import { describe, expect, it } from 'vitest';
import { Curadoria, ItemDaCuradoria } from './curadoria';
import { markdownParaBlocos, markdownParaSecoes, trechosDaLinha } from './markdown';
import {
  construirItemArticulado,
  construirItemSemArtigos,
  entradaDoIndice,
  juntarCitacoes,
  semCabecalhos,
} from './construir';
import { verificarAcervo } from './verificar';
import { cortarBlocos, decodificarPagina } from './nucleo';
import type { IndiceDoAcervo } from '../../src/dominios/acervo/esquemas';

const cur = (extra: Record<string, unknown> = {}) =>
  ItemDaCuradoria.parse({
    id: 'lei-teste',
    titulo: 'Lei de teste',
    grupo: 'Leis federais',
    fonte: { adaptador: 'markdown', arquivo: 'teste.md' },
    ...extra,
  });

const LEI = [
  '# LEI Nº 1, DE 1 DE JANEIRO DE 2020',
  '',
  'Art. 1º Esta lei trata de tudo.',
  '',
  'Art. 2º Cabe ao Estado:',
  '',
  'I - agir;',
  '',
  'II - ~~omitir~~ cuidar.',
  '',
  'Art. 3º ~~Texto antigo.~~ Texto novo.',
].join('\n');

describe('Markdown', () => {
  it('~~tachado~~ vira trecho tachado e o resto perde as marcas', () => {
    expect(trechosDaLinha('a **b** ~~c~~ d')).toEqual([
      { texto: 'a b ' },
      { texto: 'c', tachado: true },
      { texto: ' d' },
    ]);
  });

  it('tilde sem par e tabela não quebram', () => {
    expect(trechosDaLinha('~~sem fim')).toEqual([{ texto: '~~sem fim' }]);
    expect(markdownParaBlocos('| a | b |\n|---|---|\n| 1 | 2 |')).toHaveLength(2);
  });

  it('seções pelos títulos, com o texto antes do primeiro título', () => {
    const s = markdownParaSecoes('Intro\n\n# A\ntexto a\n## B\ntexto b\n# C');
    expect(s.map((x) => [x.nivel, x.titulo])).toEqual([
      [0, ''],
      [1, 'A'],
      [2, 'B'],
      [1, 'C'],
    ]);
  });
});

describe('construção', () => {
  it('documento sem artigos: Anexo e blocos aninhados pelo nível, em ordem de pai antes do filho', () => {
    const r = construirItemSemArtigos(
      cur({ semArtigos: true }),
      '# A\numa\n\nduas\n## B\nb\n# C\nc',
      '2026-10-10',
      undefined,
    );
    expect(r.bloqueios).toEqual([]);
    const nos = r.item?.nos ?? [];
    expect(nos.map((n) => [n.endereco, n.tipo, n.pai])).toEqual([
      ['anexo', 'anexo', undefined],
      ['anexo.b1', 'bloco', 'anexo'],
      ['anexo.b1.b2', 'bloco', 'anexo.b1'],
      ['anexo.b3', 'bloco', 'anexo'],
    ]);
    expect(nos[1]?.trechos).toEqual([{ texto: 'uma' }, { texto: '\n' }, { texto: 'duas' }]);
  });

  it('sem nenhum título "#", o documento sem artigos é bloqueado', () => {
    const r = construirItemSemArtigos(
      cur({ semArtigos: true }),
      'só texto',
      '2026-10-10',
      undefined,
    );
    expect(r.item).toBeUndefined();
    expect(r.bloqueios[0]).toMatch(/título/);
  });

  it('lei articulada: monta o item, com o tachado como redação anterior, e o hash é reprodutível', async () => {
    const a = construirItemArticulado(cur(), markdownParaBlocos(LEI), '2026-10-10', undefined);
    expect(a.bloqueios).toEqual([]);
    const item = a.item;
    expect(item?.nos.map((n) => n.endereco)).toContain('art2.incII');
    const b = construirItemArticulado(cur(), markdownParaBlocos(LEI), '2026-10-10', undefined);
    const corpo = JSON.stringify(item);
    const ea = await entradaDoIndice(cur(), item as never, corpo, '2026-10-10', undefined);
    const eb = await entradaDoIndice(
      cur(),
      b.item as never,
      JSON.stringify(b.item),
      '2026-10-10',
      undefined,
    );
    expect(ea.hash).toBe(eb.hash);
    expect(ea.tamanho).toBe(new TextEncoder().encode(corpo).length);
  });

  it('cabeçalho sem nível sai com a linha do nome; título e ementa da curadoria valem', () => {
    const lei = [
      'Art. 1º Primeiro.',
      '',
      'SUBTÍTULO II',
      '',
      'Da Sociedade Personificada',
      '',
      'Art. 2º Segundo.',
    ].join('\n');
    const blocos = markdownParaBlocos(lei);
    expect(semCabecalhos(blocos, ['^SUBTÍTULO [IVXLCDM]+$'])).toHaveLength(2);
    expect(semCabecalhos(blocos, [])).toHaveLength(blocos.length);
    const sem = construirItemArticulado(cur(), blocos, '2026-10-10', undefined);
    const texto = (n: { trechos: { texto: string }[] } | undefined) =>
      (n?.trechos ?? []).map((t) => t.texto).join('');
    expect(texto(sem.item?.nos.find((n) => n.endereco === 'art1'))).toContain('SUBTÍTULO');
    const com = construirItemArticulado(
      cur({
        cabecalhosSemNivel: ['^SUBTÍTULO [IVXLCDM]+$'],
        tituloOficial: 'Código de Teste',
        ementa: 'Institui o Código de Teste.',
      }),
      blocos,
      '2026-10-10',
      undefined,
    );
    expect(com.bloqueios).toEqual([]);
    expect(com.item?.nos.map((n) => n.endereco)).toEqual(['art1', 'art2']);
    expect(com.item?.norma).toMatchObject({
      tituloOficial: 'Código de Teste',
      ementa: 'Institui o Código de Teste.',
    });
  });

  describe('citação de outra lei com vários artigos', () => {
    const cinco = [1, 2, 3, 4, 5].map((n) => `Art. ${String(n)}º Regra ${String(n)}.`).join('\n\n');
    const texto = (n: { trechos: { texto: string }[] } | undefined) =>
      (n?.trechos ?? []).map((t) => t.texto).join('');
    const artigos = (lei: string) => {
      const r = construirItemArticulado(
        cur({ anomaliasAceitas: ['artigo_fora_de_ordem', 'artigo_ausente', 'linha_solta'] }),
        markdownParaBlocos(lei),
        '2026-10-10',
        undefined,
      );
      return r.item?.nos ?? [];
    };

    it('a aspa que abre no primeiro artigo e fecha no último deixa os artigos da outra lei dentro do artigo que altera', () => {
      const nos = artigos(
        [
          cinco,
          'Art. 6º Os arts. 157 e 159 do Código Penal passam a vigorar assim:',
          '"Art. 157. .....................',
          '§ 3º .....................',
          'Pena - reclusão, de sete a quinze anos.',
          'Art. 159. .....................',
          'Pena - reclusão, de oito a quinze anos.',
          '.....................".',
          'Art. 7º Esta lei entra em vigor na data de sua publicação.',
        ].join('\n\n'),
      );
      expect(nos.filter((n) => n.tipo === 'artigo').map((n) => n.endereco)).toEqual([
        'art1',
        'art2',
        'art3',
        'art4',
        'art5',
        'art6',
        'art7',
      ]);
      const art6 = texto(nos.find((n) => n.endereco === 'art6'));
      expect(art6).toContain('Art. 157.');
      expect(art6).toContain('Art. 159.');
      expect(art6).toContain('de oito a quinze anos');
      expect(art6).toContain('\nArt. 159.');
      expect(art6).not.toContain('\uE000');
    });

    it('sem aspa que feche antes do artigo seguinte, nada é juntado', () => {
      const blocos = markdownParaBlocos(
        [
          'Art. 6º Altera a lei:',
          '"Art. 159. .....................',
          'Art. 160. Outro artigo da outra lei.',
          'Art. 7º Esta lei entra em vigor.',
        ].join('\n\n'),
      );
      expect(juntarCitacoes(blocos)).toHaveLength(blocos.length);
    });

    it('citação que abre e fecha no mesmo bloco, ou sem artigo no meio, fica como estava', () => {
      const blocos = markdownParaBlocos(
        [
          'Art. 6º Altera a lei:',
          '"Art. 159. Texto novo." (NR)',
          '"Art. 160. Começa aqui',
          'e continua sem artigo no meio."',
          'Art. 7º Esta lei entra em vigor.',
        ].join('\n\n'),
      );
      expect(juntarCitacoes(blocos)).toHaveLength(blocos.length);
    });

    it('junta com quebra de linha o que vai da aspa que abre à que fecha', () => {
      const blocos = markdownParaBlocos(
        [
          'Art. 6º Altera a lei:',
          '"Art. 157. .....................',
          'Art. 159. .....................',
          'Pena - reclusão.".',
          'Art. 7º Esta lei entra em vigor.',
        ].join('\n\n'),
      );
      const juntos = juntarCitacoes(blocos);
      expect(juntos).toHaveLength(3);
      expect(juntos[1]?.trechos.map((t) => t.texto).join('')).toBe(
        '"Art. 157. .....................\uE000Art. 159. .....................\uE000Pena - reclusão.".',
      );
    });

    it('a citação que abre num capítulo também é juntada, e aspas de um trecho no meio não a fecham', () => {
      const blocos = markdownParaBlocos(
        [
          'Art. 53. A Lei nº 4.591 passa a vigorar acrescida do seguinte Capítulo:',
          '"CAPÍTULO I-A',
          'Art. 31-A. A incorporação poderá ser submetida ao regime da afetação:',
          'I - subconjuntos (art. 8º, alínea "a"); e',
          'II - edifícios (art. 8º, alínea "b").',
          'Art. 31-B. Considera-se constituído o patrimônio de afetação."',
          'Art. 54. Esta Lei entra em vigor.',
        ].join('\n\n'),
      );
      const juntos = juntarCitacoes(blocos);
      expect(juntos).toHaveLength(3);
      expect(juntos[1]?.trechos.map((t) => t.texto).join('')).toContain(
        'alínea "b").\uE000Art. 31-B.',
      );
    });

    it('lê as linhas normalizadas: o espaço na frente do "Art." do Planalto não esconde a citação', () => {
      const bloco = (texto: string) => ({ trechos: [{ texto }] });
      const blocos = [
        bloco(' Art. 53. Acrescenta o capítulo:'),
        bloco(' "CAPÍTULO I-A'),
        bloco(' Art. 31-A. Texto.'),
        bloco(' Art. 31-B. Texto."'),
        bloco(' Art. 54. Esta Lei entra em vigor.'),
      ];
      expect(juntarCitacoes(blocos)).toHaveLength(3);
    });

    it('citação que não fecha antes do artigo seguinte, ou que passa por título, fica como estava', () => {
      const semFecho = markdownParaBlocos(
        [
          'Art. 21. Altera a lei:',
          '"CAPÍTULO IV',
          'Art. 6º Texto.',
          'Art. 22. Esta Lei vale.',
        ].join('\n\n'),
      );
      expect(juntarCitacoes(semFecho)).toHaveLength(semFecho.length);
      const comTitulo = markdownParaBlocos(
        ['Art. 21. Altera a lei:', '"Art. 6º Texto.', 'CAPÍTULO V', 'Art. 7º Texto."'].join('\n\n'),
      );
      expect(juntarCitacoes(comTitulo)).toHaveLength(comTitulo.length);
    });
  });

  it('sem artigos reconhecidos, o item é bloqueado e nada vai para o site', () => {
    const r = construirItemArticulado(
      cur(),
      markdownParaBlocos('Apenas um parágrafo.'),
      '2026-10-10',
      undefined,
    );
    expect(r.item).toBeUndefined();
    expect(r.bloqueios.join(' ')).toMatch(/sem_artigos/);
  });

  it('aviso do estruturador bloqueia até o curador aceitar o tipo', () => {
    const lei = `${LEI}\n\nArt. 5º Pula o quarto.`;
    const bloqueado = construirItemArticulado(
      cur(),
      markdownParaBlocos(lei),
      '2026-10-10',
      undefined,
    );
    expect(bloqueado.bloqueios.join(' ')).toMatch(/artigo_ausente/);
    const aceito = construirItemArticulado(
      cur({ anomaliasAceitas: ['artigo_ausente'] }),
      markdownParaBlocos(lei),
      '2026-10-10',
      undefined,
    );
    expect(aceito.item).toBeDefined();
  });
});

describe('curadoria', () => {
  it('rejeita id repetido e campo desconhecido', () => {
    const item = {
      id: 'a',
      titulo: 'A',
      grupo: 'G',
      fonte: { adaptador: 'markdown', arquivo: 'a.md' },
    };
    expect(Curadoria.safeParse({ versao: 1, itens: [item, item] }).success).toBe(false);
    expect(Curadoria.safeParse({ versao: 1, itens: [{ ...item, extra: 1 }] }).success).toBe(false);
  });
});

describe('verificarAcervo', () => {
  const codificar = (s: string) => new TextEncoder().encode(s);

  async function acervoValido() {
    const c = cur();
    const r = construirItemArticulado(c, markdownParaBlocos(LEI), '2026-10-10', undefined);
    const corpo = JSON.stringify(r.item);
    const entrada = await entradaDoIndice(c, r.item as never, corpo, '2026-10-10', undefined);
    const indice: IndiceDoAcervo = {
      formato: 'arretado-acervo',
      versaoIndice: 1,
      geradoEm: '2026-10-10',
      itens: [entrada],
    };
    return { indice, corpo };
  }

  it('acervo íntegro não tem problema', async () => {
    const { indice, corpo } = await acervoValido();
    const p = await verificarAcervo(
      JSON.stringify(indice),
      new Map([['lei-teste.json', codificar(corpo)]]),
    );
    expect(p).toEqual([]);
  });

  it('acusa arquivo adulterado (hash), tamanho, arquivo ausente e arquivo fora do índice', async () => {
    const { indice, corpo } = await acervoValido();
    const adulterado = codificar(corpo.replace('Esta lei', 'Essa lei'));
    const p = await verificarAcervo(
      JSON.stringify(indice),
      new Map([
        ['lei-teste.json', adulterado],
        ['outro.json', codificar('{}')],
      ]),
    );
    expect(p.map((x) => x.problema).join('|')).toMatch(/hash/);
    expect(p.some((x) => x.id === 'outro')).toBe(true);
    const ausente = await verificarAcervo(JSON.stringify(indice), new Map());
    expect(ausente[0]?.problema).toMatch(/ausente/);
    const curto = await verificarAcervo(
      JSON.stringify(indice),
      new Map([['lei-teste.json', codificar(`${corpo} `)]]),
    );
    expect(curto.map((x) => x.problema).join('|')).toMatch(/tamanho/);
  });

  it('índice ilegível ou fora do esquema', async () => {
    expect((await verificarAcervo('não é json', new Map()))[0]?.problema).toMatch(/JSON/);
    expect((await verificarAcervo('{"formato":"x"}', new Map()))[0]?.problema).toMatch(/esquema/);
  });
});

describe('páginas salvas e numeração repetida', () => {
  it('lê página em UTF-16 com BOM', () => {
    const texto = 'Lei nº 11.340';
    const utf16 = new Uint8Array(2 + texto.length * 2);
    utf16.set([0xff, 0xfe]);
    for (let i = 0; i < texto.length; i++) {
      const c = texto.charCodeAt(i);
      utf16[2 + i * 2] = c & 0xff;
      utf16[3 + i * 2] = c >> 8;
    }
    expect(decodificarPagina(utf16)).toBe(texto);
  });

  it('dá endereço único à seção estrutural repetida (LC 80: duas "SEÇÃO IV")', () => {
    const lei = [
      '# LEI Nº 1, DE 1 DE JANEIRO DE 2020',
      '',
      'CAPÍTULO I',
      'SEÇÃO IV',
      '',
      'Art. 1º Primeiro.',
      '',
      'SEÇÃO IV',
      '',
      'Art. 2º Segundo.',
    ].join('\n');
    const r = construirItemArticulado(
      cur({ anomaliasAceitas: ['estrutural_repetido'] }),
      markdownParaBlocos(lei),
      '2026-10-10',
      undefined,
    );
    expect(r.bloqueios).toEqual([]);
  });

  it('corta no último "ÍNDICE" (o do fim do Código Civil, não o link do topo)', () => {
    const b = (texto: string) => ({ trechos: [{ texto }] });
    const pagina = [
      b('ÍNDICE'),
      b('Art. 1º Toda pessoa.'),
      b('Brasília, 10 de janeiro de 2002'),
      b(' ÍNDICE '),
      b('LIVRO I'),
    ];
    expect(cortarBlocos(pagina, 'ÍNDICE')).toEqual(pagina.slice(0, 3));
    expect(cortarBlocos(pagina, 'SUMÁRIO')).toBe(pagina);
    expect(cortarBlocos(pagina, undefined)).toBe(pagina);
    expect(cur({ cortarEm: 'ÍNDICE' }).cortarEm).toBe('ÍNDICE');
  });
});
