import { LIMITE_MAXIMO_PAGINA, type Repositorio } from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { blocosDeNormaSintetica } from '../../testes/norma-sintetica';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  abrirNorma,
  lerJanela,
  NormaIndisponivel,
  normasPublicadas,
  type MotivoNormaIndisponivel,
} from './leitor';
import { criarRascunho, publicarVersao } from './servico';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 1.234, DE 5 DE MAIO DE 2020.'),
  linha('Dispõe sobre o teste.'),
  linha(
    'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:',
  ),
  linha('TÍTULO I'),
  linha('DAS DISPOSIÇÕES GERAIS'),
  linha('Objeto'),
  linha('Art. 1º Esta Lei trata do teste. (Redação dada pela Lei nº 14.000, de 2021)'),
  linha('Parágrafo único. O teste é contínuo.'),
  linha('Art. 2º São deveres:'),
  linha('I - estudar;'),
  linha('II - revisar.'),
];

// Endereço e nível de cada nó, na ordem de leitura (a rubrica é filha do artigo e vem depois dele).
const ARVORE = [
  ['preambulo', 0],
  ['tit1', 0],
  ['tit1.nome', 1],
  ['art1', 1],
  ['art1.nome', 2],
  ['art1.parUnico', 2],
  ['art2', 1],
  ['art2.incI', 2],
  ['art2.incII', 2],
];

async function publicada(repo: Repositorio, blocos: readonly Bloco[] = LEI) {
  const { versao } = await criarRascunho(repo, { blocos, origemEntrada: 'html' });
  return publicarVersao(repo, versao.id);
}

const texto = (t: { trechos: { texto: string }[] } | undefined) =>
  t?.trechos.map((x) => x.texto).join('');

async function motivoDa(
  promessa: Promise<unknown>,
): Promise<MotivoNormaIndisponivel | 'sem falha'> {
  try {
    await promessa;
  } catch (excecao) {
    if (excecao instanceof NormaIndisponivel) return excecao.motivo;
    throw excecao;
  }
  return 'sem falha';
}

describe('abrir a norma para leitura (9.4)', () => {
  it('abre a versão vigente com a árvore inteira, na ordem de leitura, com o nível e sem textos', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma, versao } = await publicada(repo);

    const aberta = await abrirNorma(repo, norma.id);
    expect(aberta.norma.id).toBe(norma.id);
    expect(aberta.versao).toEqual(versao);
    expect(aberta.nos.map((n) => [n.dispositivo.endereco, n.nivel])).toEqual(ARVORE);
    expect(aberta.nos.map((n) => n.dispositivo.ordem)).toEqual(ARVORE.map((_, i) => i + 1));
    for (const [i, no] of aberta.nos.entries()) {
      expect(aberta.indiceDe.get(no.dispositivo.id)).toBe(i);
    }
    expect(aberta.nos[0]).not.toHaveProperty('texto');
  });

  it('norma só com rascunho, inexistente ou excluída não abre', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    expect(await motivoDa(abrirNorma(repo, norma.id))).toBe('sem_versao_vigente');
    expect(await motivoDa(abrirNorma(repo, 'nao-existe'))).toBe('inexistente');

    const outra = await publicada(repo);
    await repo.colecao('normas').excluir(outra.norma.id);
    expect(await motivoDa(abrirNorma(repo, outra.norma.id))).toBe('inexistente');
    await expect(abrirNorma(repo, norma.id)).rejects.toThrow(
      'Esta norma ainda não foi publicada. Revise o rascunho e publique para ler.',
    );
  });

  it('versão vigente que não é vigente, ou de outra norma, não abre', async () => {
    const { repo } = await repositorioDeTeste();
    const a = await publicada(repo);
    const b = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const normas = repo.colecao('normas');

    await normas.atualizar(a.norma.id, { versaoVigenteId: b.versao.id });
    expect(await motivoDa(abrirNorma(repo, a.norma.id))).toBe('sem_versao_vigente');
    await normas.atualizar(b.norma.id, { versaoVigenteId: a.versao.id });
    expect(await motivoDa(abrirNorma(repo, b.norma.id))).toBe('sem_versao_vigente');
    await normas.atualizar(a.norma.id, { versaoVigenteId: repo.ctx.novoId() });
    expect(await motivoDa(abrirNorma(repo, a.norma.id))).toBe('sem_versao_vigente');
  });

  it('dispositivo excluído fica fora da árvore', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma } = await publicada(repo);
    const art2 = (await abrirNorma(repo, norma.id)).nos[6]?.dispositivo;
    expect(art2?.endereco).toBe('art2');
    await repo.colecao('dispositivos').excluir(art2?.id ?? '');

    const aberta = await abrirNorma(repo, norma.id);
    expect(aberta.nos.map((n) => n.dispositivo.endereco)).not.toContain('art2');
    expect(aberta.nos).toHaveLength(ARVORE.length - 1);
    expect(aberta.indiceDe.has(art2?.id ?? '')).toBe(false);
  });
});

describe('ler os textos por janela (9.4)', () => {
  it('traz cada nó da janela com o texto na versão aberta', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma, versao } = await publicada(repo);
    const aberta = await abrirNorma(repo, norma.id);

    const janela = await lerJanela(repo, aberta, { inicio: 3, quantidade: 3 });
    expect(janela.map((i) => [i.indice, i.dispositivo.endereco, i.nivel, texto(i.texto)])).toEqual([
      [3, 'art1', 1, 'Esta Lei trata do teste.'],
      [4, 'art1.nome', 2, 'Objeto'],
      [5, 'art1.parUnico', 2, 'O teste é contínuo.'],
    ]);
    const [art1] = janela;
    expect(art1?.texto).toMatchObject({ versaoId: versao.id, dispositivoId: art1?.dispositivo.id });
    expect(art1?.texto?.notasVigencia).toEqual([
      { texto: '(Redação dada pela Lei nº 14.000, de 2021)', lei: 'Lei nº 14.000', ano: 2021 },
    ]);
  });

  it('fora da árvore a janela encolhe; a quantidade vai até 200', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma } = await publicada(repo);
    const aberta = await abrirNorma(repo, norma.id);
    const indices = async (inicio: number, quantidade: number) =>
      (await lerJanela(repo, aberta, { inicio, quantidade })).map((i) => i.indice);

    expect(await indices(7, 10)).toEqual([7, 8]);
    expect(await indices(-5, 2)).toEqual([0, 1]);
    expect(await indices(9, 5)).toEqual([]);
    expect(await indices(0, 0)).toEqual([]);
    expect(await indices(1.7, 1.9)).toEqual([1]);

    const grande = await publicada(repo, blocosDeNormaSintetica(300));
    const abertaGrande = await abrirNorma(repo, grande.norma.id);
    expect(abertaGrande.nos.length).toBeGreaterThan(LIMITE_MAXIMO_PAGINA);
    const janela = await lerJanela(repo, abertaGrande, { inicio: 50, quantidade: 1_000 });
    expect(janela).toHaveLength(LIMITE_MAXIMO_PAGINA);
    expect(janela.every((i) => i.texto !== undefined)).toBe(true);
    expect(janela.at(-1)?.indice).toBe(50 + LIMITE_MAXIMO_PAGINA - 1);
  });

  it('norma de duas versões e rascunho de outra: só os textos da vigente, nunca os da arquivada nem os do rascunho', async () => {
    const { repo } = await repositorioDeTeste();
    const primeira = await publicada(repo);
    const normaId = primeira.norma.id;
    const antiga = await abrirNorma(repo, normaId);
    const versoes = repo.colecao('versoesNorma');
    const textos = repo.colecao('textosDispositivo');

    // A versão nova (F6, montada à mão): os mesmos dispositivos, outro texto; a primeira é arquivada.
    const outraVersao = async (status: 'vigente' | 'rascunho', marca: string) => {
      const versao = await versoes.criar({ ...primeira.versao, status, hash: marca.repeat(64) });
      await textos.criarLote(
        antiga.nos.map((no) => ({
          dados: {
            versaoId: versao.id,
            dispositivoId: no.dispositivo.id,
            normaId,
            trechos: [{ texto: `${marca} ${no.dispositivo.endereco}` }],
          },
        })),
      );
      return versao;
    };
    const vigente = await outraVersao('vigente', 'b');
    await versoes.atualizar(primeira.versao.id, { status: 'arquivada' });
    await repo.colecao('normas').atualizar(normaId, { versaoVigenteId: vigente.id });
    await outraVersao('rascunho', 'c');

    const aberta = await abrirNorma(repo, normaId);
    expect(aberta.versao.id).toBe(vigente.id);
    expect(aberta.nos.map((n) => n.dispositivo.id)).toEqual(
      antiga.nos.map((n) => n.dispositivo.id),
    );
    const janela = await lerJanela(repo, aberta, { inicio: 0, quantidade: 200 });
    expect(janela.map((i) => texto(i.texto))).toEqual(ARVORE.map(([e]) => `b ${String(e)}`));
    expect(janela.every((i) => i.texto?.versaoId === vigente.id)).toBe(true);

    // A janela aberta antes continua lendo a versão que abriu (a arquivada não muda).
    const daAntiga = await lerJanela(repo, antiga, { inicio: 3, quantidade: 1 });
    expect(texto(daAntiga[0]?.texto)).toBe('Esta Lei trata do teste.');
  });

  it('texto excluído vem ausente; o de outro usuário não aparece', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma } = await publicada(repo);
    const aberta = await abrirNorma(repo, norma.id);
    const [preambulo] = await lerJanela(repo, aberta, { inicio: 0, quantidade: 1 });
    await repo.colecao('textosDispositivo').excluir(preambulo?.texto?.id ?? '');

    expect((await lerJanela(repo, aberta, { inicio: 0, quantidade: 1 }))[0]?.texto).toBeUndefined();
    const outro = repo.comUsuario('outro-usuario');
    await expect(abrirNorma(outro, norma.id)).rejects.toMatchObject({ motivo: 'inexistente' });
    expect(
      (await lerJanela(outro, aberta, { inicio: 1, quantidade: 2 })).map((i) => i.texto),
    ).toEqual([undefined, undefined]);
  });
});

describe('normas publicadas, para a Biblioteca (9.5)', () => {
  it('lista só as publicadas, de todas as páginas, pelo título curto em ordem natural', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma: publicadaDeVerdade } = await publicada(repo);
    await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html', tituloCurto: 'Só rascunho' });
    // Mais de uma página (200): o ponteiro não é conferido na lista, só ao abrir.
    const normas = Array.from({ length: 205 }, (_, i) => ({
      dados: {
        tituloCurto: `Lei ${String(205 - i)}`,
        escopo: 'pessoal' as const,
        versaoVigenteId: repo.ctx.novoId(),
      },
    }));
    normas.push(
      { dados: { tituloCurto: 'árvore', escopo: 'pessoal', versaoVigenteId: repo.ctx.novoId() } },
      { dados: { tituloCurto: 'Excluída', escopo: 'pessoal', versaoVigenteId: repo.ctx.novoId() } },
    );
    const criadas = await repo.colecao('normas').criarLote(normas);
    await repo.colecao('normas').excluir(criadas.at(-1)?.id ?? '');
    await repo
      .comUsuario(repo.ctx.novoId())
      .colecao('normas')
      .criar({ tituloCurto: 'De outro', escopo: 'pessoal', versaoVigenteId: repo.ctx.novoId() });

    const lista = await normasPublicadas(repo);
    expect(lista).toHaveLength(207);
    expect(lista.slice(0, 5).map((n) => n.tituloCurto)).toEqual([
      'árvore',
      'Lei 1',
      'Lei 2',
      'Lei 3',
      'Lei 4',
    ]);
    expect(lista.at(-2)?.tituloCurto).toBe('Lei 205');
    expect(lista.at(-1)?.id).toBe(publicadaDeVerdade.id);
    expect(lista.map((n) => n.tituloCurto)).not.toContain('Só rascunho');
  });
});
