import { unzipSync, zipSync } from "fflate";
import { VERSAO_APP, VERSAO_ESQUEMA } from "../esquema/versao";
import type { ContextoDeEscrita } from "../identidade/modelo";
import type { Alteracao } from "../log/modelo";
import { type BancoArretado, TABELAS_FORA_DO_PACOTE } from "../persistencia/db";
import type { EntidadeBase } from "../persistencia/modelo";
import { cifrar, decifrar, sha256 } from "./cifra";
import {
  type EscopoDoPacote,
  EsquemaCabecalhoCifrado,
  EsquemaManifesto,
  FORMATO_DO_PACOTE,
  type Manifesto,
  VERSAO_DO_FORMATO,
} from "./manifesto";

/**
 * Pacote `.arretado` (T6, §12.1): um ZIP com `manifesto.json`, um arquivo NDJSON por entidade e,
 * quando pedido, o log de alterações. Cada arquivo tem hash SHA-256 no manifesto, e o conjunto tem
 * o seu — é o que permite dizer, com certeza, que um arquivo alterado fora do app não é restaurável.
 *
 * Cifrado, o ZIP inteiro vira `payload.bin` dentro de outro ZIP, ao lado de um `cabecalho.json`
 * em claro com apenas o necessário para derivar a chave.
 */
export const EXTENSAO = ".arretado";

const MANIFESTO = "manifesto.json";
const CABECALHO = "cabecalho.json";
const CARGA = "payload.bin";

export class ErroDePacote extends Error {
  override name = "ErroDePacote";
}

export interface OpcoesDeExportacao {
  escopo?: EscopoDoPacote;
  /** Entidades a incluir; o padrão é todas as exportáveis. */
  entidades?: readonly string[];
  filtro?: Record<string, unknown> | null;
  incluirLog?: boolean;
  /** Senha da cifra opcional. Sem senha, o pacote sai em claro. */
  senha?: string | undefined;
}

export interface PacoteAberto {
  manifesto: Manifesto;
  /** Registros por entidade, já validados contra os hashes do manifesto. */
  dados: Map<string, EntidadeBase[]>;
  log: Alteracao[];
}

/** Entidades que este banco exporta, em ordem estável. */
export function entidadesExportaveis(db: BancoArretado): string[] {
  const fora = new Set<string>(TABELAS_FORA_DO_PACOTE);
  return db.nomesDeTabelas().filter((nome) => !fora.has(nome));
}

export async function exportar(
  db: BancoArretado,
  contexto: ContextoDeEscrita,
  opcoes: OpcoesDeExportacao = {},
): Promise<Uint8Array> {
  const entidades = opcoes.entidades ?? entidadesExportaveis(db);
  const arquivos: Record<string, Uint8Array> = {};
  const descricoes: Manifesto["arquivos"] = [];

  for (const entidade of entidades) {
    const registros = await db.table(entidade).toArray();
    const conteudo = paraNdjson(registros);
    const caminho = `entidades/${entidade}.ndjson`;
    arquivos[caminho] = conteudo;
    descricoes.push({
      caminho,
      entidade,
      registros: registros.length,
      hash: await sha256(conteudo),
    });
  }

  if (opcoes.incluirLog) {
    const log = await db.alteracoes.toArray();
    const conteudo = paraNdjson(log);
    const caminho = "log/alteracoes.ndjson";
    arquivos[caminho] = conteudo;
    descricoes.push({
      caminho,
      entidade: "alteracoes",
      registros: log.length,
      hash: await sha256(conteudo),
    });
  }

  const manifesto: Manifesto = {
    formato: FORMATO_DO_PACOTE,
    versaoDoFormato: VERSAO_DO_FORMATO,
    versaoDoEsquema: VERSAO_ESQUEMA,
    versaoDoApp: VERSAO_APP,
    geradoEm: new Date().toISOString(),
    usuarioId: contexto.usuarioId,
    aparelhoId: contexto.aparelhoId,
    escopo: opcoes.escopo ?? "integral",
    filtro: opcoes.filtro ?? null,
    arquivos: descricoes,
    hashDoConjunto: await sha256(descricoes.map((a) => a.hash).join("")),
    incluiLog: Boolean(opcoes.incluirLog),
    incluiAnexos: false,
    cifrado: Boolean(opcoes.senha),
  };

  arquivos[MANIFESTO] = texto(JSON.stringify(manifesto, null, 2));
  const zip = zipSync(arquivos, { level: 6 });
  if (!opcoes.senha) return zip;

  const { cabecalho, dados } = await cifrar(zip, opcoes.senha);
  return zipSync({
    [CABECALHO]: texto(
      JSON.stringify({
        formato: FORMATO_DO_PACOTE,
        versaoDoFormato: VERSAO_DO_FORMATO,
        versaoDoEsquema: VERSAO_ESQUEMA,
        cifrado: true,
        ...cabecalho,
      }),
    ),
    [CARGA]: dados,
  });
}

/**
 * Abre e **valida** um pacote: formato, versão do esquema, hash de cada arquivo e hash do conjunto.
 * Qualquer divergência falha aqui, antes de qualquer escrita, com mensagem que diz o que houve.
 */
export async function abrir(arquivo: Uint8Array, senha?: string): Promise<PacoteAberto> {
  let conteudo: Record<string, Uint8Array>;
  try {
    conteudo = unzipSync(arquivo);
  } catch {
    throw new ErroDePacote("Este arquivo não é um pacote do Arretado.");
  }

  if (conteudo[CARGA] && conteudo[CABECALHO]) {
    if (!senha) throw new ErroDePacote("Este pacote está cifrado: informe a senha para abrir.");
    const cabecalho = EsquemaCabecalhoCifrado.safeParse(JSON.parse(deTexto(conteudo[CABECALHO])));
    if (!cabecalho.success) throw new ErroDePacote("O cabeçalho do pacote cifrado é inválido.");
    exigirVersaoCompativel(cabecalho.data.versaoDoEsquema);
    const aberto = await decifrar(conteudo[CARGA], senha, cabecalho.data);
    return abrir(aberto);
  }

  const bruto = conteudo[MANIFESTO];
  if (!bruto) throw new ErroDePacote("Pacote sem manifesto: não é possível validar o conteúdo.");

  const analise = EsquemaManifesto.safeParse(JSON.parse(deTexto(bruto)));
  if (!analise.success) throw new ErroDePacote("O manifesto do pacote é inválido ou foi alterado.");
  const manifesto = analise.data;
  exigirVersaoCompativel(manifesto.versaoDoEsquema);

  const dados = new Map<string, EntidadeBase[]>();
  let log: Alteracao[] = [];

  for (const descricao of manifesto.arquivos) {
    const arquivoDoPacote = conteudo[descricao.caminho];
    if (!arquivoDoPacote) {
      throw new ErroDePacote(
        `O pacote diz conter "${descricao.caminho}", mas o arquivo não está lá.`,
      );
    }
    if ((await sha256(arquivoDoPacote)) !== descricao.hash) {
      throw new ErroDePacote(
        `"${descricao.caminho}" não confere com o manifesto: o arquivo foi alterado fora do aplicativo.`,
      );
    }
    const registros = deNdjson(arquivoDoPacote);
    if (registros.length !== descricao.registros) {
      throw new ErroDePacote(
        `"${descricao.caminho}" tem ${registros.length} registros e o manifesto diz ${descricao.registros}.`,
      );
    }
    if (descricao.caminho.startsWith("log/")) log = registros as Alteracao[];
    else dados.set(descricao.entidade, registros as EntidadeBase[]);
  }

  const hashDoConjunto = await sha256(manifesto.arquivos.map((a) => a.hash).join(""));
  if (hashDoConjunto !== manifesto.hashDoConjunto) {
    throw new ErroDePacote("O conjunto de arquivos não confere com o manifesto.");
  }

  return { manifesto, dados, log };
}

/** Pacote de versão posterior é recusado com mensagem clara, nunca migrado para trás (§7.2). */
function exigirVersaoCompativel(versaoDoPacote: number): void {
  if (versaoDoPacote > VERSAO_ESQUEMA) {
    throw new ErroDePacote(
      `Este pacote foi criado por uma versão mais nova do Arretado (esquema ${versaoDoPacote}; este aparelho usa ${VERSAO_ESQUEMA}). Atualize o aplicativo para restaurá-lo.`,
    );
  }
}

/** NDJSON: um registro por linha — streamável, diffável e com hash estável (T6). */
function paraNdjson(registros: readonly unknown[]): Uint8Array {
  return texto(registros.map((r) => JSON.stringify(r)).join("\n"));
}

function deNdjson(dados: Uint8Array): unknown[] {
  const conteudo = deTexto(dados).trim();
  if (!conteudo) return [];
  return conteudo.split("\n").map((linha, indice) => {
    try {
      return JSON.parse(linha);
    } catch {
      throw new ErroDePacote(
        `Linha ${indice + 1} de um arquivo do pacote não é um registro válido.`,
      );
    }
  });
}

const texto = (valor: string): Uint8Array => new TextEncoder().encode(valor);
const deTexto = (valor: Uint8Array): string => new TextDecoder().decode(valor);
