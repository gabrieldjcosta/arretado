import { repositorioDeTeste } from '../../testes/repositorio';
import {
  adiarPonto,
  atividadePorPonto,
  criarDisciplina,
  criarPonto,
  descreverAtividade,
  EdicaoInvalida,
  editarPonto,
  excluirDisciplina,
  mudarFaixa,
  retomarPonto,
  SEM_ATIVIDADE,
  statusDoPonto,
} from './index';

const HOJE = '2026-10-14';

describe('status derivado do ponto', () => {
  it('segue as regras, e adiado só vale antes da data', () => {
    const a = { ...SEM_ATIVIDADE };
    expect(statusDoPonto({}, a, HOJE)).toBe('nao_iniciado');
    expect(statusDoPonto({}, { ...a, erros: 1, errosAbertos: 1 }, HOJE)).toBe('em_andamento');
    expect(statusDoPonto({}, { ...a, sessoes: 1 }, HOJE)).toBe('em_andamento');
    const feita = { ...a, sessoes: 1, sessoesEncerradas: 1 };
    expect(statusDoPonto({}, feita, HOJE)).toBe('primeira_passada');
    expect(statusDoPonto({}, { ...feita, cartoes: 2, cartoesVencidos: 1 }, HOJE)).toBe(
      'precisa_revisar',
    );
    expect(statusDoPonto({}, { ...feita, erros: 1, errosAbertos: 1 }, HOJE)).toBe(
      'precisa_revisar',
    );
    // Erro aberto sem Sessão encerrada não promove a "precisa revisar".
    expect(statusDoPonto({}, { ...a, erros: 1, errosAbertos: 1 }, HOJE)).toBe('em_andamento');
    expect(statusDoPonto({ adiadoAte: '2026-10-20' }, feita, HOJE)).toBe('adiado');
    expect(statusDoPonto({ adiadoAte: HOJE }, feita, HOJE)).toBe('primeira_passada');
  });

  it('a atividade só conta o que aconteceu, sem alegar domínio', () => {
    expect(descreverAtividade(SEM_ATIVIDADE)).toBe('Nada registrado ainda');
    const texto = descreverAtividade({
      ...SEM_ATIVIDADE,
      sessoesEncerradas: 2,
      erros: 1,
      cartoes: 3,
    });
    expect(texto).toBe('2 sessões, 1 erro, 3 cartões');
    expect(texto).not.toMatch(/domin|consolid|aprendi/i);
  });
});

describe('atividade por ponto', () => {
  it('conta Sessões, Erros, Cartões e Frases pelo pontoId', async () => {
    const { repo } = await repositorioDeTeste();
    const d = await criarDisciplina(repo, 'Execução Penal');
    const p = await criarPonto(repo, d.id, 'Progressão de regime');
    const base = { data: HOJE, inicio: '2026-10-14T10:00:00.000Z', pausas: [] };
    await repo
      .colecao('sessoes')
      .criar({ ...base, tipo: 'estudo', estado: 'encerrada', pontoId: p.id });
    await repo
      .colecao('sessoes')
      .criar({ ...base, tipo: 'estudo', estado: 'ativa', pontoId: p.id });
    await repo.colecao('sessoes').criar({ ...base, tipo: 'livre', estado: 'encerrada' });
    const mapa = await atividadePorPonto(repo, HOJE);
    expect(mapa.get(p.id)).toMatchObject({ sessoes: 2, sessoesEncerradas: 1 });
    expect(mapa.size).toBe(1);
  });
});

describe('edição de disciplinas e pontos', () => {
  it('cria, renomeia, edita (libera ponto importado) e exclui matéria com seus pontos', async () => {
    const { repo } = await repositorioDeTeste();
    const d = await criarDisciplina(repo, '  Direito   Penal ');
    expect(d.nome).toBe('Direito Penal');
    const p = await criarPonto(repo, d.id, 'Tipicidade', ' 1 ');
    expect(p).toMatchObject({ codigo: '1', disciplinaId: d.id });
    await repo.colecao('pontos').atualizar(p.id, { somenteLeitura: true });
    const editado = await editarPonto(repo, p.id, { titulo: 'Tipicidade e ilicitude', codigo: '' });
    expect(editado.titulo).toBe('Tipicidade e ilicitude');
    expect(editado.codigo).toBeUndefined();
    expect(editado.somenteLeitura).toBe(false);
    await expect(editarPonto(repo, p.id, { titulo: '   ' })).rejects.toBeInstanceOf(EdicaoInvalida);
    expect(await excluirDisciplina(repo, d.id)).toBe(1);
    const vivos = (await repo.colecao('pontos').todosDoUsuario()).filter(
      (x) => x.excluidoEm === null,
    );
    expect(vivos).toHaveLength(0);
  });

  it('faixa vai ao log com origem manual; adiar e retomar', async () => {
    const { repo } = await repositorioDeTeste();
    const d = await criarDisciplina(repo, 'Civil');
    const p = await criarPonto(repo, d.id, 'Prescrição');
    const com = await mudarFaixa(repo, p.id, 'alta', 'cai muito');
    expect(com.faixa).toBe('alta');
    expect(com.logPrioridade?.at(-1)).toMatchObject({
      origem: 'manual',
      antes: {},
      depois: { faixa: 'alta' },
      motivo: 'cai muito',
    });
    const sem = await mudarFaixa(repo, p.id, undefined);
    expect(sem.faixa).toBeUndefined();
    expect(sem.logPrioridade).toHaveLength(2);
    const igual = await mudarFaixa(repo, p.id, undefined);
    expect(igual.logPrioridade).toHaveLength(2);

    const adiado = await adiarPonto(repo, p.id, '2026-10-30', 'prova longe');
    expect(adiado).toMatchObject({ adiadoAte: '2026-10-30', motivoAdiamento: 'prova longe' });
    const volta = await retomarPonto(repo, p.id);
    expect(volta.adiadoAte).toBeUndefined();
    expect(volta.motivoAdiamento).toBeUndefined();
  });
});
