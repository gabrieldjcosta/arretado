// Modo 7: importar para espaço separado e, depois, mesclar (Parte 2 §12.2, §12.5).
import type { Espaco, LogDeImportacao } from '../modelo';
import { apagarBanco, Repositorio } from '../persistencia';
import { exportarPacote } from './exportar';
import {
  aplicar,
  COLECOES_IDENTIDADE,
  ImportacaoInvalida,
  planejar,
  type Previa,
  type ResultadoImportacao,
} from './importar';
import { lerPacote, type PacoteLido } from './ler';

const PREFIXO = 'arretado-espaco-';

/** Cria um banco isolado com exatamente o conteúdo do pacote, sem tocar nos dados atuais. */
export async function importarParaEspaco(
  repo: Repositorio,
  pacote: PacoteLido,
  nome: string,
): Promise<{ espaco: Espaco; log: LogDeImportacao }> {
  const id = repo.ctx.novoId();
  const nomeBanco = `${PREFIXO}${id}`;
  const isolado = await Repositorio.abrir({ nomeBanco, agora: repo.ctx.agora });
  try {
    const previa = await planejar(isolado, pacote, { modo: 6 });
    await aplicar(isolado, pacote, previa, new Map(), { snapshot: false });
  } catch (e) {
    isolado.fechar();
    await apagarBanco(nomeBanco);
    throw e;
  }
  isolado.fechar();
  return repo.transacao(async () => {
    const espaco = await repo
      .colecao('espacos')
      .criar({ nome, nomeBanco, hashPacote: pacote.hashArquivo }, { id, origem: 'importacao' });
    const log = await repo.colecao('logsImportacao').criar(
      {
        em: repo.ctx.agora().toISOString(),
        modo: 7,
        hashPacote: pacote.hashArquivo,
        contagens: Object.fromEntries(
          [...pacote.registros].map(([c, r]) => [
            c,
            { criados: r.length, atualizados: 0, ignorados: 0, conflitos: 0, excluidos: 0 },
          ]),
        ),
        espacoId: id,
        resultado: 'concluida',
        descricao: nome,
      },
      { origem: 'sistema' },
    );
    return { espaco, log };
  });
}

async function abrirEspaco(repo: Repositorio, espacoId: string): Promise<Repositorio> {
  const espaco = await repo.colecao('espacos').obter(espacoId);
  if (!espaco) throw new ImportacaoInvalida('Este espaço não existe mais.');
  return Repositorio.abrir({ nomeBanco: espaco.nomeBanco, agora: repo.ctx.agora });
}

/**
 * Lê o espaço como um pacote do usuário atual (mesmos ids, dono trocado), sem a
 * identidade do espaço (usuário, aparelho e preferências dele ficam de fora).
 */
async function espacoComoPacote(repo: Repositorio, espacoId: string): Promise<PacoteLido> {
  const isolado = await abrirEspaco(repo, espacoId);
  try {
    const { bytes } = await exportarPacote(isolado, { incluirAnexos: true });
    const lido = await lerPacote(bytes);
    const registros = new Map(
      [...lido.registros].map(([c, lista]) => [
        c,
        lista.map((r) => ({ ...r, usuarioId: repo.ctx.usuarioId })),
      ]),
    );
    return {
      ...lido,
      manifesto: { ...lido.manifesto, usuarioId: repo.ctx.usuarioId },
      registros,
    };
  } finally {
    isolado.fechar();
  }
}

/** Prévia da mesclagem do espaço com os dados atuais (modo 4 por padrão). */
export async function planejarMesclagem(
  repo: Repositorio,
  espacoId: string,
  modo: 2 | 4 = 4,
): Promise<{ pacote: PacoteLido; previa: Previa }> {
  const pacote = await espacoComoPacote(repo, espacoId);
  const previa = await planejar(repo, pacote, { modo, ignorarColecoes: COLECOES_IDENTIDADE });
  return { pacote, previa };
}

export async function mesclarEspaco(
  repo: Repositorio,
  pacote: PacoteLido,
  previa: Previa,
  resolucoes?: ReadonlyMap<string, 'local' | 'pacote'>,
): Promise<ResultadoImportacao> {
  return aplicar(repo, pacote, previa, resolucoes, { descricao: 'Mesclar espaço separado' });
}

/** Apaga o banco do espaço e o registro dele. */
export async function removerEspaco(repo: Repositorio, espacoId: string): Promise<void> {
  const espaco = await repo.colecao('espacos').obter(espacoId);
  if (!espaco) return;
  await apagarBanco(espaco.nomeBanco);
  await repo.colecao('espacos').excluir(espacoId);
}
