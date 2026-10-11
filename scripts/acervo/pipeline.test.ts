import { describe, expect, it } from 'vitest';
import { Curadoria, ItemDaCuradoria } from './curadoria';
import { markdownParaBlocos, markdownParaSecoes, trechosDaLinha } from './markdown';
import { construirItemArticulado, construirItemSemArtigos, entradaDoIndice } from './construir';
import { verificarAcervo } from './verificar';
import { decodificarPagina } from './nucleo';
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
});
