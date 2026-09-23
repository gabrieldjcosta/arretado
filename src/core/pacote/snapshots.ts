// Snapshot automático e rollback de um clique (atividade 3.8; Parte 2 §12.4).
import type { LogDeImportacao, Snapshot } from '../modelo';
import { VERSAO_ESQUEMA, type Repositorio } from '../persistencia';
import { obterPreferencias } from '../preferencias';
import { sha256 } from './bytes';
import { exportarPacote } from './exportar';
import { aplicar, planejar, ImportacaoInvalida, type ResultadoImportacao } from './importar';
import { lerPacote } from './ler';

/** Guarda um pacote integral (com anexos) do estado atual. */
export async function criarSnapshot(
  repo: Repositorio,
  motivo: Snapshot['motivo'],
): Promise<Snapshot> {
  const { bytes } = await exportarPacote(repo, { incluirAnexos: true });
  const id = repo.ctx.novoId();
  // Nada além de IndexedDB pode ser aguardado dentro da transação (senão ela fecha antes).
  const hash = await sha256(bytes);
  return repo.transacao(async () => {
    await repo.db.snapshotsConteudo.add({ id, bytes });
    return repo
      .colecao('snapshots')
      .criar(
        { motivo, tamanho: bytes.length, hash, versaoEsquema: VERSAO_ESQUEMA },
        { id, origem: 'sistema' },
      );
  });
}

/** Mantém só os N mais recentes (Preferências › retenção, mínimo 5). */
export async function podarSnapshots(repo: Repositorio): Promise<number> {
  const { retencaoSnapshots } = await obterPreferencias(repo);
  const todos = (await repo.colecao('snapshots').todosDoUsuario()).sort((a, b) =>
    a.tsLogico < b.tsLogico ? 1 : -1,
  );
  const excedentes = todos.slice(Math.max(5, retencaoSnapshots)).map((s) => s.id);
  if (excedentes.length === 0) return 0;
  await repo.transacao(async () => {
    await repo.colecao('snapshots').removerFisico(excedentes);
    await repo.db.snapshotsConteudo.bulkDelete(excedentes);
  });
  return excedentes.length;
}

/** Restaura o estado guardado num snapshot (antes, guarda o atual, para poder voltar). */
export async function restaurarSnapshot(
  repo: Repositorio,
  snapshotId: string,
): Promise<ResultadoImportacao> {
  const conteudo = await repo.db.snapshotsConteudo.get(snapshotId);
  if (!conteudo || !(await repo.colecao('snapshots').obter(snapshotId))) {
    throw new ImportacaoInvalida('Este ponto de restauração não existe mais.');
  }
  const pacote = await lerPacote(conteudo.bytes);
  await criarSnapshot(repo, 'rollback');
  const previa = await planejar(repo, pacote, { modo: 6 });
  return aplicar(repo, pacote, previa, new Map(), {
    snapshot: false,
    descricao: 'Desfazer importação',
  });
}

/** Rollback de um clique de uma importação concluída. */
export async function desfazerImportacao(
  repo: Repositorio,
  logId: string,
): Promise<ResultadoImportacao> {
  const log: LogDeImportacao | undefined = await repo.colecao('logsImportacao').obter(logId);
  if (!log?.snapshotId || log.resultado !== 'concluida') {
    throw new ImportacaoInvalida('Esta importação não pode ser desfeita.');
  }
  const resultado = await restaurarSnapshot(repo, log.snapshotId);
  await resultado.repo.colecao('logsImportacao').atualizar(logId, { resultado: 'desfeita' });
  return resultado;
}
