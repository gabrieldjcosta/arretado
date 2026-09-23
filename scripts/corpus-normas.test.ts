// @vitest-environment node
import path from 'node:path';
import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  LIMIAR_TACHADOS,
  NORMAS,
  arquivosForaDoManifesto,
  arquivosParaApagar,
  atualizarColado,
  atualizarEntrada,
  conferirColado,
  conferirConteudo,
  contarTachados,
  detectarCharset,
  lerManifesto,
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

  it('cada página tem o seu colar no Chromium, amarrado à versão atual dela (7.2)', async () => {
    const manifesto = await lerManifesto(DIRETORIO);
    const pagina = new Map(manifesto.normas.map((e) => [e.id, e.sha256Conteudo]));
    const colados = manifesto.colados ?? [];
    expect(colados.map((c) => c.id)).toEqual(NORMAS.map((n) => n.id));
    for (const c of colados) {
      expect(c.sha256ConteudoOrigem).toBe(pagina.get(c.id));
      expect([c.html.arquivo, c.texto.arquivo]).toEqual([
        `${c.id}.colado.html`,
        `${c.id}.colado.txt`,
      ]);
    }
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
      descricao: 'antiga',
      normas: [entrada('cf'), entrada('lep')],
      colados: [colado('cf'), colado('lep')],
    });
    expect(texto.endsWith('}\n')).toBe(true);
    const lido = JSON.parse(texto) as {
      descricao: string;
      normas: { id: string }[];
      colados: { id: string }[];
    };
    expect(lido.normas.map((n) => n.id)).toEqual(['lep', 'cf']);
    expect(lido.colados.map((n) => n.id)).toEqual(['lep', 'cf']);
    expect(lido.descricao).toBe(manifestoVazio().descricao);
  });
});

/** Entrada de colado mínima para os testes, sem e com a data da captura. */
function capturaDe(id: string, sha = '0') {
  return {
    id,
    sha256ConteudoOrigem: sha.repeat(64),
    navegador: 'chromium 141.0.7390.37',
    plataforma: 'linux',
    html: { arquivo: `${id}.colado.html`, bytes: 1, sha256: 'a'.repeat(64) },
    texto: { arquivo: `${id}.colado.txt`, bytes: 1, sha256: 'b'.repeat(64) },
  };
}
const colado = (id: string, sha = '0') => ({
  ...capturaDe(id, sha),
  capturadoEm: '2026-09-23T00:00:00.000Z',
});

describe('colar da página (7.2): conferirColado', () => {
  const lep = NORMAS.find((n) => n.id === 'lep');
  if (!lep) throw new Error('LEP fora do catálogo');
  const corpo =
    '<p>Institui a Lei de Execução Penal.</p><p>Art. 1º - A execução penal tem por objetivo</p>' +
    '<p><strike>Art. 2º redação antiga</strike></p><p>Art. 2º redação nova</p>' +
    '<p><span style="text-decoration: line-through">Art. 3º revogado</span></p>';
  const pagina = `<html><head><script>var x = 1;</script></head><body>${corpo}</body></html>`;
  const texto =
    'Institui a Lei de Execução Penal.\nArt. 1º - A execução penal tem por objetivo\n' +
    'Art. 2º redação antiga\nArt. 2º redação nova\nArt. 3º revogado';

  it('colado inteiro, com os tachados e no charset certo: sem problemas', () => {
    expect(conferirColado(lep, { html: corpo, texto }, pagina)).toEqual([]);
  });

  it('acusa tachado perdido no colar (o estruturador não acharia a redação anterior)', () => {
    const semTachado = corpo.replace('<strike>', '<span>').replace('</strike>', '</span>');
    expect(conferirColado(lep, { html: semTachado, texto }, pagina)).toEqual([
      'lep (colado): 1 tachados, a página tem 2 — o colar perdeu redações anteriores',
    ]);
  });

  it('acusa U+FFFD (página servida com o charset errado) e formato vazio', () => {
    const problemas = conferirColado(
      lep,
      { html: corpo, texto: texto + ' Execu\uFFFD\uFFFDo' },
      pagina,
    );
    expect(problemas).toEqual([
      'lep (colado): caractere de substituição (U+FFFD) no texto — charset errado ao servir?',
    ]);
    expect(conferirColado(lep, { html: corpo, texto: '  ' }, pagina)).toEqual([
      'lep (colado): texto vazio',
    ]);
  });

  it('acusa seleção cortada: falta texto da página ou marcador', () => {
    const metade = corpo.slice(0, corpo.indexOf('<p><strike>'));
    const problemas = conferirColado(lep, { html: corpo, texto: 'Lei de Execução Penal' }, pagina);
    expect(problemas).toContain('lep (colado): marcador "art. 1º" ausente do texto');
    expect(problemas.some((p) => p.includes('do texto da página — seleção cortada?'))).toBe(true);
    expect(
      conferirColado(lep, { html: metade, texto }, pagina).some((p) =>
        p.startsWith('lep (colado): o html tem só'),
      ),
    ).toBe(true);
  });
});

describe('colar da página (7.2): atualizarColado', () => {
  const anterior = colado('lep', 'c');
  const base = capturaDe('lep', 'c');

  it('mesma origem e mesmos bytes: mantém a entrada (rodar de novo não gera diff)', () => {
    expect(atualizarColado(anterior, { ...base, navegador: 'chromium 999' }, 'agora')).toEqual({
      entrada: anterior,
      mudou: false,
    });
  });

  it('página nova ou captura diferente: nova entrada com a data de agora', () => {
    const origemNova = atualizarColado(
      anterior,
      { ...base, sha256ConteudoOrigem: 'd'.repeat(64) },
      'agora',
    );
    expect(origemNova.mudou).toBe(true);
    expect(origemNova.entrada.capturadoEm).toBe('agora');
    const htmlNovo = { ...base, html: { ...base.html, sha256: 'e'.repeat(64) } };
    expect(atualizarColado(anterior, htmlNovo, 'agora').mudou).toBe(true);
    expect(atualizarColado(undefined, base, 'agora').mudou).toBe(true);
  });
});

describe('derivados na pasta do corpus (7.2)', () => {
  const manifesto = {
    ...manifestoVazio(),
    normas: [
      {
        id: 'lep',
        titulo: 'LEP',
        papel: 'portao' as const,
        variante: 'todas-as-redacoes' as const,
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l7210.htm',
        urlFinal: 'https://www.planalto.gov.br/ccivil_03/leis/l7210.htm',
        arquivo: 'lep.html',
        charset: 'windows-1252',
        origemCharset: 'padrao-windows-1252' as const,
        bytes: 1,
        sha256: '0'.repeat(64),
        sha256Conteudo: '0'.repeat(64),
        obtidoEm: '2026-09-23T00:00:00.000Z',
      },
    ],
    colados: [colado('lep')],
  };
  const nomes = [
    'manifesto.json',
    'lep.html',
    'lep.colado.html',
    'lep.colado.txt',
    'lep.gabarito.json',
    'cp.gabarito.json',
    'cp.colado.html',
    'inventada.gabarito.json',
    'sobra.html',
    'notas.md',
  ];

  it('página, colado registrado e gabarito de norma do catálogo são reconhecidos', () => {
    expect(arquivosForaDoManifesto(nomes, manifesto)).toEqual([
      'cp.colado.html',
      'inventada.gabarito.json',
      'sobra.html',
      'notas.md',
    ]);
  });

  it('npm run corpus só apaga sobras .html/.txt: colados registrados e gabaritos ficam', () => {
    expect(arquivosParaApagar(nomes, manifesto)).toEqual(['cp.colado.html', 'sobra.html']);
  });

  it('colado ausente ou de outra versão da página é acusado', async () => {
    const pasta = await mkdtemp(path.join(tmpdir(), 'arretado-corpus-'));
    try {
      const real = await lerManifesto(DIRETORIO);
      const pagina = real.normas.find((e) => e.id === 'lep');
      const coladoReal = real.colados?.find((c) => c.id === 'lep');
      if (!pagina || !coladoReal) throw new Error('LEP fora do manifesto');
      for (const nome of [pagina.arquivo, coladoReal.html.arquivo, coladoReal.texto.arquivo]) {
        await copyFile(path.join(DIRETORIO, nome), path.join(pasta, nome));
      }
      const gravar = (colados: (typeof coladoReal)[]) =>
        writeFile(
          path.join(pasta, 'manifesto.json'),
          serializarManifesto({ ...manifestoVazio(), normas: [pagina], colados }),
        );
      const daLep = async () => (await verificarCorpus(pasta)).filter((p) => /^lep[ .:]/.test(p));

      await gravar([coladoReal]);
      expect(await daLep()).toEqual([]);

      await gravar([{ ...coladoReal, sha256ConteudoOrigem: 'f'.repeat(64) }]);
      expect(await daLep()).toEqual([
        'lep: colado capturado de outra versão da página — rode npm run corpus:colar',
      ]);

      await gravar([]);
      expect(await daLep()).toEqual([
        'lep: sem colado — rode npm run corpus:colar',
        'lep.colado.html: arquivo fora do manifesto — rode npm run corpus',
        'lep.colado.txt: arquivo fora do manifesto — rode npm run corpus',
      ]);
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
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
