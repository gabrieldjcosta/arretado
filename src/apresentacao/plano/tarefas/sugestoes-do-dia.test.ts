import { criarDisciplina, criarPonto } from '../../../dominios/pontos';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { sugestoesDoDia } from './sugestoes-do-dia';

async function cenario() {
  const { repo } = await repositorioDeTeste({ inicio: '2026-10-18T12:00:00.000Z' });
  const d = await criarDisciplina(repo, 'Execução Penal');
  const p = await criarPonto(repo, d.id, 'Regime aberto');
  const sessao = (data: string) =>
    repo.colecao('sessoes').criar({
      tipo: 'estudo',
      estado: 'encerrada',
      data,
      inicio: `${data}T10:00:00.000Z`,
      pausas: [],
      pontoId: p.id,
    });
  return { repo, sessao };
}

describe('sugestões do dia: Sessões excluídas não contam', () => {
  it('Sessão antiga viva gera "esquecida" mesmo com uma recente excluída', async () => {
    const { repo, sessao } = await cenario();
    await sessao('2026-09-20');
    const recente = await sessao('2026-10-17');
    await repo.colecao('sessoes').excluir(recente.id);
    const sugestoes = await sugestoesDoDia(repo);
    expect(sugestoes.some((s) => s.regra === 'esquecida')).toBe(true);
  });

  it('Sessão antiga excluída não gera "esquecida"', async () => {
    const { repo, sessao } = await cenario();
    const antiga = await sessao('2026-09-20');
    await repo.colecao('sessoes').excluir(antiga.id);
    const sugestoes = await sugestoesDoDia(repo);
    expect(sugestoes.some((s) => s.regra === 'esquecida')).toBe(false);
  });
});
