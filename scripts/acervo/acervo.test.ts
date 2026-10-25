// Pipeline do acervo em disco: gera duas vezes (mesmo hash) e confere o que está em public/acervo.
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { compararAcervo, gerarAcervo, verificarPasta, type Pastas } from './nucleo';

const pastas: string[] = [];
afterEach(async () => {
  await Promise.all(pastas.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});

async function montar(): Promise<Pastas> {
  const raiz = await mkdtemp(join(tmpdir(), 'acervo-teste-'));
  pastas.push(raiz);
  await mkdir(join(raiz, 'fontes'));
  await writeFile(
    join(raiz, 'fontes', 'ok.md'),
    '# LEI Nº 1\n\nArt. 1º Primeiro.\n\nArt. 2º Segundo.\n',
  );
  await writeFile(join(raiz, 'fontes', 'tecnico.md'), '# Política\ntexto\n## Parte\nmais texto\n');
  await writeFile(join(raiz, 'fontes', 'ruim.md'), 'Sem artigo nenhum.\n');
  const item = (id: string, arquivo: string, extra = {}) => ({
    id,
    titulo: id,
    grupo: 'Teste',
    fonte: { adaptador: 'markdown', arquivo },
    ...extra,
  });
  await writeFile(
    join(raiz, 'curadoria.json'),
    JSON.stringify({
      versao: 1,
      itens: [
        item('lei-ok', 'ok.md'),
        item('doc-tecnico', 'tecnico.md', { semArtigos: true }),
        item('lei-ruim', 'ruim.md'),
      ],
    }),
  );
  return {
    curadoria: join(raiz, 'curadoria.json'),
    fontes: join(raiz, 'fontes'),
    cache: join(raiz, 'cache'),
    saida: join(raiz, 'saida'),
    relatorio: join(raiz, 'relatorio.md'),
  };
}

describe('compararAcervo', () => {
  it('só lê: iguais aos publicados, depois diferente quando a fonte muda, bloqueado e sem cache', async () => {
    const p = await montar();
    await gerarAcervo(p);
    const antes = await readFile(join(p.saida, 'indice.json'), 'utf-8');
    const situacoes = async () =>
      Object.fromEntries((await compararAcervo(p)).map((i) => [i.id, i.situacao]));
    expect(await situacoes()).toEqual({
      'lei-ok': 'igual',
      'doc-tecnico': 'igual',
      'lei-ruim': 'bloqueado',
    });
    await writeFile(
      join(p.fontes, 'ok.md'),
      '# LEI Nº 1\n\nArt. 1º Primeiro.\n\nArt. 2º Segundo.\n\nArt. 3º Terceiro.\n',
    );
    const [ok] = await compararAcervo(p, 'lei-ok');
    expect(ok).toMatchObject({
      situacao: 'diferente',
      nosAntes: 2,
      nosDepois: 3,
      surgiram: ['art3'],
    });
    expect(await readFile(join(p.saida, 'indice.json'), 'utf-8')).toBe(antes);
    await expect(compararAcervo(p, 'nao-existe')).rejects.toThrow(/fora da curadoria/);
  });
});

describe('gerarAcervo', () => {
  it('publica os íntegros, bloqueia o com anomalia e escreve o relatório', async () => {
    const p = await montar();
    expect(await gerarAcervo(p)).toEqual({ publicados: 2, bloqueados: 1 });
    expect(await verificarPasta(p.saida)).toEqual([]);
    const indice = JSON.parse(await readFile(join(p.saida, 'indice.json'), 'utf-8')) as {
      itens: { id: string }[];
    };
    expect(indice.itens.map((i) => i.id)).toEqual(['lei-ok', 'doc-tecnico']);
    const relatorio = await readFile(p.relatorio, 'utf-8');
    expect(relatorio).toMatch(/lei-ruim \| bloqueado/);
    expect(relatorio).toMatch(/sem_artigos/);
  });

  it('gerar duas vezes dá o mesmo índice (hash reprodutível) e `id` refaz só um item', async () => {
    const p = await montar();
    await gerarAcervo(p);
    const primeiro = await readFile(join(p.saida, 'indice.json'), 'utf-8');
    await gerarAcervo(p);
    expect(await readFile(join(p.saida, 'indice.json'), 'utf-8')).toBe(primeiro);
    await gerarAcervo(p, 'lei-ok');
    expect(await readFile(join(p.saida, 'indice.json'), 'utf-8')).toBe(primeiro);
    await expect(gerarAcervo(p, 'nao-existe')).rejects.toThrow(/fora da curadoria/);
  });

  it('versão nova guarda a anterior em historico/<id>.<hash>.json, intacta (AL)', async () => {
    const p = await montar();
    await gerarAcervo(p);
    const lerIndice = async () =>
      JSON.parse(await readFile(join(p.saida, 'indice.json'), 'utf-8')) as {
        itens: { id: string; hash: string }[];
      };
    const hashDe = async (id: string) => (await lerIndice()).itens.find((i) => i.id === id)?.hash;
    const antigo = await hashDe('lei-ok');
    const corpoAntigo = await readFile(join(p.saida, 'lei-ok.json'));
    await writeFile(join(p.fontes, 'ok.md'), '# LEI Nº 1\n\nArt. 1º Primeiro.\n\nArt. 2º Outro.\n');
    await gerarAcervo(p, 'lei-ok');
    expect(await hashDe('lei-ok')).not.toBe(antigo);
    const guardado = await readFile(join(p.saida, 'historico', `lei-ok.${String(antigo)}.json`));
    expect(Buffer.compare(guardado, corpoAntigo)).toBe(0);
    // Gerar de novo sem mudança não mexe no histórico nem cria entrada repetida.
    await gerarAcervo(p);
    expect(await verificarPasta(p.saida)).toEqual([]);
  });

  it('verificarPasta acusa o arquivo adulterado', async () => {
    const p = await montar();
    await gerarAcervo(p);
    const arquivo = join(p.saida, 'lei-ok.json');
    await writeFile(arquivo, (await readFile(arquivo, 'utf-8')).replace('Primeiro', 'Primeira'));
    expect((await verificarPasta(p.saida)).map((x) => x.problema).join('|')).toMatch(/hash/);
  });
});

describe('pacote de partida na pasta do acervo', () => {
  const pacote = (ids: string[]) =>
    JSON.stringify({
      versao: 1,
      aprovadoEm: '2026-10-25',
      aprovadoPor: 'Teste',
      regra: 'Teste',
      carreiras: {
        'carreira-a': {
          nome: 'Carreira A',
          editaisComTexto: 4,
          normas: ids.map((id) => ({ id, titulo: id, editaisQueCitam: 3, porcentagem: 75 })),
        },
      },
    });

  it('não é tomado por item do acervo, e confere quando cada norma dele está no índice', async () => {
    const p = await montar();
    await gerarAcervo(p);
    await writeFile(join(p.saida, 'pacote-de-partida.json'), pacote(['lei-ok', 'doc-tecnico']));
    expect(await verificarPasta(p.saida)).toEqual([]);
  });

  it('acusa a norma do pacote que não está no índice', async () => {
    const p = await montar();
    await gerarAcervo(p);
    await writeFile(join(p.saida, 'pacote-de-partida.json'), pacote(['lei-ok', 'lei-sumiu']));
    expect(await verificarPasta(p.saida)).toEqual([
      {
        id: 'pacote-de-partida',
        problema: 'carreira-a cita lei-sumiu, que não está no índice',
      },
    ]);
  });

  it('acusa o pacote que não é JSON ou fora do esquema', async () => {
    const p = await montar();
    await gerarAcervo(p);
    await writeFile(join(p.saida, 'pacote-de-partida.json'), 'não é json');
    expect((await verificarPasta(p.saida)).map((x) => x.problema)).toEqual([
      'pacote-de-partida.json não é JSON',
    ]);
    await writeFile(join(p.saida, 'pacote-de-partida.json'), '{"versao":2}');
    expect((await verificarPasta(p.saida))[0]?.problema).toMatch(/^esquema do pacote/);
  });
});

describe('acervo versionado', () => {
  it('public/acervo (se existir) confere com o índice e os hashes', async () => {
    const problemas = await verificarPasta(join(process.cwd(), 'public', 'acervo'));
    expect(problemas).toEqual([]);
  });
});
