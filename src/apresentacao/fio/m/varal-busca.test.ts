import { aderirAoItem } from '../../../dominios/acervo/adesao';
import type { ItemDoAcervo } from '../../../dominios/acervo/esquemas';
import { FonteEmMemoria } from '../../../dominios/acervo/fonte-em-memoria';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { registrarErro } from '../../../dominios/recall/servico';
import { acharNoVaral } from './varal-busca';

const no = (endereco: string, rotulo: string, tipo: 'artigo' | 'sumula') => ({
  endereco,
  categoria: 'normativo' as const,
  tipo,
  rotulo,
  status: 'vigente' as const,
  confianca: 'alta' as const,
  trechos: [{ texto: `Texto de ${rotulo}.` }],
});

const lei = (id: string, tituloCurto: string): ItemDoAcervo => ({
  id,
  versao: 1,
  norma: { tituloCurto, tipo: 'Lei', esfera: 'federal' },
  nos: [
    no('art1', 'Art. 1º', 'artigo'),
    no('art112', 'Art. 112', 'artigo'),
    no('art121', 'Art. 121', 'artigo'),
  ],
});

const colecao = (id: string, tituloCurto: string): ItemDoAcervo => ({
  id,
  versao: 1,
  norma: { tituloCurto, tipo: 'Súmulas', esfera: 'federal', especie: 'sumulas' },
  nos: [no('s711', 'Súmula 711', 'sumula'), no('s593', 'Súmula 593', 'sumula')],
});

async function cenario() {
  const { repo } = await repositorioDeTeste();
  const fonte = await FonteEmMemoria.criar([
    { item: lei('lep', 'LEP') },
    { item: lei('codigo-penal', 'Código Penal') },
    { item: colecao('sumulas-stf', 'Súmulas STF') },
  ]);
  const ids: Record<string, string> = {};
  for (const entrada of (await fonte.listar()).itens) {
    const r = await aderirAoItem(repo, fonte, entrada);
    if (r.estado === 'adicionada') ids[entrada.id] = r.normaId;
  }
  return { repo, ids };
}

const nenhum = new Set<string>();

describe('a busca única do Varal', () => {
  it('"112 LEP" abre o artigo da LEP no Leitor', async () => {
    const { repo, ids } = await cenario();
    const achados = await acharNoVaral(repo, '112 LEP', nenhum);
    expect(achados[0]).toMatchObject({
      nome: 'LEP, art. 112',
      detalhe: 'abre no Leitor',
      tipo: 'rota',
      para: `/biblioteca/normas/${ids['lep'] ?? ''}?ir=art112`,
    });
  });

  it('entende "art. 121 do Código Penal", "LEP art 112" e a ordem trocada', async () => {
    const { repo, ids } = await cenario();
    const a = await acharNoVaral(repo, 'art. 121 do código penal', nenhum);
    expect(a[0]).toMatchObject({
      tipo: 'rota',
      para: `/biblioteca/normas/${ids['codigo-penal'] ?? ''}?ir=art121`,
    });
    const b = await acharNoVaral(repo, 'LEP art 112', nenhum);
    expect(b[0]?.nome).toBe('LEP, art. 112');
    const c = await acharNoVaral(repo, 'art. 112 da LEP', nenhum);
    expect(c[0]?.nome).toBe('LEP, art. 112');
  });

  it('artigo que a norma não tem não abre nada, e número sem norma não abre artigo', async () => {
    const { repo } = await cenario();
    expect(await acharNoVaral(repo, '999 LEP', nenhum)).toEqual([]);
    // "112" sozinho não diz de que norma: só aparece o que for súmula.
    expect((await acharNoVaral(repo, '112', nenhum)).map((a) => a.nome)).toEqual([]);
  });

  it('"711" lista a súmula, com a coleção em que ela está', async () => {
    const { repo, ids } = await cenario();
    const achados = await acharNoVaral(repo, '711', nenhum);
    expect(achados).toHaveLength(1);
    expect(achados[0]).toMatchObject({
      nome: 'Súmula 711',
      detalhe: 'Súmulas STF',
      para: `/biblioteca/normas/${ids['sumulas-stf'] ?? ''}?ir=s711`,
    });
    expect((await acharNoVaral(repo, 'súmula 593', nenhum))[0]?.nome).toBe('Súmula 593');
  });

  it('uma palavra lista as normas que a têm no nome, sem caixa nem acento', async () => {
    const { repo } = await cenario();
    expect((await acharNoVaral(repo, 'codigo', nenhum)).map((a) => a.nome)).toEqual([
      'Código Penal',
    ]);
    expect((await acharNoVaral(repo, 'sumulas', nenhum)).map((a) => a.nome)).toEqual([
      'Súmulas STF',
    ]);
  });

  it('uma palavra da Frase achá-la: o achado abre o Caderno nela, com o texto numa linha só', async () => {
    const { repo } = await cenario();
    const erro = await registrarErro(repo, {
      fraseCorreta: 'Reincidente em crime sem violência progride com 20% da pena.',
    });
    const frase = await repo.colecao('frases').todosDoUsuario();
    const achados = await acharNoVaral(repo, 'REINCIDENTE progride', nenhum);
    expect(achados).toEqual([
      {
        chave: `frase:${frase[0]?.id ?? ''}`,
        nome: 'Reincidente em crime sem violência progride com 20% da pena.',
        detalhe: 'Frase',
        tipo: 'frase',
        fraseId: frase[0]?.id,
      },
    ]);
    expect(erro.id).toBeTruthy();
    // Todas as palavras têm de estar na Frase.
    expect(await acharNoVaral(repo, 'reincidente homicidio', nenhum)).toEqual([]);
  });

  it('as Frases vêm depois das normas e o nome da longa é cortado', async () => {
    const { repo } = await cenario();
    await registrarErro(repo, {
      fraseCorreta: `A LEP trata da execução ${'penal '.repeat(30)}no Brasil.`,
    });
    const achados = await acharNoVaral(repo, 'lep', nenhum);
    expect(achados.map((a) => a.tipo)).toEqual(['rota', 'frase']);
    const frase = achados[1];
    expect(frase?.nome.length).toBeLessThanOrEqual(80);
    expect(frase?.nome.endsWith('…')).toBe(true);
  });

  it('não acha o que a pessoa tirou do varal, e o texto curto demais não busca', async () => {
    const { repo, ids } = await cenario();
    expect(await acharNoVaral(repo, 'LEP', new Set([ids['lep'] ?? '']))).toEqual([]);
    expect(await acharNoVaral(repo, 'l', nenhum)).toEqual([]);
    expect(await acharNoVaral(repo, '   ', nenhum)).toEqual([]);
  });
});
