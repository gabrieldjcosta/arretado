import type { Bloco } from '../../core/seguranca/sanitizador';
import { repositorioDeTeste } from '../../testes/repositorio';
import { abrirNorma } from '../../dominios/legislacao/leitor';
import { gravarPosicao } from '../../dominios/legislacao/leituras';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { criarCartaoManual, hoje } from '../../dominios/recall/servico';
import { COMECOS } from '../../dominios/hoje/proxima-acao';
import { criarCiclo } from '../../dominios/ciclos';
import { escolherProximaAcao } from './proxima-acao';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha('O PRESIDENTE DA REPÚBLICA decreta:'),
  linha('Art. 1º A execução penal tem por objetivo efetivar as disposições de sentença.'),
  linha('Art. 2º A jurisdição penal dos Juízes será exercida no processo de execução.'),
];

async function lerLep(repo: Awaited<ReturnType<typeof repositorioDeTeste>>['repo']) {
  const { versao } = await criarRascunho(repo, {
    blocos: LEI,
    origemEntrada: 'html',
    tituloCurto: 'LEP',
  });
  const { norma } = await publicarVersao(repo, versao.id);
  const { nos } = await abrirNorma(repo, norma.id);
  await gravarPosicao(
    repo,
    norma.id,
    nos.find((n) => n.dispositivo.tipo === 'artigo')!.dispositivo.id,
  );
  return norma;
}

describe('escolherProximaAcao (A1)', () => {
  it('sem nada: estado vazio com os três começos', async () => {
    const { repo } = await repositorioDeTeste();
    const r = await escolherProximaAcao(repo, hoje(repo));
    expect(r).toEqual({ tipo: 'vazio', comecos: COMECOS });
    expect(COMECOS.map((c) => c.id)).toEqual(['escolher_concurso', 'ler_norma', 'registrar_erro']);
  });

  it('revisão vencida vence a leitura salva', async () => {
    const { repo } = await repositorioDeTeste();
    await lerLep(repo);
    await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
    await criarCartaoManual(repo, { frente: 'c', verso: 'd' });
    const r = await escolherProximaAcao(repo, '2099-01-01');
    expect(r).toMatchObject({
      tipo: 'acao',
      acao: {
        tipo: 'revisao_vencida',
        alvo: { tipo: 'revisao' },
        razao: '2 cartões vencidos',
        estimativaMin: 1,
      },
    });
  });

  it('cartão que só vence depois de hoje não conta', async () => {
    const { repo } = await repositorioDeTeste();
    await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
    const r = await escolherProximaAcao(repo, '2000-01-01');
    expect(r.tipo).toBe('vazio');
  });

  it('sem revisão: a norma lida por último, com onde continuar e quanto falta', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await lerLep(repo);
    const r = await escolherProximaAcao(repo, hoje(repo));
    expect(r).toMatchObject({
      tipo: 'acao',
      acao: {
        tipo: 'leitura_salva',
        alvo: { tipo: 'leitura', id: norma.id, rotulo: 'LEP' },
      },
    });
    if (r.tipo !== 'acao') throw new Error('esperava ação');
    expect(r.acao.razao).toMatch(/^Continuar a leitura no Art\. 1º da LEP$/);
    expect(r.acao.estimativaMin).toBeGreaterThanOrEqual(1);
  });

  it('"Escolher outra coisa": dispensar um tipo passa ao seguinte e, no fim, ao vazio', async () => {
    const { repo } = await repositorioDeTeste();
    await lerLep(repo);
    await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
    const dia = '2099-01-01';
    const sem1 = await escolherProximaAcao(repo, dia, { excluir: ['revisao_vencida'] });
    expect(sem1).toMatchObject({ tipo: 'acao', acao: { tipo: 'leitura_salva' } });
    const sem2 = await escolherProximaAcao(repo, dia, {
      excluir: ['revisao_vencida', 'leitura_salva'],
    });
    expect(sem2.tipo).toBe('vazio');
  });

  it('não grava nada', async () => {
    const { repo } = await repositorioDeTeste();
    await lerLep(repo);
    const antes = await repo.colecao('sessoes').contar();
    await escolherProximaAcao(repo, hoje(repo));
    expect(await repo.colecao('sessoes').contar()).toBe(antes);
  });
});

describe('Próxima ação com Ciclo ativo', () => {
  it('mostra o bloco atual com a matéria; avança quando a Sessão do bloco é encerrada', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const penal = await repo.colecao('disciplinas').criar({ nome: 'Penal' });
    const civil = await repo.colecao('disciplinas').criar({ nome: 'Civil' });
    const ciclo = await criarCiclo(repo, {
      nome: 'C',
      modelo: 'manual',
      pesos: [
        { disciplinaId: penal.id, peso: 1 },
        { disciplinaId: civil.id, peso: 1 },
      ],
    });
    const dia = hoje(repo);
    const primeiro = await escolherProximaAcao(repo, dia);
    expect(primeiro).toMatchObject({
      tipo: 'acao',
      acao: { tipo: 'ciclo', alvo: { id: ciclo.id, rotulo: 'Penal' }, blocoOrdem: 0 },
    });
    await repo.colecao('sessoes').criar({
      tipo: 'estudo',
      data: dia,
      inicio: relogio.agora.toISOString(),
      fim: relogio.agora.toISOString(),
      estado: 'encerrada',
      pausas: [],
      cicloId: ciclo.id,
      blocoOrdem: 0,
    });
    expect(await escolherProximaAcao(repo, dia)).toMatchObject({
      acao: { tipo: 'ciclo', alvo: { rotulo: 'Civil' }, blocoOrdem: 1 },
    });
  });
});
