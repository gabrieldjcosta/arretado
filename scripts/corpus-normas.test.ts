// @vitest-environment node
import path from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  LIMIAR_TACHADOS,
  NORMAS,
  atualizarEntrada,
  conferirConteudo,
  contarTachados,
  detectarCharset,
  lerOpcoes,
  manifestoVazio,
  serializarManifesto,
  sha256Conteudo,
  textoParaConferencia,
  verificarCorpus,
} from './corpus/normas.mjs';

const DIRETORIO = path.join(import.meta.dirname, '..', 'corpus', 'normas');
const utf8 = (s: string) => new TextEncoder().encode(s);
/** Bytes de um texto só com caracteres até U+00FF (em windows-1252, iguais ao latin-1 aqui). */
const latin1 = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

describe('corpus de normas: integridade (sem rede)', () => {
  it('toda norma do catálogo está no disco com o tamanho, o hash e o conteúdo do manifesto', async () => {
    // Pega também conversão de fim de linha pelo git (ver .gitattributes).
    expect(await verificarCorpus(DIRETORIO)).toEqual([]);
  });

  it('o catálogo tem as duas normas do portão da F2, com as redações anteriores', () => {
    const portao = NORMAS.filter((n) => n.papel === 'portao');
    expect(portao.map((n) => n.id)).toEqual(['lep', 'cp']);
    expect(portao.every((n) => n.variante === 'todas-as-redacoes')).toBe(true);
  });
});

describe('detectarCharset', () => {
  it('BOM de UTF-8 vence tudo', () => {
    const bytes = Uint8Array.from([0xef, 0xbb, 0xbf, ...utf8('<p>ação</p>')]);
    expect(detectarCharset(bytes, 'text/html; charset=windows-1252')).toEqual({
      charset: 'utf-8',
      origem: 'bom',
    });
  });

  it('cabeçalho HTTP vem antes da meta e o rótulo é normalizado', () => {
    const bytes = utf8('<meta charset="utf-8"><p>x</p>');
    expect(detectarCharset(bytes, 'text/html; charset=ISO-8859-1')).toEqual({
      charset: 'windows-1252',
      origem: 'cabecalho',
    });
  });

  it('rótulo desconhecido no cabeçalho é ignorado e a meta decide (como na ALESP)', () => {
    const bytes = utf8(
      "<meta http-equiv='Content-Type' content='text/html; charset=UTF-8' /><p>ação</p>",
    );
    expect(detectarCharset(bytes, 'text/html; charset=inventado')).toEqual({
      charset: 'utf-8',
      origem: 'meta',
    });
  });

  it('sem declaração: UTF-8 válido é UTF-8', () => {
    expect(detectarCharset(utf8('<p>execução penal</p>'), 'text/html')).toEqual({
      charset: 'utf-8',
      origem: 'utf8-valido',
    });
  });

  it('sem declaração e UTF-8 inválido: windows-1252 (caso do Planalto)', () => {
    expect(detectarCharset(latin1('<p>execução penal</p>'), null)).toEqual({
      charset: 'windows-1252',
      origem: 'padrao-windows-1252',
    });
  });
});

describe('sha256Conteudo', () => {
  const pagina = (token: string, texto: string) =>
    latin1(
      `<html><body><p>${texto}</p></body></html>\r\n<script id="f5_cspm">var t='${token}';</script>`,
    );

  it('ignora o script volátil injetado a cada requisição', () => {
    expect(sha256Conteudo(pagina('AAAA', 'Art. 1º'))).toBe(
      sha256Conteudo(pagina('BBBBBBBB', 'Art. 1º')),
    );
  });

  it('muda quando o texto da norma muda', () => {
    expect(sha256Conteudo(pagina('AAAA', 'Art. 1º'))).not.toBe(
      sha256Conteudo(pagina('AAAA', 'Art. 1º-A')),
    );
  });
});

describe('atualizarEntrada', () => {
  const base = {
    id: 'lep',
    titulo: 'LEP',
    papel: 'portao' as const,
    variante: 'todas-as-redacoes' as const,
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l7210.htm',
    urlFinal: 'https://www.planalto.gov.br/ccivil_03/leis/l7210.htm',
    arquivo: 'lep.html',
    charset: 'windows-1252',
    origemCharset: 'padrao-windows-1252' as const,
    bytes: 100,
    sha256: 'a'.repeat(64),
    sha256Conteudo: 'b'.repeat(64),
  };
  const anterior = { ...base, obtidoEm: '2026-09-23T00:00:00.000Z' };

  it('mesmo conteúdo com bytes diferentes (script volátil): mantém a entrada anterior', () => {
    const r = atualizarEntrada(anterior, { ...base, sha256: 'c'.repeat(64), bytes: 101 }, 'depois');
    expect(r).toEqual({ entrada: anterior, mudou: false });
  });

  it('conteúdo diferente: nova entrada com a data de agora', () => {
    const r = atualizarEntrada(anterior, { ...base, sha256Conteudo: 'd'.repeat(64) }, 'agora');
    expect(r.mudou).toBe(true);
    expect(r.entrada.obtidoEm).toBe('agora');
  });

  it('sem entrada anterior: nova', () => {
    expect(atualizarEntrada(undefined, base, 'agora').mudou).toBe(true);
  });
});

describe('textoParaConferencia e conferirConteudo', () => {
  const lep = NORMAS.find((n) => n.id === 'lep');
  const lepCompilado = NORMAS.find((n) => n.id === 'lep-compilado');
  if (!lep || !lepCompilado) throw new Error('LEP fora do catálogo');
  const html = (texto: string) =>
    `<html><head><script>var x = "<p>lei de execução penal</p>";</script></head><body>${texto}${' '.repeat(20_000)}</body></html>`;

  it('tira scripts e tags, decodifica entidades, colapsa espaços e põe em minúsculas', () => {
    expect(
      textoParaConferencia(
        '<script>ignorar</script><P>Lei de <b>Execu&ccedil;&atilde;o</b>\r\n  Penal &#8212; Art. 1&ordm;</P>',
      ),
    ).toBe(' lei de execução penal — art. 1º ');
  });

  it('página certa, no charset certo e na variante certa: sem problemas', () => {
    const bytes = latin1(
      html('<p>Institui a Lei de Execução Penal.</p><p>Art. 1º - A execução</p>'),
    );
    expect(conferirConteudo(lepCompilado, bytes, 'windows-1252')).toEqual([]);
  });

  it('charset errado some com o marcador acentuado', () => {
    const bytes = utf8(html('<p>Institui a Lei de Execução Penal.</p><p>Art. 1º - A execução</p>'));
    const problemas = conferirConteudo(lep, bytes, 'windows-1252');
    expect(problemas.some((p) => p.includes('lei de execução penal'))).toBe(true);
  });

  it('marcador só dentro de script não conta; página curta é tratada como falha do site', () => {
    const problemas = conferirConteudo(
      lep,
      latin1('<script>lei de execução penal</script>'),
      'utf-8',
    );
    expect(problemas.some((p) => p.includes('página de falha do site'))).toBe(true);
    expect(problemas.some((p) => p.includes('marcador'))).toBe(true);
  });
});

describe('serializarManifesto', () => {
  it('ordena pelo catálogo e termina em LF', () => {
    const entrada = (id: string) => ({
      id,
      titulo: id,
      papel: 'apoio' as const,
      variante: 'compilado' as const,
      url: 'https://exemplo.gov.br',
      urlFinal: 'https://exemplo.gov.br',
      arquivo: `${id}.html`,
      charset: 'utf-8',
      origemCharset: 'meta' as const,
      bytes: 1,
      sha256: '0'.repeat(64),
      sha256Conteudo: '0'.repeat(64),
      obtidoEm: '2026-09-23T00:00:00.000Z',
    });
    const texto = serializarManifesto({
      ...manifestoVazio(),
      normas: [entrada('cf'), entrada('lep')],
    });
    expect(texto.endsWith('}\n')).toBe(true);
    const ids = (JSON.parse(texto) as { normas: { id: string }[] }).normas.map((n) => n.id);
    expect(ids).toEqual(['lep', 'cf']);
  });
});

describe('contarTachados e conferência da variante', () => {
  it('conta <strike>, <del> e line-through; ignora <s> só com ordinal (Planalto)', () => {
    const html =
      '<p><strike>Art. 2º texto antigo</strike></p><p><del>Art. 3</del></p>' +
      '<p><span style="text-decoration: line-through">revogado</span></p>' +
      '<p>Art. 1<s>º</s> vigente</p><script>"<strike>não conta</strike>"</script>';
    expect(contarTachados(html)).toBe(3);
  });

  it('conta <s> com texto de verdade (ALESP marca a redação revogada assim)', () => {
    expect(contarTachados('<p><s>Artigo 5° - texto revogado</s></p><p><s>°</s></p>')).toBe(1);
  });

  it('página "todas as redações" sem tachados, ou compilada com muitos, é recusada', () => {
    const lep = NORMAS.find((n) => n.id === 'lep');
    const lepCompilado = NORMAS.find((n) => n.id === 'lep-compilado');
    if (!lep || !lepCompilado) throw new Error('LEP fora do catálogo');
    const corpo = '<p>Lei de Execução Penal</p><p>Art. 1º</p>' + ' '.repeat(20_000);
    const tachados = '<strike>antigo</strike>'.repeat(LIMIAR_TACHADOS);
    expect(conferirConteudo(lep, latin1(corpo), 'windows-1252')).toEqual([
      'lep: só 0 tachados — não parece a página com todas as redações',
    ]);
    expect(conferirConteudo(lep, latin1(corpo + tachados), 'windows-1252')).toEqual([]);
    expect(conferirConteudo(lepCompilado, latin1(corpo + tachados), 'windows-1252')).toEqual([
      `lep-compilado: ${String(LIMIAR_TACHADOS)} tachados — não parece a página compilada`,
    ]);
  });
});

describe('robustez', () => {
  it('entidade numérica fora do Unicode não derruba a conferência', () => {
    expect(() => textoParaConferencia('<p>a &#99999999; b &#x110000; c</p>')).not.toThrow();
    expect(textoParaConferencia('<p>a &#99999999; b</p>')).toBe(' a b ');
  });

  it('arquivo .html fora do manifesto é acusado', async () => {
    const pasta = await mkdtemp(path.join(tmpdir(), 'arretado-corpus-'));
    try {
      await writeFile(path.join(pasta, 'sobra.html'), '<p>x</p>');
      const problemas = await verificarCorpus(pasta);
      expect(problemas).toContain('sobra.html: arquivo fora do manifesto — rode npm run corpus');
      expect(problemas).toContain('lep: ausente do manifesto');
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  });
});

describe('lerOpcoes (linha de comando dos scripts do corpus)', () => {
  const ids = ['lep', 'cp'];
  it('--so aceita as duas formas, tira repetidos e vazios; chaves conhecidas ligam', () => {
    expect(lerOpcoes(['--so', 'lep,cp,'], { ids })).toEqual({
      so: ['lep', 'cp'],
      chaves: new Set(),
    });
    expect(lerOpcoes(['--so=lep,lep'], { ids }).so).toEqual(['lep']);
    expect(lerOpcoes(['--verificar'], { ids, chaves: ['--verificar'] })).toEqual({
      so: null,
      chaves: new Set(['--verificar']),
    });
  });

  it('argumento desconhecido, --so vazio e id fora da lista são recusados com o motivo', () => {
    expect(lerOpcoes(['--so', 'lep', '--x'], { ids }).problema).toBe('Argumento desconhecido: --x');
    expect(lerOpcoes(['--so'], { ids }).problema).toBe('--so precisa de ao menos um id.');
    expect(lerOpcoes(['--so', 'lep,cf'], { ids }).problema).toBe('Normas desconhecidas: cf');
  });
});
