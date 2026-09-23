import { z } from "zod";
import type { ContextoDeEscrita } from "../identidade/modelo";
import { novoId } from "../ids";
import type { Alteracao } from "../log/modelo";
import type { RelogioHibrido } from "../log/relogio";
import type { BancoArretado } from "../persistencia/db";
import { type EntidadeBase, EsquemaEntidadeBase } from "../persistencia/modelo";
import { sha256 } from "./cifra";
import type { Manifesto } from "./manifesto";
import { abrir, exportar, type PacoteAberto } from "./pacote";

/**
 * Importação por modo explícito, com prévia obrigatória, snapshot e rollback (D21, §12.2–12.4).
 * Nenhum modo escreve antes de a prévia ser calculada, e nenhum escreve sem snapshot — o único
 * defeito das ferramentas atuais que chega a destruir dados é justamente este (§2.2).
 */
export const ModoDeImportacao = z.enum([
  "simulacao",
  "adicionarNovos",
  "atualizarIdentificados",
  "mesclar",
  "substituirModulo",
  "restaurarIntegral",
  "espacoSeparado",
]);
export type ModoDeImportacao = z.infer<typeof ModoDeImportacao>;

/** Modos que não escrevem nada. */
export const MODOS_SEM_ESCRITA: ModoDeImportacao[] = ["simulacao"];

export interface ContagemPorEntidade {
  entidade: string;
  criar: number;
  atualizar: number;
  ignorar: number;
  conflito: number;
  excluir: number;
}

export interface Aviso {
  tipo: "versaoMigrada" | "outroUsuario" | "provavelDuplicata" | "cifrado" | "escopoParcial";
  mensagem: string;
}

/** Prévia obrigatória (§12.3): o que será criado, atualizado, ignorado, em conflito e excluído. */
export interface Previa {
  modo: ModoDeImportacao;
  manifesto: Manifesto;
  contagens: ContagemPorEntidade[];
  avisos: Aviso[];
  totalDeExclusoes: number;
  criaraSnapshot: boolean;
  /** Ids alterados dos dois lados: o usuário decide um a um (§12.2, modo 4). */
  conflitos: Array<{ entidade: string; id: string }>;
}

export interface ResultadoDaImportacao {
  previa: Previa;
  aplicado: boolean;
  snapshotId: string | null;
  logDeImportacaoId: string | null;
}

export interface OpcoesDeImportacao {
  modo: ModoDeImportacao;
  senha?: string | undefined;
  /** Para `substituirModulo`: quais entidades substituir. */
  entidades?: readonly string[];
  /** Resolução de conflitos no modo `mesclar`: id → qual lado manter. */
  resolucoes?: Record<string, "local" | "pacote">;
}

export class ErroDeImportacao extends Error {
  override name = "ErroDeImportacao";
}

/** Só calcula: nunca escreve. É o primeiro passo de todo modo (§12.2, modo 1). */
export async function preverImportacao(
  db: BancoArretado,
  contexto: ContextoDeEscrita,
  pacote: PacoteAberto,
  modo: ModoDeImportacao,
): Promise<Previa> {
  const contagens: ContagemPorEntidade[] = [];
  const conflitos: Previa["conflitos"] = [];
  const avisos: Aviso[] = [];

  if (pacote.manifesto.usuarioId !== contexto.usuarioId) {
    avisos.push({
      tipo: "outroUsuario",
      mensagem:
        modo === "espacoSeparado"
          ? "Este pacote é de outro usuário e será aberto num espaço separado."
          : "Este pacote é de outro usuário. Use o modo “importar para espaço separado”.",
    });
  }
  if (pacote.manifesto.escopo !== "integral" && modo === "restaurarIntegral") {
    avisos.push({
      tipo: "escopoParcial",
      mensagem: `Este pacote é parcial (escopo “${pacote.manifesto.escopo}”): restaurar integralmente apagaria o que não está nele.`,
    });
  }

  for (const [entidade, registros] of pacote.dados) {
    const contagem: ContagemPorEntidade = {
      entidade,
      criar: 0,
      atualizar: 0,
      ignorar: 0,
      conflito: 0,
      excluir: 0,
    };
    const tabela = db.table(entidade);
    const existentes = new Map<string, EntidadeBase>();
    for (const registro of (await tabela.toArray()) as EntidadeBase[]) {
      existentes.set(registro.id, registro);
    }

    if (modo === "substituirModulo" || modo === "restaurarIntegral") {
      contagem.excluir = existentes.size;
    }

    for (const registro of registros) {
      const atual = existentes.get(registro.id);
      if (modo === "espacoSeparado") {
        contagem.criar += 1;
        continue;
      }
      if (!atual) {
        if (modo === "atualizarIdentificados") contagem.ignorar += 1;
        else contagem.criar += 1;
        continue;
      }
      if (modo === "adicionarNovos") {
        contagem.ignorar += 1;
        continue;
      }
      if (iguais(atual, registro)) {
        contagem.ignorar += 1;
        continue;
      }
      if (modo === "mesclar" && divergiramDosDoisLados(atual, registro)) {
        contagem.conflito += 1;
        conflitos.push({ entidade, id: registro.id });
        continue;
      }
      contagem.atualizar += 1;
    }

    const duplicatas = await provaveisDuplicatas(existentes, registros);
    if (duplicatas > 0) {
      avisos.push({
        tipo: "provavelDuplicata",
        mensagem: `${duplicatas} registro(s) de ${entidade} têm o mesmo conteúdo com id diferente: provável duplicata. Nada será fundido automaticamente.`,
      });
    }
    contagens.push(contagem);
  }

  const totalDeExclusoes = contagens.reduce((soma, c) => soma + c.excluir, 0);
  return {
    modo,
    manifesto: pacote.manifesto,
    contagens,
    avisos,
    totalDeExclusoes,
    criaraSnapshot: !MODOS_SEM_ESCRITA.includes(modo),
    conflitos,
  };
}

/**
 * Importa de fato. Antes de qualquer escrita: valida o pacote, calcula a prévia e grava um
 * snapshot. A operação é idempotente — repetir o mesmo pacote no mesmo modo não muda nada.
 */
export async function importar(
  db: BancoArretado,
  contexto: ContextoDeEscrita,
  relogio: RelogioHibrido,
  arquivo: Uint8Array,
  opcoes: OpcoesDeImportacao,
): Promise<ResultadoDaImportacao> {
  const pacote = await abrir(arquivo, opcoes.senha);
  const previa = await preverImportacao(db, contexto, pacote, opcoes.modo);

  if (MODOS_SEM_ESCRITA.includes(opcoes.modo)) {
    return { previa, aplicado: false, snapshotId: null, logDeImportacaoId: null };
  }
  if (pacote.manifesto.usuarioId !== contexto.usuarioId && opcoes.modo !== "espacoSeparado") {
    throw new ErroDeImportacao(
      "Pacote de outro usuário só pode ser importado no modo “espaço separado”.",
    );
  }

  const snapshotId = await criarSnapshot(db, contexto);
  const hashDoPacote = await sha256(arquivo);
  const entidadesAlvo = opcoes.entidades ?? [...pacote.dados.keys()];
  const espaco = opcoes.modo === "espacoSeparado" ? novoId() : null;

  for (const [entidade, registros] of pacote.dados) {
    if (opcoes.modo === "substituirModulo" && !entidadesAlvo.includes(entidade)) continue;
    await aplicarEntidade(db, contexto, relogio, entidade, registros, opcoes, espaco);
  }

  const logDeImportacaoId = await registrarImportacao(db, contexto, {
    modo: opcoes.modo,
    hashDoPacote,
    snapshotId,
    previa,
    espaco,
  });

  return { previa, aplicado: true, snapshotId, logDeImportacaoId };
}

async function aplicarEntidade(
  db: BancoArretado,
  contexto: ContextoDeEscrita,
  relogio: RelogioHibrido,
  entidade: string,
  registros: EntidadeBase[],
  opcoes: OpcoesDeImportacao,
  espaco: string | null,
): Promise<void> {
  const tabela = db.table(entidade);
  await db.transaction("rw", tabela, db.alteracoes, async () => {
    if (opcoes.modo === "substituirModulo" || opcoes.modo === "restaurarIntegral") {
      await tabela.clear();
    }

    for (const registro of registros) {
      const analise = EsquemaEntidadeBase.safeParse(registro);
      if (!analise.success) {
        throw new ErroDeImportacao(
          `Um registro de ${entidade} não tem a forma esperada (id, usuarioId, carimbos).`,
        );
      }

      if (espaco) {
        // Espaço separado: ids preservados, mas isolados por um usuário sintético (§12.2, modo 7).
        await tabela.put({ ...registro, usuarioId: espaco, origem: `espaco:${espaco}` });
        continue;
      }

      const atual = (await tabela.get(registro.id)) as EntidadeBase | undefined;
      const decisao = decidir(opcoes, atual, registro);
      if (decisao === "ignorar") continue;
      await tabela.put(registro);
      await registrarAlteracao(
        db,
        contexto,
        relogio,
        entidade,
        registro,
        atual ? "atualizar" : "criar",
      );
    }
  });
}

type Decisao = "escrever" | "ignorar";

function decidir(
  opcoes: OpcoesDeImportacao,
  atual: EntidadeBase | undefined,
  doPacote: EntidadeBase,
): Decisao {
  switch (opcoes.modo) {
    case "adicionarNovos":
      return atual ? "ignorar" : "escrever";
    case "atualizarIdentificados":
      if (!atual) return "ignorar";
      return maisRecente(doPacote, atual) ? "escrever" : "ignorar";
    case "mesclar": {
      if (!atual) return "escrever";
      if (iguais(atual, doPacote)) return "ignorar";
      if (divergiramDosDoisLados(atual, doPacote)) {
        // Conflito: só escreve se o usuário escolheu o lado do pacote (§12.2, modo 4).
        return opcoes.resolucoes?.[doPacote.id] === "pacote" ? "escrever" : "ignorar";
      }
      return maisRecente(doPacote, atual) ? "escrever" : "ignorar";
    }
    case "substituirModulo":
    case "restaurarIntegral":
      return "escrever";
    default:
      return "ignorar";
  }
}

const maisRecente = (a: EntidadeBase, b: EntidadeBase) => a.atualizadoEm > b.atualizadoEm;

/** Idempotência: mesmo id e mesmo conteúdo não geram escrita nem entrada de log (§12.4). */
function iguais(a: EntidadeBase, b: EntidadeBase): boolean {
  return JSON.stringify(ordenado(a)) === JSON.stringify(ordenado(b));
}

/**
 * Conflito é divergência dos dois lados: o mesmo id com conteúdos diferentes e nenhum dos dois
 * podendo ser considerado continuação do outro (carimbos iguais ou o local mais novo).
 */
function divergiramDosDoisLados(local: EntidadeBase, doPacote: EntidadeBase): boolean {
  if (iguais(local, doPacote)) return false;
  return local.atualizadoEm >= doPacote.atualizadoEm;
}

function ordenado(registro: EntidadeBase): Record<string, unknown> {
  return Object.fromEntries(Object.entries(registro).sort(([a], [b]) => a.localeCompare(b)));
}

/** Mesmo conteúdo com id diferente é avisado, nunca fundido automaticamente (§12.4). */
async function provaveisDuplicatas(
  existentes: Map<string, EntidadeBase>,
  registros: readonly EntidadeBase[],
): Promise<number> {
  const conteudosLocais = new Map<string, string>();
  for (const [id, registro] of existentes) {
    conteudosLocais.set(await hashDeConteudo(registro), id);
  }
  let duplicatas = 0;
  for (const registro of registros) {
    const id = conteudosLocais.get(await hashDeConteudo(registro));
    if (id && id !== registro.id) duplicatas += 1;
  }
  return duplicatas;
}

/** Hash do conteúdo ignorando id e carimbos: é o que identifica "o mesmo registro com outro id". */
async function hashDeConteudo(registro: EntidadeBase): Promise<string> {
  const { id: _id, criadoEm: _criadoEm, atualizadoEm: _atualizadoEm, ...resto } = registro;
  return sha256(JSON.stringify(ordenado(resto as EntidadeBase)));
}

async function registrarAlteracao(
  db: BancoArretado,
  contexto: ContextoDeEscrita,
  relogio: RelogioHibrido,
  entidade: string,
  registro: EntidadeBase,
  operacao: Alteracao["operacao"],
): Promise<void> {
  await db.alteracoes.add({
    tsLogico: relogio.proximo(),
    usuarioId: contexto.usuarioId,
    aparelhoId: contexto.aparelhoId,
    entidade,
    entidadeId: registro.id,
    operacao,
    campos: { origem: "importacao" },
  });
}

/** Snapshot: cópia do estado atual antes de qualquer modo que escreva (§12.4). */
export async function criarSnapshot(
  db: BancoArretado,
  contexto: ContextoDeEscrita,
): Promise<string> {
  const conteudo = await exportar(db, contexto, { escopo: "integral", incluirLog: false });
  const id = novoId();
  const agora = new Date().toISOString();
  await db.table("snapshots").put({
    id,
    usuarioId: contexto.usuarioId,
    criadoEm: agora,
    atualizadoEm: agora,
    origem: "app",
    excluidoEm: null,
    conteudo,
    tamanho: conteudo.byteLength,
  });
  return id;
}

/** Rollback de um clique enquanto o snapshot existir (§12.4). */
export async function desfazer(
  db: BancoArretado,
  contexto: ContextoDeEscrita,
  relogio: RelogioHibrido,
  snapshotId: string,
): Promise<void> {
  const snapshot = (await db.table("snapshots").get(snapshotId)) as
    | { conteudo: Uint8Array }
    | undefined;
  if (!snapshot) {
    throw new ErroDeImportacao("Este ponto de restauração não existe mais.");
  }
  await importar(db, contexto, relogio, snapshot.conteudo, { modo: "restaurarIntegral" });
}

async function registrarImportacao(
  db: BancoArretado,
  contexto: ContextoDeEscrita,
  dados: {
    modo: ModoDeImportacao;
    hashDoPacote: string;
    snapshotId: string;
    previa: Previa;
    espaco: string | null;
  },
): Promise<string> {
  const id = novoId();
  const agora = new Date().toISOString();
  await db.table("logsDeImportacao").put({
    id,
    usuarioId: contexto.usuarioId,
    criadoEm: agora,
    atualizadoEm: agora,
    origem: "app",
    excluidoEm: null,
    modo: dados.modo,
    hashDoPacote: dados.hashDoPacote,
    snapshotId: dados.snapshotId,
    espacoId: dados.espaco,
    contagens: dados.previa.contagens,
    avisos: dados.previa.avisos,
  });
  return id;
}
