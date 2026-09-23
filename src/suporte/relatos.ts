// "!" Relatar problema (D23): descrição obrigatória, 1 por dia, fila local até a F4,
// nunca com dados de estudo (só tela, versão do app e aparelho).
import { dataCivil } from '../core/datas';
import type { RelatoDeProblema } from '../core/modelo';
import type { Repositorio } from '../core/persistencia';
import { VERSAO_APP } from '../core/versao';

export const LIMITE_DESCRICAO = 2_000;

export class RelatoRecusado extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'RelatoRecusado';
  }
}

async function relatoDoDia(repo: Repositorio, data: string): Promise<RelatoDeProblema | undefined> {
  const u = repo.ctx.usuarioId;
  const { itens } = await repo.colecao('relatos').listarPagina({
    indice: '[usuarioId+data]',
    de: [u, data],
    ate: [u, data],
    limite: 1,
  });
  return itens[0];
}

/** Pode relatar hoje? (1 relato por dia, contado no fuso do usuário). */
export async function podeRelatarHoje(repo: Repositorio): Promise<boolean> {
  return (await relatoDoDia(repo, dataCivil(repo.ctx.agora()))) === undefined;
}

export async function registrarRelato(
  repo: Repositorio,
  entrada: { descricao: string; tela: string },
): Promise<RelatoDeProblema> {
  const descricao = entrada.descricao.trim();
  if (descricao.length === 0) throw new RelatoRecusado('Descreva o problema em poucas palavras.');
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new RelatoRecusado(`Use no máximo ${String(LIMITE_DESCRICAO)} caracteres.`);
  }
  const data = dataCivil(repo.ctx.agora());
  return repo.transacao(async () => {
    if (await relatoDoDia(repo, data)) {
      throw new RelatoRecusado(
        'Você já relatou um problema hoje. Amanhã é possível relatar outro.',
      );
    }
    return repo.colecao('relatos').criar({
      data,
      descricao,
      // Só o caminho da tela, sem parâmetros (que poderiam identificar conteúdo de estudo).
      tela: entrada.tela.split(/[?#]/)[0]?.slice(0, 200) ?? '',
      versaoApp: VERSAO_APP,
      aparelhoId: repo.ctx.aparelhoId,
      status: 'aguardando_envio',
    });
  });
}

/** Relatos na fila local, mais recentes primeiro. */
export async function relatosAguardando(repo: Repositorio): Promise<RelatoDeProblema[]> {
  const u = repo.ctx.usuarioId;
  const { itens } = await repo.colecao('relatos').listarPagina({
    indice: '[usuarioId+data]',
    de: [u, ''],
    ate: [u, '9999-12-31'],
    ordem: 'desc',
    limite: 50,
    filtro: (r) => r.status === 'aguardando_envio',
  });
  return itens;
}
