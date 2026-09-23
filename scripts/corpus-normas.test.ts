// @vitest-environment node
import path from 'node:path';
import { copyFile, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  LIMIAR_TACHADOS,
  NORMAS,
  atualizarColado,
  atualizarEntrada,
  classificarArquivo,
  coladosVazio,
  conferirColado,
  conferirConteudo,
  contarTachados,
  detectarCharset,
  lerColados,
  manifestoVazio,
  podarDerivados,
  serializarColados,
  serializarManifesto,
  sha256Conteudo,
  sha256Hex,
  textoParaConferencia,
  verificarCorpus,
} from './corpus/normas.mjs';

const DIRETORIO = path.join(import.meta.dirname, '..', 'corpus', 'normas');
const utf8 = (s: string) => new TextEncoder().encode(s);
/** Bytes de um texto só com caracteres até U+00FF (em windows-1252, iguais ao latin-1 aqui). */
const latin1 = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

describe('corpus de normas: integridade (sem rede)', () => {
  it('toda norma do catálogo está no disco, com o colado da versão atual e os mesmos tachados', async () => {
    // Pega também conversão de fim de linha pelo git (ver .gitattributes) e colado desatualizado.
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

  it('marcador só dentro de script não conta; página curta é tratada como erro', () => {
    const problemas = conferirConteudo(
      lep,
      latin1('<script>lei de execução penal</script>'),
      'utf-8',
    );
    expect(problemas.some((p) => p.includes('página de erro'))).toBe(true);
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

describe('derivados: colados (7.2) e gabaritos (7.3)', () => {
  const entradaColado = (id: string, sha256: string, origem = 'b'.repeat(64)) => ({
    id,
    arquivo: `${id}.colado.html`,
    origemSha256Conteudo: origem,
    navegador: 'Chromium 141.0.7390.37',
    bytes: 1,
    sha256,
    capturadoEm: '2026-09-23T00:00:00.000Z',
  });

  /** Pasta temporária com o manifesto real (sem as páginas) e os arquivos dados. */
  async function pastaCom(arquivos: Record<string, string>) {
    const pasta = await mkdtemp(path.join(tmpdir(), 'arretado-corpus-'));
    await copyFile(path.join(DIRETORIO, 'manifesto.json'), path.join(pasta, 'manifesto.json'));
    for (const [nome, conteudo] of Object.entries(arquivos)) {
      await writeFile(path.join(pasta, nome), conteudo);
    }
    return pasta;
  }

  it('classificarArquivo separa página, colado, gabarito e registros pelo nome', () => {
    expect(classificarArquivo('lep.html')).toEqual({ tipo: 'pagina', id: 'lep' });
    expect(classificarArquivo('lc-sp-988.html')).toEqual({ tipo: 'pagina', id: 'lc-sp-988' });
    expect(classificarArquivo('lep-compilado.colado.html')).toEqual({
      tipo: 'colado',
      id: 'lep-compilado',
    });
    expect(classificarArquivo('cp.gabarito.json')).toEqual({ tipo: 'gabarito', id: 'cp' });
    expect(classificarArquivo('manifesto.json')).toEqual({ tipo: 'manifesto' });
    expect(classificarArquivo('colados.json')).toEqual({ tipo: 'colados' });
    expect(classificarArquivo('LEIA-ME.md')).toEqual({ tipo: 'desconhecido' });
  });

  it('atualizarColado: mesma captura da mesma página não gera diff, nem com outro navegador', () => {
    const anterior = entradaColado('lep', 'a'.repeat(64));
    const { id, arquivo, origemSha256Conteudo, bytes, sha256 } = anterior;
    const nova = { id, arquivo, origemSha256Conteudo, bytes, sha256, navegador: 'Chromium 999' };
    expect(atualizarColado(anterior, nova, 'agora')).toEqual({ entrada: anterior, mudou: false });
    const outraPagina = { ...nova, origemSha256Conteudo: 'c'.repeat(64) };
    expect(atualizarColado(anterior, outraPagina, 'agora')).toEqual({
      entrada: { ...outraPagina, capturadoEm: 'agora' },
      mudou: true,
    });
    expect(atualizarColado(undefined, nova, 'agora').mudou).toBe(true);
  });

  it('colado desatualizado, ausente ou solto e gabarito de norma fora do catálogo são acusados', async () => {
    const colado = '<p>x</p>';
    const pasta = await pastaCom({
      'lep.colado.html': colado,
      'cp.colado.html': colado,
      'cp.gabarito.json': '{}',
      'revogada.gabarito.json': '{}',
    });
    try {
      const sha = sha256Hex(new TextEncoder().encode(colado));
      await writeFile(
        path.join(pasta, 'colados.json'),
        serializarColados({ ...coladosVazio(), colados: [entradaColado('lep', sha)] }),
      );
      const problemas = await verificarCorpus(pasta);
      expect(problemas).toContain(
        'lep.colado.html: capturado de outra versão da página — rode npm run corpus:colar',
      );
      expect(problemas).toContain(
        'lep-compilado.colado.html: ausente de colados.json — rode npm run corpus:colar',
      );
      expect(problemas).toContain(
        'cp.colado.html: arquivo fora de colados.json — rode npm run corpus:colar',
      );
      expect(problemas).toContain(
        'revogada.gabarito.json: gabarito de norma fora do catálogo — rode npm run corpus',
      );
      expect(problemas.some((p) => p.startsWith('cp.gabarito.json'))).toBe(false);
      expect(problemas.some((p) => p.includes('fora do manifesto'))).toBe(false);
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  });

  it('colado com um tachado a menos que a página é acusado', async () => {
    const pagina = await readFile(path.join(DIRETORIO, 'lep.html'));
    const html = new TextDecoder('windows-1252').decode(pagina);
    const colado = html.replace(/<strike>([\s\S]*?)<\/strike>/i, '<span>$1</span>');
    const pasta = await pastaCom({ 'lep.colado.html': colado });
    try {
      await copyFile(path.join(DIRETORIO, 'lep.html'), path.join(pasta, 'lep.html'));
      const bytes = utf8(colado);
      const manifesto = JSON.parse(await readFile(path.join(pasta, 'manifesto.json'), 'utf8')) as {
        normas: { id: string; sha256Conteudo: string }[];
      };
      const origem = manifesto.normas.find((n) => n.id === 'lep')?.sha256Conteudo;
      await writeFile(
        path.join(pasta, 'colados.json'),
        serializarColados({
          ...coladosVazio(),
          colados: [{ ...entradaColado('lep', sha256Hex(bytes), origem), bytes: bytes.length }],
        }),
      );
      const doLep = (await verificarCorpus(pasta)).filter((p) => p.startsWith('lep.colado.html'));
      expect(doLep).toEqual([
        'lep.colado.html: 88 tachados, a página tem 89 — a cópia perdeu formatação',
      ]);
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  });

  it('colado que perdeu o tachado é acusado pelo nome do arquivo', () => {
    const lep = NORMAS.find((n) => n.id === 'lep');
    if (!lep) throw new Error('LEP fora do catálogo');
    const colado = utf8('<p>Lei de Execução Penal</p><p>Art. 1º</p>' + ' '.repeat(20_000));
    expect(conferirColado(lep, colado, 89)).toEqual([
      'lep.colado.html: só 0 tachados — não parece a página com todas as redações',
      'lep.colado.html: 0 tachados, a página tem 89 — a cópia perdeu formatação',
    ]);
    expect(conferirColado(lep, colado, undefined)).toHaveLength(1);
  });

  it('podarDerivados apaga só os derivados de norma fora do catálogo', async () => {
    const pasta = await pastaCom({
      'lep.colado.html': '<p>x</p>',
      'lep.gabarito.json': '{}',
      'revogada.colado.html': '<p>x</p>',
      'revogada.gabarito.json': '{}',
      'revogada.html': '<p>página: é do npm run corpus, não daqui</p>',
    });
    try {
      await writeFile(
        path.join(pasta, 'colados.json'),
        serializarColados({
          ...coladosVazio(),
          colados: [
            entradaColado('revogada', '0'.repeat(64)),
            entradaColado('lep', '0'.repeat(64)),
          ],
        }),
      );
      expect((await podarDerivados(pasta)).sort()).toEqual([
        'colados.json › revogada',
        'revogada.colado.html',
        'revogada.gabarito.json',
      ]);
      expect((await readdir(pasta)).sort()).toEqual([
        'colados.json',
        'lep.colado.html',
        'lep.gabarito.json',
        'manifesto.json',
        'revogada.html',
      ]);
      expect((await lerColados(pasta)).colados.map((e) => e.id)).toEqual(['lep']);
      expect(await podarDerivados(pasta)).toEqual([]);
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  });
});
