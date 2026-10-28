import { registrarErro } from '../../dominios/recall/servico';
import { estacionar, resolverNota } from '../../dominios/sessao/estacionamento';
import { encerrarSessao, iniciarSessao } from '../../dominios/sessao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { errosDaSessao, linhasDoResumo } from './resumo-da-sessao';

const MIN = 60_000;

describe('linhasDoResumo', () => {
  it('sem nada além do tempo, só a linha do tempo (e "Menos de 1 min" até 29 s)', () => {
    expect(linhasDoResumo({ duracaoSegundos: 0 }, 0)).toEqual(['Menos de 1 min']);
    expect(linhasDoResumo({ duracaoSegundos: 29 }, 0)).toEqual(['Menos de 1 min']);
    expect(linhasDoResumo({ duracaoSegundos: 30 }, 0)).toEqual(['1 min']);
    expect(linhasDoResumo({ duracaoSegundos: 4500 }, 0)).toEqual(['75 min']);
  });

  it('a atividade vem depois do tempo; sem tempo, só a atividade', () => {
    expect(linhasDoResumo({ duracaoSegundos: 2220, atividade: 'questoes' }, 0)).toEqual([
      '37 min · Questões',
    ]);
    expect(linhasDoResumo({ atividade: 'lei' }, 0)).toEqual(['Ler a lei']);
    expect(linhasDoResumo({}, 0)).toEqual([]);
  });

  it('questões: "de" concorda com a questão (certa ou certas) e zero acertos aparece', () => {
    expect(linhasDoResumo({ questoesFeitas: 1, questoesAcertadas: 1 }, 0)).toEqual([
      '1 de 1 questão certa',
    ]);
    expect(linhasDoResumo({ questoesFeitas: 1 }, 0)).toEqual(['0 de 1 questão certa']);
    expect(linhasDoResumo({ questoesFeitas: 3, questoesAcertadas: 0 }, 0)).toEqual([
      '0 de 3 questões certas',
    ]);
    expect(linhasDoResumo({ questoesFeitas: 0, questoesAcertadas: 0 }, 0)).toEqual([]);
  });

  it('erros: o verbo concorda (entra ou entram) e zero não aparece', () => {
    expect(linhasDoResumo({}, 1)).toEqual(['1 erro guardado: entra nas suas revisões']);
    expect(linhasDoResumo({}, 3)).toEqual(['3 erros guardados: entram nas suas revisões']);
    expect(linhasDoResumo({}, 0)).toEqual([]);
  });

  it('anotações: só as que seguem por resolver entram na conta', () => {
    const em = '2026-09-23T12:00:00.000Z';
    const notas = [
      { texto: 'a', em, resolvidaEm: em },
      { texto: 'b', em, resolvidaEm: em },
      { texto: 'c', em },
    ];
    expect(linhasDoResumo({ estacionamento: notas }, 0)).toEqual([
      '1 anotação guardada para depois',
    ]);
    expect(linhasDoResumo({ estacionamento: notas.slice(0, 2) }, 0)).toEqual([]);
    expect(linhasDoResumo({ estacionamento: [...notas, { texto: 'd', em }] }, 0)).toEqual([
      '2 anotações guardadas para depois',
    ]);
  });
});

describe('errosDaSessao', () => {
  it('conta os Erros criados entre o começo e o fim da Sessão, com ou sem `sessaoId`', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await registrarErro(repo, { fraseCorreta: 'Antes da Sessão.' });
    relogio.avancar(MIN);
    const s = await iniciarSessao(repo, { atividade: 'questoes' });
    relogio.avancar(MIN);
    await registrarErro(repo, { fraseCorreta: 'Pelo Errei.', sessaoId: s.id });
    relogio.avancar(MIN);
    await registrarErro(repo, { fraseCorreta: 'Pelo registro comum.' });
    relogio.avancar(MIN);
    const fechada = await encerrarSessao(repo, s.id);
    relogio.avancar(MIN);
    await registrarErro(repo, { fraseCorreta: 'Depois da Sessão.' });
    expect(await errosDaSessao(repo, fechada)).toBe(2);
  });

  it('sem Erro na Sessão, zero; a Sessão sem fim conta até o último Erro', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    expect(await errosDaSessao(repo, s)).toBe(0);
    relogio.avancar(MIN);
    await registrarErro(repo, { fraseCorreta: 'Com a Sessão aberta.' });
    expect(await errosDaSessao(repo, s)).toBe(1);
  });

  it('não conta o Erro excluído', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    relogio.avancar(MIN);
    const e = await registrarErro(repo, { fraseCorreta: 'Vai ser excluído.' });
    await registrarErro(repo, { fraseCorreta: 'Fica.' });
    await repo.colecao('erros').excluir(e.id);
    const fechada = await encerrarSessao(repo, s.id);
    expect(await errosDaSessao(repo, fechada)).toBe(1);
  });
});

describe('o resumo de uma Sessão de verdade', () => {
  it('anotação resolvida ao fechar sai da conta (o que o Para lembrar mostra)', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    await estacionar(repo, s.id, 'ligar para o cartório');
    await estacionar(repo, s.id, 'comprar café');
    await estacionar(repo, s.id, 'pedir a certidão');
    await resolverNota(repo, s.id, 0, true);
    await resolverNota(repo, s.id, 1, true);
    relogio.avancar(25 * MIN);
    const fechada = await encerrarSessao(repo, s.id);
    expect(linhasDoResumo(fechada, 0)).toEqual(['25 min', '1 anotação guardada para depois']);
  });
});
