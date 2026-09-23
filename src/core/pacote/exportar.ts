// Exportação do pacote `.arretado` (atividades 3.2 e 3.3).
import { zipSync, type Zippable } from 'fflate';
import { dataCivil, horaCivil } from '../datas';
import { colecoesDoModulo, MODULOS, type Modulo, type NomeColecao } from '../modelo';
import { VERSAO_ESQUEMA, type Repositorio } from '../persistencia';
import { jsonCanonico } from '../util/json-canonico';
import { VERSAO_APP } from '../versao';
import { paraBytes, sha256 } from './bytes';
import { cifrar } from './cifra';
import {
  ARQUIVO_CIFRADO,
  ARQUIVO_LOG,
  ARQUIVO_MANIFESTO,
  EXTENSAO,
  FORMATO,
  PASTA_ANEXOS,
  PASTA_DADOS,
  VERSAO_FORMATO,
  type Escopo,
  type Manifesto,
  type ManifestoCifrado,
} from './formato';

export interface OpcoesExportacao {
  escopo?: Escopo;
  incluirLog?: boolean;
  incluirAnexos?: boolean;
  /** Com senha, o pacote sai cifrado (AES-256-GCM). */
  senha?: string;
  /** Só para testes; o padrão segue T8. */
  iteracoes?: number;
}

export interface PacoteGerado {
  bytes: Uint8Array;
  manifesto: Manifesto;
  nomeArquivo: string;
}

/** Lista JSON com um registro canônico por linha: estável e legível em editor de texto. */
export function serializarLista(itens: readonly unknown[]): Uint8Array {
  if (itens.length === 0) return paraBytes('[]\n');
  return paraBytes(`[\n${itens.map((i) => jsonCanonico(i)).join(',\n')}\n]\n`);
}

export async function hashDoConjunto(arquivos: Manifesto['arquivos']): Promise<string> {
  const linhas = Object.keys(arquivos)
    .sort()
    .map((c) => `${c}\t${arquivos[c]?.sha256 ?? ''}\n`)
    .join('');
  return sha256(paraBytes(linhas));
}

/** Registros do usuário numa coleção (inclusive excluídos logicamente), ordenados por id. */
async function registrosDe(repo: Repositorio, nome: NomeColecao) {
  const itens = await repo.db.tabela(nome).where('usuarioId').equals(repo.ctx.usuarioId).toArray();
  return itens.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export async function exportarPacote(
  repo: Repositorio,
  opcoes: OpcoesExportacao = {},
): Promise<PacoteGerado> {
  const escopo: Escopo = opcoes.escopo ?? { tipo: 'integral' };
  const modulos: Modulo[] = escopo.tipo === 'integral' ? [...MODULOS] : [...escopo.modulos];
  const conteudo: Record<string, Uint8Array> = {};
  const contagens: Record<string, number> = {};

  await repo.db.transaction('r', repo.db.tables, async () => {
    for (const modulo of modulos) {
      for (const nome of colecoesDoModulo(modulo)) {
        const registros = await registrosDe(repo, nome);
        contagens[nome] = registros.length;
        conteudo[`${PASTA_DADOS}${nome}.json`] = serializarLista(registros);
      }
    }
    if (opcoes.incluirLog) {
      const log = await repo.db.alteracoes.where('ts').above('').toArray();
      const doUsuario = log
        .filter((a) => a.usuarioId === repo.ctx.usuarioId)
        .map((a) => {
          const semSeq = { ...a };
          delete semSeq.seq;
          return semSeq;
        });
      conteudo[ARQUIVO_LOG] = serializarLista(doUsuario);
    }
    if (opcoes.incluirAnexos && modulos.includes('sistema')) {
      const anexos = await registrosDe(repo, 'anexos');
      const binarios = await repo.db.anexosConteudo.bulkGet(anexos.map((a) => a.id));
      binarios.forEach((b) => {
        if (b) conteudo[`${PASTA_ANEXOS}${b.id}`] = b.bytes;
      });
    }
  });

  const arquivos: Manifesto['arquivos'] = {};
  for (const [caminho, bytes] of Object.entries(conteudo)) {
    arquivos[caminho] = { sha256: await sha256(bytes), bytes: bytes.length };
  }
  const agora = repo.ctx.agora();
  const manifesto: Manifesto = {
    formato: FORMATO,
    versaoFormato: VERSAO_FORMATO,
    versaoEsquema: VERSAO_ESQUEMA,
    versaoApp: VERSAO_APP,
    criadoEm: agora.toISOString(),
    usuarioId: repo.ctx.usuarioId,
    aparelhoId: repo.ctx.aparelhoId,
    escopo,
    modulos,
    incluiLog: opcoes.incluirLog === true,
    incluiAnexos: opcoes.incluirAnexos === true && modulos.includes('sistema'),
    contagens,
    arquivos,
    hashConjunto: await hashDoConjunto(arquivos),
  };

  const zipado: Zippable = { [ARQUIVO_MANIFESTO]: paraBytes(JSON.stringify(manifesto, null, 2)) };
  for (const [caminho, bytes] of Object.entries(conteudo)) zipado[caminho] = bytes;
  let bytes = zipSync(zipado, { level: 6 });

  if (opcoes.senha !== undefined) {
    const { cifra, conteudo: cifrado } = await cifrar(bytes, opcoes.senha, opcoes.iteracoes);
    const externo: ManifestoCifrado = { formato: FORMATO, versaoFormato: VERSAO_FORMATO, cifra };
    bytes = zipSync({
      [ARQUIVO_MANIFESTO]: paraBytes(JSON.stringify(externo, null, 2)),
      [ARQUIVO_CIFRADO]: [cifrado, { level: 0 }],
    });
  }

  const hora = horaCivil(agora).replace(':', '');
  return {
    bytes,
    manifesto,
    nomeArquivo: `arretado-${dataCivil(agora)}-${hora}${EXTENSAO}`,
  };
}
