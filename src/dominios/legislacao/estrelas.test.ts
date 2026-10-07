import type { Repositorio } from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  alternarEstrela,
  arvoreDaEstrela,
  desestrelar,
  estrelaEfetiva,
  EstrelaInvalida,
  estrelar,
  estrelasDaNorma,
  estrelasEfetivas,
  porAlvo,
  type ArvoreDaEstrela,
  type EstadoDaEstrela,
} from './estrelas';
import { abrirNorma } from './leitor';
import { criarRascunho, publicarVersao } from './servico';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
// Título I > Capítulo I > { Seção I > (arts. 1–2, Subseção I > art. 3), Seção II > (arts. 4–5) }.
const LEI: Bloco[] = [
  linha('LEI Nº 1, DE 1 DE JANEIRO DE 2000.'),
  linha('Dispõe sobre testes.'),
  linha('TÍTULO I'),
  linha('DAS DISPOSIÇÕES'),
  linha('CAPÍTULO I'),
  linha('DO OBJETO'),
  linha('Seção I'),
  linha('Da Pena'),
  linha('Art. 1º A pena é esta.'),
  linha('Art. 2º A outra pena.'),
  linha('§ 1º O parágrafo.'),
  linha('I - o inciso;'),
  linha('Subseção I'),
  linha('Da Multa Leve'),
  linha('Art. 3º A multa leve.'),
  linha('Seção II'),
  linha('Da Multa'),
  linha('Art. 4º A multa.'),
  linha('Art. 5º (VETADO).'),
];

const SEC1 = 'tit1.cap1.sec1';
const SUB1 = 'tit1.cap1.sec1.subsec1';
const SEC2 = 'tit1.cap1.sec2';

async function publicada() {
  const { repo } = await repositorioDeTeste();
  const { versao, norma } = await criarRascunho(repo, {
    blocos: LEI,
    origemEntrada: 'html',
    tituloCurto: 'Teste',
  });
  await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
  const aberta = await abrirNorma(repo, norma.id);
  const arvore = arvoreDaEstrela(norma.id, aberta.nos);
  const ids = new Map(aberta.nos.map((n) => [n.dispositivo.endereco, n.dispositivo.id]));
  const id = (endereco: string) => {
    const achado = ids.get(endereco);
    if (!achado) throw new Error(`sem ${endereco}`);
    return achado;
  };
  const enderecoDe = new Map([...ids].map(([e, i]) => [i, e]));
  return { repo, arvore, id, enderecoDe };
}

/** O estado de cada endereço, compacto: "direta", "herdada de sec1", "excecao de sec1" ou "—". */
async function estados(
  repo: Repositorio,
  arvore: ArvoreDaEstrela,
  enderecoDe: Map<string, string>,
  enderecos: string[],
  id: (e: string) => string,
) {
  const gravadas = porAlvo(await estrelasDaNorma(repo, arvore.normaId));
  const curto = (e: EstadoDaEstrela) => {
    const de = e.deId ? ` de ${String(enderecoDe.get(e.deId)?.split('.').pop())}` : '';
    return e.origem ? `${e.origem}${de}` : '—';
  };
  return Object.fromEntries(
    enderecos.map((e) => [e, curto(estrelaEfetiva(arvore, gravadas, id(e)))]),
  );
}

async function gravadasDe(
  repo: Repositorio,
  arvore: ArvoreDaEstrela,
  enderecoDe: Map<string, string>,
) {
  return (await estrelasDaNorma(repo, arvore.normaId))
    .map((e) => `${String(enderecoDe.get(e.alvoId))}:${e.origemTipo}`)
    .sort();
}

describe('estrela (11.2)', () => {
  it('tabela-verdade: Seção I propaga, artigo vira exceção, estrelar desfaz, desestrelar limpa', async () => {
    const { repo, arvore, id, enderecoDe } = await publicada();
    const ver = (enderecos: string[]) => estados(repo, arvore, enderecoDe, enderecos, id);
    const todos = [SEC1, 'art1', 'art2', 'art2.par1', 'art2.par1.incI', SUB1, 'art3', SEC2, 'art4'];

    // 1. Estrelar a Seção I propaga a tudo dentro dela (também à Subseção I), não à Seção II.
    const r1 = await estrelar(repo, arvore, id(SEC1));
    expect(r1.estado).toEqual({ estrelado: true, origem: 'direta' });
    expect(await ver(todos)).toEqual({
      [SEC1]: 'direta',
      art1: 'herdada de sec1',
      art2: 'herdada de sec1',
      'art2.par1': 'herdada de sec1',
      'art2.par1.incI': 'herdada de sec1',
      [SUB1]: 'herdada de sec1',
      art3: 'herdada de sec1',
      [SEC2]: '—',
      art4: '—',
    });
    expect(await gravadasDe(repo, arvore, enderecoDe)).toEqual([`${SEC1}:direta`]);

    // 2. Desmarcar um artigo dela grava a exceção; os filhos dele ficam sem estrela.
    const r2 = await desestrelar(repo, arvore, id('art2'));
    expect(r2.estado).toEqual({ estrelado: false, origem: 'excecao', deId: id(SEC1) });
    expect(await ver(['art1', 'art2', 'art2.par1', 'art3'])).toEqual({
      art1: 'herdada de sec1',
      art2: 'excecao de sec1',
      'art2.par1': '—',
      art3: 'herdada de sec1',
    });
    expect(await gravadasDe(repo, arvore, enderecoDe)).toEqual(['art2:excecao', `${SEC1}:direta`]);

    // 3. Estrelar de novo o artigo apaga a exceção: volta a herdar (não grava direta).
    const r3 = await estrelar(repo, arvore, id('art2'));
    expect(r3.estado).toEqual({ estrelado: true, origem: 'herdada', deId: id(SEC1) });
    expect(await gravadasDe(repo, arvore, enderecoDe)).toEqual([`${SEC1}:direta`]);

    // 4. Desestrelar a Seção apaga as exceções que ficariam órfãs; a direta de dentro fica.
    await desestrelar(repo, arvore, id('art1'));
    await estrelar(repo, arvore, id('art4'));
    await estrelar(repo, arvore, id('art3'));
    expect(await gravadasDe(repo, arvore, enderecoDe)).toEqual([
      'art1:excecao',
      'art4:direta',
      `${SEC1}:direta`,
    ]);
    await desestrelar(repo, arvore, id(SEC1));
    expect(await gravadasDe(repo, arvore, enderecoDe)).toEqual(['art4:direta']);
    expect(await ver([SEC1, 'art1', 'art2', 'art4'])).toEqual({
      [SEC1]: '—',
      art1: '—',
      art2: '—',
      art4: 'direta',
    });
  });

  it('nó dentro de nó: a gravada mais próxima vence, e a exceção de um nó corta o que está nele', async () => {
    const { repo, arvore, id, enderecoDe } = await publicada();
    const ver = (enderecos: string[]) => estados(repo, arvore, enderecoDe, enderecos, id);

    await estrelar(repo, arvore, id('tit1'));
    // A Seção I herda do Título; desmarcá-la é uma exceção que apaga tudo dentro dela.
    await desestrelar(repo, arvore, id(SEC1));
    expect(await ver([SEC1, 'art1', SUB1, 'art3', SEC2, 'art4'])).toEqual({
      [SEC1]: 'excecao de tit1',
      art1: '—',
      [SUB1]: '—',
      art3: '—',
      [SEC2]: 'herdada de tit1',
      art4: 'herdada de tit1',
    });
    // Estrelar a Subseção I, dentro da Seção I sem estrela, é direta, e o art. 3 herda dela.
    await estrelar(repo, arvore, id(SUB1));
    expect(await ver([SUB1, 'art3'])).toEqual({ [SUB1]: 'direta', art3: 'herdada de subsec1' });
    // Exceção dentro da Subseção (mais próxima que o Título).
    await desestrelar(repo, arvore, id('art3'));
    expect(await ver(['art3'])).toEqual({ art3: 'excecao de subsec1' });
    // Desestrelar a Subseção: a exceção do art. 3 fica órfã e sai; a da Seção I continua.
    await desestrelar(repo, arvore, id(SUB1));
    expect(await gravadasDe(repo, arvore, enderecoDe)).toEqual([`${SEC1}:excecao`, 'tit1:direta']);
    // Estrelar de novo a Seção I desfaz a exceção dela: tudo volta a herdar do Título.
    await estrelar(repo, arvore, id(SEC1));
    expect(await ver([SEC1, 'art3'])).toEqual({
      [SEC1]: 'herdada de tit1',
      art3: 'herdada de tit1',
    });
    expect(await gravadasDe(repo, arvore, enderecoDe)).toEqual(['tit1:direta']);
  });

  it('desestrelar o que não tem estrela e estrelar o que já tem não gravam nada', async () => {
    const { repo, arvore, id, enderecoDe } = await publicada();
    await desestrelar(repo, arvore, id('art1'));
    expect(await gravadasDe(repo, arvore, enderecoDe)).toEqual([]);
    await estrelar(repo, arvore, id(SEC1));
    await estrelar(repo, arvore, id('art1'));
    await estrelar(repo, arvore, id(SEC1));
    expect(await gravadasDe(repo, arvore, enderecoDe)).toEqual([`${SEC1}:direta`]);
  });

  it('alternar: põe no que não tem, tira da direta e da herdada (vira exceção)', async () => {
    const { repo, arvore, id, enderecoDe } = await publicada();
    expect((await alternarEstrela(repo, arvore, id(SEC1))).estado.origem).toBe('direta');
    expect((await alternarEstrela(repo, arvore, id('art1'))).estado.origem).toBe('excecao');
    expect((await alternarEstrela(repo, arvore, id('art1'))).estado.origem).toBe('herdada');
    expect((await alternarEstrela(repo, arvore, id(SEC1))).estado).toEqual({ estrelado: false });
    expect(await gravadasDe(repo, arvore, enderecoDe)).toEqual([]);
  });

  it('o vetado (e o revogado) não leva estrela nem herda; a rubrica também não', async () => {
    const { repo, arvore, id, enderecoDe } = await publicada();
    await estrelar(repo, arvore, id(SEC2));
    expect(await estados(repo, arvore, enderecoDe, ['art4', 'art5'], id)).toEqual({
      art4: 'herdada de sec2',
      art5: '—',
    });
    await expect(estrelar(repo, arvore, id('art5'))).rejects.toMatchObject({
      motivo: 'nao_estrelavel',
    });
    await expect(desestrelar(repo, arvore, id(`${SEC2}.nome`))).rejects.toBeInstanceOf(
      EstrelaInvalida,
    );
    await expect(estrelar(repo, arvore, crypto.randomUUID())).rejects.toMatchObject({
      motivo: 'inexistente',
    });
  });

  it('leitura por norma: só a desta norma, sem as excluídas; estado de todos os nós', async () => {
    const um = await publicada();
    const outra = await (async () => {
      const { versao, norma } = await criarRascunho(um.repo, {
        blocos: LEI,
        origemEntrada: 'html',
        tituloCurto: 'Outra',
      });
      await publicarVersao(um.repo, versao.id, { aceitarAConfirmar: true });
      const aberta = await abrirNorma(um.repo, norma.id);
      return { arvore: arvoreDaEstrela(norma.id, aberta.nos), nos: aberta.nos };
    })();
    const art1DaOutra = outra.nos.find((n) => n.dispositivo.endereco === 'art1')?.dispositivo.id;
    if (!art1DaOutra) throw new Error('sem art1');
    await estrelar(um.repo, outra.arvore, art1DaOutra);
    await estrelar(um.repo, um.arvore, um.id(SEC1));
    await estrelar(um.repo, um.arvore, um.id('art4'));
    await desestrelar(um.repo, um.arvore, um.id('art4'));
    // A estrela não atravessa normas: o alvo da outra norma não vale nesta árvore.
    await expect(estrelar(um.repo, um.arvore, art1DaOutra)).rejects.toMatchObject({
      motivo: 'inexistente',
    });

    const daNorma = await estrelasDaNorma(um.repo, um.arvore.normaId);
    expect(daNorma.map((e) => e.alvoId)).toEqual([um.id(SEC1)]);
    const efetivas = estrelasEfetivas(um.arvore, porAlvo(daNorma));
    expect(efetivas.size).toBe(um.arvore.porId.size);
    const estrelados = [...efetivas]
      .filter(([, e]) => e.estrelado)
      .map(([i]) => um.enderecoDe.get(i));
    expect(estrelados.sort()).toEqual(
      ['art1', 'art2', 'art2.par1', 'art2.par1.incI', 'art3', SEC1, SUB1].sort(),
    );
  });
});
