import { strToU8, unzipSync, zipSync } from 'fflate';
import { repositorioDeTeste } from '../../testes/repositorio';
import { deBytes } from './bytes';
import { exportarPacote } from './exportar';
import { Manifesto, ManifestoCifrado, PacoteRecusado, type MotivoRecusa } from './formato';
import { lerPacote } from './ler';

const ERRO = {
  resultado: 'errou' as const,
  oQueFoi: 'Prazo do art. 112',
  status: 'aberto' as const,
};

async function repoComDados() {
  const ctx = await repositorioDeTeste();
  const erros = ctx.repo.colecao('erros');
  const e = await erros.criar({ ...ERRO, fraseCorreta: 'Um sexto da pena.' });
  await erros.criar({ ...ERRO, oQueFoi: 'Outro' });
  await erros.excluir((await erros.criar({ ...ERRO, oQueFoi: 'Excluído' })).id);
  await ctx.repo.colecao('cartoes').criar({
    frente: 'Prazo?',
    verso: null,
    origemTipo: 'erro',
    erroId: e.id,
    estado: 'ativo',
    caixa: 1,
    proximaRevisao: '2026-09-24',
  });
  return ctx;
}

async function recusa(p: Promise<unknown>): Promise<MotivoRecusa> {
  try {
    await p;
  } catch (e) {
    if (e instanceof PacoteRecusado) return e.motivo;
    throw e;
  }
  throw new Error('pacote deveria ter sido recusado');
}

/** Reempacota alterando o conteúdo interno (simula edição fora do app). */
function adulterar(bytes: Uint8Array, fn: (arquivos: Record<string, Uint8Array>) => void) {
  const arquivos = unzipSync(bytes);
  fn(arquivos);
  return zipSync(arquivos);
}

describe('exportação (3.2)', () => {
  it('gera ZIP legível com manifesto válido e um arquivo por coleção', async () => {
    const { repo } = await repoComDados();
    const { bytes, manifesto, nomeArquivo } = await exportarPacote(repo);
    const arquivos = unzipSync(bytes);
    const lido = Manifesto.parse(JSON.parse(deBytes(arquivos['manifesto.json']!)));
    expect(lido).toEqual(manifesto);
    expect(manifesto.escopo).toEqual({ tipo: 'integral' });
    expect(manifesto.contagens.erros).toBe(3);
    expect(manifesto.contagens.cartoes).toBe(1);
    expect(Object.keys(arquivos)).toContain('dados/erros.json');
    expect(Object.keys(arquivos)).toContain('dados/revisoes.json');
    expect(Object.keys(arquivos)).not.toContain('dados/snapshots.json');
    const erros = JSON.parse(deBytes(arquivos['dados/erros.json']!)) as { id: string }[];
    expect(erros.map((e) => e.id)).toEqual(erros.map((e) => e.id).sort());
    expect(nomeArquivo).toMatch(/^arretado-2026-09-23-0900\.arretado$/);
  });

  it('é determinística: mesmos dados, mesmo hash do conjunto', async () => {
    const { repo, relogio } = await repoComDados();
    const a = await exportarPacote(repo);
    relogio.avancar(60_000);
    const b = await exportarPacote(repo);
    expect(b.manifesto.hashConjunto).toBe(a.manifesto.hashConjunto);
    expect(b.manifesto.criadoEm).not.toBe(a.manifesto.criadoEm);
  });

  it('exporta por módulo e, opcionalmente, o log', async () => {
    const { repo } = await repoComDados();
    const { bytes } = await exportarPacote(repo, {
      escopo: { tipo: 'modulos', modulos: ['recall'] },
      incluirLog: true,
    });
    const nomes = Object.keys(unzipSync(bytes)).sort();
    expect(nomes).toEqual([
      'dados/cartoes.json',
      'dados/erros.json',
      'dados/frases.json',
      'dados/revisoes.json',
      'dados/revisoesFrase.json',
      'log.json',
      'manifesto.json',
    ]);
  });
});

describe('leitura e validação (3.1, 3.4)', () => {
  it('lê de volta exatamente os registros exportados', async () => {
    const { repo } = await repoComDados();
    const { bytes } = await exportarPacote(repo);
    const lido = await lerPacote(bytes);
    const locais = await repo.db.tabela('erros').toArray();
    expect(lido.registros.get('erros')).toEqual(expect.arrayContaining(locais));
    expect(lido.registros.get('erros')).toHaveLength(3);
    expect(lido.cifrado).toBe(false);
    expect(lido.hashArquivo).toMatch(/^[0-9a-f]{64}$/);
  });

  it('recusa o que não é pacote', async () => {
    expect(await recusa(lerPacote(strToU8('não é zip')))).toBe('nao_e_pacote');
    expect(await recusa(lerPacote(zipSync({ 'x.txt': strToU8('x') })))).toBe('nao_e_pacote');
    const outro = zipSync({ 'manifesto.json': strToU8('{"formato":"outro"}') });
    expect(await recusa(lerPacote(outro))).toBe('nao_e_pacote');
  });

  it('recusa formato e esquema posteriores', async () => {
    const { repo } = await repoComDados();
    const { bytes } = await exportarPacote(repo);
    const trocar = (campo: string, valor: unknown) =>
      adulterar(bytes, (a) => {
        const m = JSON.parse(deBytes(a['manifesto.json']!)) as Record<string, unknown>;
        m[campo] = valor;
        a['manifesto.json'] = strToU8(JSON.stringify(m));
      });
    expect(await recusa(lerPacote(trocar('versaoFormato', 0)))).toBe('formato_desconhecido');
    expect(await recusa(lerPacote(trocar('versaoFormato', '2')))).toBe('formato_desconhecido');
    // Formato mais novo que o deste app (AL): pede para atualizar, como o esquema posterior.
    expect(await recusa(lerPacote(trocar('versaoFormato', 3)))).toBe('versao_posterior');
    expect(await recusa(lerPacote(trocar('versaoEsquema', 99)))).toBe('versao_posterior');
  });

  it('recusa qualquer alteração feita fora do app', async () => {
    const { repo } = await repoComDados();
    const { bytes } = await exportarPacote(repo);
    const casos: ((a: Record<string, Uint8Array>) => void)[] = [
      (a) => {
        a['dados/erros.json'] = strToU8(deBytes(a['dados/erros.json']!).replace('Prazo', 'Prezo'));
      },
      (a) => {
        a['extra.txt'] = strToU8('x');
      },
      (a) => {
        delete a['dados/cartoes.json'];
      },
      (a) => {
        const m = JSON.parse(deBytes(a['manifesto.json']!)) as Manifesto;
        m.hashConjunto = '0'.repeat(64);
        a['manifesto.json'] = strToU8(JSON.stringify(m));
      },
      (a) => {
        // Arquivo e hash trocados juntos, mas o hash do conjunto denuncia.
        const m = JSON.parse(deBytes(a['manifesto.json']!)) as Manifesto;
        a['dados/erros.json'] = strToU8('[]\n');
        m.arquivos['dados/erros.json'] = {
          sha256: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
          bytes: 3,
        };
        a['manifesto.json'] = strToU8(JSON.stringify(m));
      },
    ];
    for (const caso of casos) {
      expect(await recusa(lerPacote(adulterar(bytes, caso)))).toBe('arquivo_alterado');
    }
  });

  it('recusa registro inválido ou de outro usuário mesmo com hashes recalculados', async () => {
    const { repo } = await repoComDados();
    const { exportarPacote: exp } = await import('./exportar');
    const { hashDoConjunto, serializarLista } = await import('./exportar');
    const { sha256 } = await import('./bytes');
    const { bytes } = await exp(repo);
    type Registro = Record<string, unknown>;
    const mudancas: ((r: Registro) => Registro)[] = [
      (r) => ({ ...r, resultado: 'talvez' }),
      (r) => ({ ...r, usuarioId: repo.ctx.novoId() }),
    ];
    for (const mudar of mudancas) {
      const a: Record<string, Uint8Array> = unzipSync(bytes);
      const m = JSON.parse(deBytes(a['manifesto.json']!)) as Manifesto;
      const erros = (JSON.parse(deBytes(a['dados/erros.json']!)) as Record<string, unknown>[]).map(
        mudar,
      );
      const novo = serializarLista(erros);
      a['dados/erros.json'] = novo;
      m.arquivos['dados/erros.json'] = { sha256: await sha256(novo), bytes: novo.length };
      m.hashConjunto = await hashDoConjunto(m.arquivos);
      a['manifesto.json'] = strToU8(JSON.stringify(m));
      expect(await recusa(lerPacote(zipSync(a)))).toBe('arquivo_alterado');
    }
  });
});

describe('cifra (3.3)', () => {
  it('cifra, exige senha, recusa senha errada e adulteração, e abre com a certa', async () => {
    const { repo } = await repoComDados();
    const { bytes } = await exportarPacote(repo, { senha: 'correta horse', iteracoes: 1_000 });
    const externo = unzipSync(bytes);
    expect(Object.keys(externo).sort()).toEqual(['conteudo.cifrado', 'manifesto.json']);
    const cab = ManifestoCifrado.parse(JSON.parse(deBytes(externo['manifesto.json']!)));
    expect(JSON.stringify(cab)).not.toContain(repo.ctx.usuarioId);

    expect(await recusa(lerPacote(bytes))).toBe('senha_necessaria');
    expect(await recusa(lerPacote(bytes, { senha: 'errada' }))).toBe('senha_ou_arquivo_invalido');
    const adulterado = adulterar(bytes, (a) => {
      const c = a['conteudo.cifrado']!;
      c[c.length - 1] = (c[c.length - 1] ?? 0) ^ 1;
    });
    expect(await recusa(lerPacote(adulterado, { senha: 'correta horse' }))).toBe(
      'senha_ou_arquivo_invalido',
    );
    const lido = await lerPacote(bytes, { senha: 'correta horse' });
    expect(lido.cifrado).toBe(true);
    expect(lido.registros.get('erros')).toHaveLength(3);
  });

  it('usa 600 mil iterações por padrão', async () => {
    const { repo } = await repositorioDeTeste();
    const { bytes } = await exportarPacote(repo, { senha: 's' });
    const cab = ManifestoCifrado.parse(JSON.parse(deBytes(unzipSync(bytes)['manifesto.json']!)));
    expect(cab.cifra.iteracoes).toBe(600_000);
  });
});
