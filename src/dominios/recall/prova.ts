// A data da prova objetiva do Concurso ativo (AP-03). Lê e grava só pelo Repositório; o agendador
// recebe a data pronta (`Prova`) e limita os intervalos. Sem Concurso ativo, sem Fase de prova ou
// com a prova já passada, devolve `undefined` e nada muda.
import type { DataCivil } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import type { Prova } from './agendamento';

const TITULO_DA_PROVA = 'Prova objetiva';

async function concursoAtivo(repo: Repositorio) {
  return (await repo.colecao('concursos').todosDoUsuario()).find(
    (c) => c.ativo === true && c.excluidoEm === null,
  );
}

async function faseDaProva(repo: Repositorio, concursoId: string) {
  const fases = await repo.colecao('fasesPrazos').todosDoUsuario();
  return fases.find(
    (f) => f.concursoId === concursoId && f.titulo === TITULO_DA_PROVA && f.excluidoEm === null,
  );
}

/** A data da prova objetiva que a pessoa informou, mesmo se já passou; `undefined` se não há. */
export async function dataDaProvaInformada(repo: Repositorio): Promise<DataCivil | undefined> {
  const concurso = await concursoAtivo(repo);
  if (!concurso) return undefined;
  return (await faseDaProva(repo, concurso.id))?.dataInicio;
}

/** A prova que ainda vem pela frente (depois de hoje), no formato do agendador. */
export async function provaPorVir(
  repo: Repositorio,
  hoje: DataCivil,
  pontoId?: string,
): Promise<Prova | undefined> {
  const data = await dataDaProvaInformada(repo);
  if (data === undefined || data <= hoje) return undefined;
  const faixa = pontoId ? (await repo.colecao('pontos').obter(pontoId))?.faixa : undefined;
  return { data, faixa };
}

/**
 * Grava (ou apaga, com `null`) a data da prova objetiva. Cria o Concurso ativo na primeira vez,
 * com o mínimo; nada é perguntado além da data.
 */
export async function definirDataDaProva(repo: Repositorio, data: DataCivil | null): Promise<void> {
  await repo.transacao(async () => {
    let concurso = await concursoAtivo(repo);
    if (!concurso) {
      if (data === null) return;
      concurso = await repo
        .colecao('concursos')
        .criar({ nome: 'Meu concurso', banca: 'a definir', ativo: true, status: 'ativo' });
    }
    const fase = await faseDaProva(repo, concurso.id);
    if (data === null) {
      if (fase) await repo.colecao('fasesPrazos').excluir(fase.id);
      return;
    }
    if (!fase) {
      await repo.colecao('fasesPrazos').criar({
        concursoId: concurso.id,
        titulo: TITULO_DA_PROVA,
        tipo: 'fase',
        dataInicio: data,
      });
    } else if (fase.dataInicio !== data) {
      await repo.colecao('fasesPrazos').atualizar(fase.id, {
        dataInicio: data,
        historicoDatas: [
          ...(fase.historicoDatas ?? []),
          {
            em: repo.ctx.agora().toISOString(),
            antes: { dataInicio: fase.dataInicio },
            depois: { dataInicio: data },
          },
        ],
      });
    }
  });
}
