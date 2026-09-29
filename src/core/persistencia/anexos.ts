// Anexo (arquivo): o registro em `anexos` e os bytes em `anexosConteudo` (fora do registro, para
// não pesar nas listagens). Primeiro uso: a fonte sanitizada da versão de norma (F2, 9.2).
import type { Anexo, OrigemRegistro } from '../modelo';
import { sha256 } from '../util/sha256';
import type { Repositorio } from './repositorio';

/** Conteúdo pronto para gravar, com o hash já calculado (fora da transação). */
export interface ConteudoDeAnexo {
  nomeArquivo: string;
  tipoMime: string;
  bytes: Uint8Array;
  hash: string;
}

/** O hash é calculado aqui, antes: WebCrypto aguardado dentro de `repo.transacao` a fecha. */
export async function prepararAnexo(
  nomeArquivo: string,
  tipoMime: string,
  bytes: Uint8Array,
): Promise<ConteudoDeAnexo> {
  return { nomeArquivo, tipoMime, bytes, hash: await sha256(bytes) };
}

/** Registro e bytes juntos; dentro da transação do chamador, entram (ou falham) com ela. */
export function gravarAnexo(
  repo: Repositorio,
  conteudo: ConteudoDeAnexo,
  opcoes: { id?: string; origem?: OrigemRegistro } = {},
): Promise<Anexo> {
  return repo.transacao(async () => {
    const anexo = await repo.colecao('anexos').criar(
      {
        nomeArquivo: conteudo.nomeArquivo,
        tipoMime: conteudo.tipoMime,
        tamanho: conteudo.bytes.length,
        hash: conteudo.hash,
      },
      opcoes,
    );
    await repo.db.anexosConteudo.add({ id: anexo.id, bytes: conteudo.bytes });
    return anexo;
  });
}

export class AnexoAlterado extends Error {
  constructor(readonly anexoId: string) {
    super(`O conteúdo do anexo ${anexoId} não confere com o hash registrado.`);
    this.name = 'AnexoAlterado';
  }
}

/**
 * Registro e bytes de um anexo do usuário atual, com o hash conferido (conteúdo diferente lança
 * `AnexoAlterado`); ausente se o registro ou os bytes não existem. Assíncrono (WebCrypto): fora
 * de `repo.transacao`.
 */
export async function lerAnexo(
  repo: Repositorio,
  id: string,
): Promise<{ anexo: Anexo; bytes: Uint8Array } | undefined> {
  const anexo = await repo.colecao('anexos').obter(id);
  const conteudo = anexo && (await repo.db.anexosConteudo.get(id));
  if (!anexo || !conteudo) return undefined;
  if ((await sha256(conteudo.bytes)) !== anexo.hash) throw new AnexoAlterado(id);
  return { anexo, bytes: conteudo.bytes };
}

/** Apaga registro e bytes (físico): só anexo que nada mais referencia (rascunho descartado). */
export function removerAnexos(repo: Repositorio, ids: readonly string[]): Promise<number> {
  return repo.transacao(async () => {
    const removidos = await repo.colecao('anexos').removerFisico(ids);
    await repo.db.anexosConteudo.bulkDelete([...ids]);
    return removidos;
  });
}
