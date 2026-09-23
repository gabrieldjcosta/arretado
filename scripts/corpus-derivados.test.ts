// @vitest-environment node
import path from 'node:path';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  NOME_MANIFESTO,
  contarTachados,
  decodificar,
  ehDerivado,
  lerManifesto,
  sha256Hex,
  verificarCorpus,
} from './corpus/normas.mjs';
import {
  NOME_INDICE_COLADOS,
  atualizarColado,
  conferirCaptura,
  descreverArquivo,
  indiceVazio,
  lerColados,
  serializarColados,
  verificarDerivados,
} from './corpus/derivados.mjs';

const DIRETORIO = path.join(import.meta.dirname, '..', 'corpus', 'normas');
const utf8 = (s: string) => new TextEncoder().encode(s);

describe('colados do corpus: integridade (sem rede)', () => {
  it('toda norma tem colado da versão atual da página, com os bytes do índice', async () => {
    expect(await verificarDerivados(DIRETORIO)).toEqual([]);
  });

  it('o colar do Chromium preserva todo tachado da página (tag, estilo e <s> da ALESP)', async () => {
    const manifesto = await lerManifesto(DIRETORIO);
    const { colados } = await lerColados(DIRETORIO);
    for (const pagina of manifesto.normas) {
      const colado = colados.find((c) => c.id === pagina.id);
      if (!colado) throw new Error(`${pagina.id} sem colado`);
      const original = decodificar(
        await readFile(path.join(DIRETORIO, pagina.arquivo)),
        pagina.charset,
      );
      const html = await readFile(path.join(DIRETORIO, colado.html.arquivo), 'utf8');
      expect({ id: pagina.id, tachados: contarTachados(html) }).toEqual({
        id: pagina.id,
        tachados: contarTachados(original),
      });
    }
  });

  it('o colar traz a lei inteira, mesmo com o </html> no começo do CP e da CF', async () => {
    const texto = async (id: string) =>
      (await readFile(path.join(DIRETORIO, `${id}.colado.txt`), 'utf8')).replace(/\s+/g, ' ');
    expect(await texto('cp')).toContain('Art. 361 - Este Código entrará em vigor');
    expect(await texto('cf')).toContain('ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS');
  });
});

describe('derivados na pasta do corpus', () => {
  it('ehDerivado reconhece colado e gabarito, e não a página', () => {
    expect(ehDerivado('lep.colado.html')).toBe(true);
    expect(ehDerivado('lep.colado.txt')).toBe(true);
    expect(ehDerivado('lep.gabarito.json')).toBe(true);
    expect(ehDerivado('lep.html')).toBe(false);
    expect(ehDerivado('colados.json')).toBe(false);
  });

  it('verificarCorpus não acusa os colados como páginas fora do manifesto', async () => {
    const pasta = await mkdtemp(path.join(tmpdir(), 'arretado-derivados-'));
    try {
      await writeFile(path.join(pasta, 'lep.colado.html'), '<p>x</p>');
      await writeFile(path.join(pasta, 'sobra.html'), '<p>x</p>');
      const problemas = await verificarCorpus(pasta);
      expect(problemas).toContain('sobra.html: arquivo fora do manifesto — rode npm run corpus');
      expect(problemas.some((p) => p.includes('lep.colado.html'))).toBe(false);
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  });
});

describe('atualizarColado', () => {
  const nova = {
    id: 'lep',
    origemSha256Conteudo: 'a'.repeat(64),
    html: descreverArquivo('lep.colado.html', utf8('<p>Art. 1º</p>')),
    texto: descreverArquivo('lep.colado.txt', utf8('Art. 1º')),
    navegador: 'chromium 141.0.7390.37',
    plataforma: 'linux',
  };
  const anterior = { ...nova, capturadoEm: '2026-09-23T00:00:00.000Z' };

  it('mesma captura em outro navegador ou plataforma: mantém a entrada (sem diff)', () => {
    const r = atualizarColado(
      anterior,
      { ...nova, navegador: 'chromium 150', plataforma: 'win32' },
      'agora',
    );
    expect(r).toEqual({ entrada: anterior, mudou: false });
  });

  it('bytes diferentes ou outra origem: nova entrada com a data de agora', () => {
    const outroHtml = {
      ...nova,
      html: descreverArquivo('lep.colado.html', utf8('<p>Art. 2º</p>')),
    };
    expect(atualizarColado(anterior, outroHtml, 'agora')).toEqual({
      entrada: { ...outroHtml, capturadoEm: 'agora' },
      mudou: true,
    });
    const outraOrigem = { ...nova, origemSha256Conteudo: 'b'.repeat(64) };
    expect(atualizarColado(anterior, outraOrigem, 'agora').mudou).toBe(true);
    expect(atualizarColado(undefined, nova, 'agora').mudou).toBe(true);
  });

  it('índice serializado na ordem do catálogo e com LF no fim', () => {
    const texto = serializarColados({
      ...indiceVazio(),
      colados: [{ ...anterior, id: 'cf' }, anterior],
    });
    expect(texto.endsWith('}\n')).toBe(true);
    const ids = (JSON.parse(texto) as { colados: { id: string }[] }).colados.map((c) => c.id);
    expect(ids).toEqual(['lep', 'cf']);
  });
});

describe('conferirCaptura', () => {
  const html = '<p>Institui a Lei de Execução Penal.</p><p>Art. 1º - A execução</p>';
  const texto = 'Institui a Lei de Execução Penal.\nArt. 1º - A execução';

  it('captura certa: sem problemas', () => {
    expect(conferirCaptura('lep', html, texto)).toEqual([]);
  });

  it('acusa colar sem html, só texto, charset errado e norma trocada', () => {
    expect(conferirCaptura('lep', '', texto)).toEqual(['lep: colado sem html']);
    expect(conferirCaptura('lep', texto, texto)).toEqual([
      'lep: o html colado não tem marcação — veio só texto?',
    ]);
    expect(conferirCaptura('lep', html.replace('ç', String.fromCharCode(0xfffd)), texto)).toContain(
      'lep: caractere de substituição (U+FFFD) no html — charset errado?',
    );
    expect(conferirCaptura('cp', html, texto)).toContain(
      'cp: marcador "código penal" ausente do html colado',
    );
  });
});

describe('verificarDerivados: amarração à página de origem', () => {
  const html = utf8('<p>Institui a Lei de Execução Penal.</p><p>Art. 1º - A execução</p>');
  const texto = utf8('Institui a Lei de Execução Penal.\nArt. 1º - A execução');

  /** Pasta com o manifesto real e só o colado (sintético) da LEP. */
  async function pastaComColado(origem: string) {
    const pasta = await mkdtemp(path.join(tmpdir(), 'arretado-derivados-'));
    await copyFile(path.join(DIRETORIO, NOME_MANIFESTO), path.join(pasta, NOME_MANIFESTO));
    await writeFile(path.join(pasta, 'lep.colado.html'), html);
    await writeFile(path.join(pasta, 'lep.colado.txt'), texto);
    const indice = {
      ...indiceVazio(),
      colados: [
        {
          id: 'lep',
          origemSha256Conteudo: origem,
          html: descreverArquivo('lep.colado.html', html),
          texto: descreverArquivo('lep.colado.txt', texto),
          navegador: 'chromium 141.0.7390.37',
          plataforma: 'linux',
          capturadoEm: '2026-09-23T00:00:00.000Z',
        },
      ],
    };
    await writeFile(path.join(pasta, NOME_INDICE_COLADOS), serializarColados(indice));
    return pasta;
  }

  const daLep = (problemas: string[]) => problemas.filter((p) => /^lep[:.]/.test(p));
  const origemAtual = async () =>
    (await lerManifesto(DIRETORIO)).normas.find((e) => e.id === 'lep')?.sha256Conteudo ?? '';

  it('colado da versão atual e íntegro: nada a acusar da LEP; as outras normas pedem colado', async () => {
    const pasta = await pastaComColado(await origemAtual());
    try {
      const problemas = await verificarDerivados(pasta);
      expect(daLep(problemas)).toEqual([]);
      expect(problemas).toContain('cp: sem colado — rode npm run corpus:colar');
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  });

  it('página mudou depois da captura: colado desatualizado', async () => {
    const pasta = await pastaComColado('0'.repeat(64));
    try {
      expect(daLep(await verificarDerivados(pasta))).toEqual([
        'lep: colado capturado de outra versão da página — rode npm run corpus:colar',
      ]);
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  });

  it('colado alterado no disco, colado sobrando e gabarito de outra versão são acusados', async () => {
    const pasta = await pastaComColado(await origemAtual());
    try {
      await writeFile(path.join(pasta, 'lep.colado.txt'), utf8('Art. 1º\r\n'));
      await writeFile(path.join(pasta, 'lep-compilado.colado.html'), html);
      await writeFile(
        path.join(pasta, 'lep.gabarito.json'),
        JSON.stringify({ origemSha256Conteudo: '0'.repeat(64) }),
      );
      await writeFile(path.join(pasta, 'lei-velha.gabarito.json'), '{}');
      const problemas = await verificarDerivados(pasta);
      expect(problemas).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^lep: lep\.colado\.txt com \d+ bytes no disco/),
          'lep: hash de lep.colado.txt difere do índice',
          'lep-compilado.colado.html: colado fora do índice — rode npm run corpus:colar',
          'lep.gabarito.json: feito sobre outra versão da página — refazer a conferência (7.3)',
          'lei-velha.gabarito.json: gabarito de norma fora do catálogo',
        ]),
      );
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  });

  it('gabarito da versão atual e dos colados atuais passa', async () => {
    const pasta = await pastaComColado(await origemAtual());
    try {
      await writeFile(
        path.join(pasta, 'lep.gabarito.json'),
        JSON.stringify({
          origemSha256Conteudo: await origemAtual(),
          origemSha256Colados: { 'lep.colado.html': sha256Hex(html) },
        }),
      );
      expect(daLep(await verificarDerivados(pasta))).toEqual([]);
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  });

  it('gabarito feito sobre outro colado, ou sem o hash dos colados, é acusado', async () => {
    const pasta = await pastaComColado(await origemAtual());
    try {
      const origem = await origemAtual();
      await writeFile(
        path.join(pasta, 'lep.gabarito.json'),
        JSON.stringify({
          origemSha256Conteudo: origem,
          origemSha256Colados: {
            'lep.colado.html': '0'.repeat(64),
            'lep-compilado.colado.html': sha256Hex(html),
          },
        }),
      );
      expect(daLep(await verificarDerivados(pasta))).toEqual([
        'lep.gabarito.json: feito sobre outro lep.colado.html — rode npm run corpus:gabarito',
        'lep.gabarito.json: feito sobre outro lep-compilado.colado.html — rode npm run corpus:gabarito',
      ]);
      await writeFile(
        path.join(pasta, 'lep.gabarito.json'),
        JSON.stringify({ origemSha256Conteudo: origem }),
      );
      expect(daLep(await verificarDerivados(pasta))).toEqual([
        'lep.gabarito.json: sem origemSha256Colados — rode npm run corpus:gabarito',
      ]);
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  });
});
