import { repositorioDeTeste } from '../../testes/repositorio';
import {
  adiarTarefa,
  carregarFila,
  concluirTarefa,
  criarTarefa,
  dividirTarefa,
  moverTarefa,
  pularTarefa,
  reabrirTarefa,
  sugerirTarefas,
  TarefaInvalida,
  type EntradaDeSugestoes,
} from './index';

const HOJE = '2026-10-14';

describe('fila de tarefas', () => {
  it('cria, conclui, reabre; título vazio é recusado', async () => {
    const { repo } = await repositorioDeTeste();
    await expect(criarTarefa(repo, { titulo: '  ' })).rejects.toBeInstanceOf(TarefaInvalida);
    const a = await criarTarefa(repo, { titulo: ' Ler arts. 10 a 13 ', estimativaMin: 20 });
    expect(a).toMatchObject({ titulo: 'Ler arts. 10 a 13', estado: 'aberta', autoria: 'manual' });
    const feita = await concluirTarefa(repo, a.id);
    expect(feita.estado).toBe('feita');
    expect(feita.concluidaEm).toBeDefined();
    let f = await carregarFila(repo, HOJE);
    expect(f.fila).toHaveLength(0);
    expect(f.feitas).toHaveLength(1);
    const volta = await reabrirTarefa(repo, a.id);
    expect(volta.concluidaEm).toBeUndefined();
    f = await carregarFila(repo, HOJE);
    expect(f.fila.map((t) => t.id)).toEqual([a.id]);
  });

  it('adiar esconde até a data e depois volta sozinha, sem atraso; pular vai ao fim; mover troca', async () => {
    const { repo } = await repositorioDeTeste();
    const a = await criarTarefa(repo, { titulo: 'A' });
    const b = await criarTarefa(repo, { titulo: 'B' });
    const c = await criarTarefa(repo, { titulo: 'C' });
    await adiarTarefa(repo, a.id, '2026-10-20');
    let f = await carregarFila(repo, HOJE);
    expect(f.fila.map((t) => t.titulo)).toEqual(['B', 'C']);
    expect(f.adiadas.map((t) => t.titulo)).toEqual(['A']);
    f = await carregarFila(repo, '2026-10-20');
    expect(f.fila.map((t) => t.titulo)).toEqual(['A', 'B', 'C']);

    await pularTarefa(repo, b.id);
    f = await carregarFila(repo, '2026-10-20');
    expect(f.fila.map((t) => t.titulo)).toEqual(['A', 'C', 'B']);
    await moverTarefa(repo, c.id, 'cima', '2026-10-20');
    f = await carregarFila(repo, '2026-10-20');
    expect(f.fila.map((t) => t.titulo)).toEqual(['C', 'A', 'B']);
    await moverTarefa(repo, c.id, 'cima', '2026-10-20'); // já é a primeira: nada muda
    f = await carregarFila(repo, '2026-10-20');
    expect(f.fila[0]?.titulo).toBe('C');
  });

  it('dividir cria filhas no lugar da original, que sai da fila', async () => {
    const { repo } = await repositorioDeTeste();
    const a = await criarTarefa(repo, { titulo: 'Estudar execução penal' });
    const z = await criarTarefa(repo, { titulo: 'Z' });
    await expect(dividirTarefa(repo, a.id, ['só uma'])).rejects.toBeInstanceOf(TarefaInvalida);
    const filhas = await dividirTarefa(repo, a.id, ['Ler arts. 1 a 5', '', 'Ler arts. 6 a 10']);
    expect(filhas.map((t) => t.paiId)).toEqual([a.id, a.id]);
    const f = await carregarFila(repo, HOJE);
    expect(f.fila.map((t) => t.titulo)).toEqual(['Ler arts. 1 a 5', 'Ler arts. 6 a 10', 'Z']);
    expect(f.fila.at(-1)?.id).toBe(z.id);
  });
});

const COMUNS = {
  usuarioId: 'u',
  criadoEm: 'x',
  atualizadoEm: 'x',
  tsLogico: '1',
  origem: 'manual' as const,
  excluidoEm: null,
};

function entrada(parcial: Partial<EntradaDeSugestoes> = {}): EntradaDeSugestoes {
  return {
    hoje: HOJE,
    disciplinas: [{ ...COMUNS, id: 'd1', nome: 'Penal', ordem: 1 }],
    pontos: [
      {
        ...COMUNS,
        id: 'p1',
        titulo: 'Tipicidade',
        disciplinaId: 'd1',
        faixa: 'altissima',
        prioridade: 1,
      },
      {
        ...COMUNS,
        id: 'p2',
        titulo: 'Culpabilidade',
        disciplinaId: 'd1',
        faixa: 'extra',
        prioridade: 2,
      },
    ],
    atividade: new Map(),
    ultimaSessaoPorMateria: new Map(),
    tarefas: [],
    ...parcial,
  };
}

describe('sugestões determinísticas', () => {
  it('prioridade: faixa alta sem sessão, com o porquê', () => {
    const s = sugerirTarefas(entrada());
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({
      regra: 'prioridade',
      titulo: 'Começar Tipicidade',
      pontoId: 'p1',
    });
    expect(s[0]?.razao).toMatch(/altíssima/);
  });

  it('ordem das regras: revisão vencida, erro recorrente, prioridade, matéria esquecida', () => {
    const atividade = new Map([
      ['p2', { sessoesEncerradas: 1, errosAbertos: 2, cartoesVencidos: 0 }],
      ['p1', { sessoesEncerradas: 0, errosAbertos: 0, cartoesVencidos: 3 }],
    ]);
    const s = sugerirTarefas(
      entrada({ atividade, ultimaSessaoPorMateria: new Map([['d1', '2026-09-01']]) }),
    );
    expect(s.map((x) => x.regra)).toEqual([
      'revisao_vencida',
      'erro_recorrente',
      'prioridade',
      'esquecida',
    ]);
    expect(s[0]?.razao).toBe('3 cartões vencidos neste ponto.');
    expect(s[3]?.razao).toMatch(/Faz 43 dias/);
  });

  it('não repete tarefa já na fila nem sugere ponto adiado', () => {
    const base = entrada();
    const ja = sugerirTarefas({
      ...base,
      tarefas: [
        {
          ...COMUNS,
          id: 't',
          titulo: 'Começar Tipicidade',
          pontoId: 'p1',
          estado: 'aberta',
          ordem: 1,
          autoria: 'sugerida',
        },
      ],
    });
    expect(ja).toHaveLength(0);
    const adiado = sugerirTarefas({
      ...base,
      pontos: base.pontos.map((p) => (p.id === 'p1' ? { ...p, adiadoAte: '2026-12-01' } : p)),
    });
    expect(adiado).toHaveLength(0);
  });
});
