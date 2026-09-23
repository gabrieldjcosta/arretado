import { ErroDeCifra, sha256 } from "@core/backup/cifra";
import {
  desfazer,
  ErroDeImportacao,
  importar,
  type ModoDeImportacao,
  preverImportacao,
} from "@core/backup/importar";
import { abrir, ErroDePacote, exportar } from "@core/backup/pacote";
import type { ContextoDeEscrita } from "@core/identidade/modelo";
import { novoId } from "@core/ids";
import { RelogioHibrido } from "@core/log/relogio";
import type { BancoArretado } from "@core/persistencia/db";
import type { Ponto } from "@dominios/plano/modelo";
import { unzipSync, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { criarBanco } from "../../src/composicao";

const SENHA = "uma senha longa o bastante";

function ponto(usuarioId: string, dados: Partial<Ponto> = {}): Ponto {
  const agora = new Date().toISOString();
  return {
    id: novoId(),
    usuarioId,
    criadoEm: agora,
    atualizadoEm: agora,
    origem: "teste",
    excluidoEm: null,
    disciplinaId: "disc-1",
    titulo: "Execução penal — progressão",
    faixa: "alta",
    ordem: 1,
    editalId: null,
    adiadoAte: null,
    origemDaFaixa: "manual",
    somenteLeitura: false,
    ...dados,
  };
}

/** Estado completo do banco, para comparar "antes" e "depois" por hash (§17: restore idêntico). */
async function hashDoBanco(db: BancoArretado, entidades: string[]): Promise<string> {
  const partes: string[] = [];
  for (const entidade of entidades) {
    const registros = (await db.table(entidade).toArray()) as { id: string }[];
    partes.push(entidade, JSON.stringify(registros.sort((a, b) => a.id.localeCompare(b.id))));
  }
  return sha256(partes.join("|"));
}

describe("pacote de backup (T6, D21)", () => {
  let db: BancoArretado;
  let contexto: ContextoDeEscrita;
  let relogio: RelogioHibrido;

  beforeEach(async () => {
    db = criarBanco(`teste-${novoId()}`);
    await db.open();
    contexto = { usuarioId: novoId(), aparelhoId: novoId() };
    relogio = new RelogioHibrido();
    await db
      .table("pontos")
      .bulkPut([
        ponto(contexto.usuarioId, { titulo: "Ponto A", ordem: 1 }),
        ponto(contexto.usuarioId, { titulo: "Ponto B", ordem: 2 }),
        ponto(contexto.usuarioId, { titulo: "Ponto C", ordem: 3 }),
      ]);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("exportar → apagar → restaurar devolve um estado idêntico (critério de aceite da F0)", async () => {
    const antes = await hashDoBanco(db, ["pontos"]);
    const pacote = await exportar(db, contexto);

    await db.table("pontos").clear();
    expect(await db.table("pontos").count()).toBe(0);

    await importar(db, contexto, relogio, pacote, { modo: "restaurarIntegral" });
    expect(await hashDoBanco(db, ["pontos"])).toBe(antes);
  });

  it("importar o mesmo pacote duas vezes não muda nada (idempotência)", async () => {
    const pacote = await exportar(db, contexto);
    await importar(db, contexto, relogio, pacote, { modo: "mesclar" });
    const depoisDaPrimeira = await hashDoBanco(db, ["pontos"]);
    const alteracoesDepoisDaPrimeira = await db.alteracoes.count();

    await importar(db, contexto, relogio, pacote, { modo: "mesclar" });
    expect(await hashDoBanco(db, ["pontos"])).toBe(depoisDaPrimeira);
    expect(await db.table("pontos").count()).toBe(3);
    // Nada mudou, então nada foi registrado no log.
    expect(await db.alteracoes.count()).toBe(alteracoesDepoisDaPrimeira);
  });

  it("o manifesto descreve o conteúdo e traz hash por arquivo e do conjunto", async () => {
    const pacote = await exportar(db, contexto, { incluirLog: true });
    const { manifesto, dados } = await abrir(pacote);

    expect(manifesto.formato).toBe("arretado/pacote");
    expect(manifesto.usuarioId).toBe(contexto.usuarioId);
    expect(manifesto.incluiLog).toBe(true);
    expect(manifesto.cifrado).toBe(false);
    expect(manifesto.arquivos.every((a) => a.hash.length === 64)).toBe(true);
    expect(manifesto.hashDoConjunto).toHaveLength(64);
    expect(dados.get("pontos")).toHaveLength(3);
  });

  it("pacote alterado fora do aplicativo não é restaurável", async () => {
    const pacote = await exportar(db, contexto);
    const conteudo = unzipSync(pacote);
    const original = new TextDecoder().decode(conteudo["entidades/pontos.ndjson"]);
    conteudo["entidades/pontos.ndjson"] = new TextEncoder().encode(
      original.replace("Ponto A", "Ponto adulterado"),
    );

    await expect(abrir(zipSync(conteudo))).rejects.toThrow(/alterado fora do aplicativo/);
  });

  it("arquivo que não é pacote, e pacote sem manifesto, falham com mensagem clara", async () => {
    await expect(abrir(new TextEncoder().encode("nada disso"))).rejects.toThrow(ErroDePacote);
    const semManifesto = zipSync({ "outro.txt": new TextEncoder().encode("x") });
    await expect(abrir(semManifesto)).rejects.toThrow(/sem manifesto/);
  });

  it("pacote de versão de esquema posterior é recusado, nunca migrado para trás", async () => {
    const pacote = await exportar(db, contexto);
    const conteudo = unzipSync(pacote);
    const manifesto = JSON.parse(new TextDecoder().decode(conteudo["manifesto.json"]));
    manifesto.versaoDoEsquema = 999;
    conteudo["manifesto.json"] = new TextEncoder().encode(JSON.stringify(manifesto));

    await expect(abrir(zipSync(conteudo))).rejects.toThrow(/versão mais nova/);
  });
});

describe("cifra do pacote (T6, §12.1)", () => {
  let db: BancoArretado;
  let contexto: ContextoDeEscrita;

  beforeEach(async () => {
    db = criarBanco(`teste-${novoId()}`);
    await db.open();
    contexto = { usuarioId: novoId(), aparelhoId: novoId() };
    await db.table("pontos").put(ponto(contexto.usuarioId, { titulo: "Segredo" }));
  });

  afterEach(async () => {
    await db.delete();
  });

  it("pacote cifrado não revela o conteúdo e abre com a senha certa", async () => {
    const cifrado = await exportar(db, contexto, { senha: SENHA });
    expect(new TextDecoder().decode(cifrado)).not.toContain("Segredo");

    const { dados } = await abrir(cifrado, SENHA);
    expect((dados.get("pontos") as Ponto[])[0]?.titulo).toBe("Segredo");
  });

  it("senha errada e pacote cifrado sem senha falham com mensagem própria", async () => {
    const cifrado = await exportar(db, contexto, { senha: SENHA });
    await expect(abrir(cifrado, "senha errada")).rejects.toThrow(ErroDeCifra);
    await expect(abrir(cifrado)).rejects.toThrow(/informe a senha/);
  });

  it("o cabeçalho em claro só traz o necessário para derivar a chave", async () => {
    const cifrado = await exportar(db, contexto, { senha: SENHA });
    const cabecalho = JSON.parse(new TextDecoder().decode(unzipSync(cifrado)["cabecalho.json"]));
    expect(Object.keys(cabecalho).sort()).toEqual([
      "cifrado",
      "formato",
      "iteracoes",
      "iv",
      "kdf",
      "sal",
      "versaoDoEsquema",
      "versaoDoFormato",
    ]);
    expect(cabecalho.iteracoes).toBeGreaterThanOrEqual(600_000);
  });
});

describe("modos de importação (§12.2)", () => {
  let db: BancoArretado;
  let contexto: ContextoDeEscrita;
  let relogio: RelogioHibrido;
  let pacoteOriginal: Uint8Array;
  let idDoPontoA: string;

  beforeEach(async () => {
    db = criarBanco(`teste-${novoId()}`);
    await db.open();
    contexto = { usuarioId: novoId(), aparelhoId: novoId() };
    relogio = new RelogioHibrido();
    const a = ponto(contexto.usuarioId, { titulo: "Ponto A" });
    idDoPontoA = a.id;
    await db.table("pontos").bulkPut([a, ponto(contexto.usuarioId, { titulo: "Ponto B" })]);
    pacoteOriginal = await exportar(db, contexto);
  });

  afterEach(async () => {
    await db.delete();
  });

  const importarCom = (modo: ModoDeImportacao, pacote = pacoteOriginal) =>
    importar(db, contexto, relogio, pacote, { modo });

  it("simulação não escreve nada, nem snapshot", async () => {
    await db.table("pontos").clear();
    const { previa, aplicado, snapshotId } = await importarCom("simulacao");

    expect(aplicado).toBe(false);
    expect(snapshotId).toBeNull();
    expect(await db.table("pontos").count()).toBe(0);
    expect(await db.table("snapshots").count()).toBe(0);
    expect(previa.contagens.find((c) => c.entidade === "pontos")?.criar).toBe(2);
  });

  it("adicionar somente novos cria os ausentes e não toca nos existentes", async () => {
    await db.table("pontos").update(idDoPontoA, { titulo: "Editado localmente" });
    await importarCom("adicionarNovos");

    const local = (await db.table("pontos").get(idDoPontoA)) as Ponto;
    expect(local.titulo).toBe("Editado localmente");
    expect(await db.table("pontos").count()).toBe(2);
  });

  it("atualizar identificados não cria o que não existe", async () => {
    await db.table("pontos").clear();
    await importarCom("atualizarIdentificados");
    expect(await db.table("pontos").count()).toBe(0);
  });

  it("mesclar marca como conflito o que mudou dos dois lados e não decide sozinho", async () => {
    const depois = new Date(Date.now() + 1000).toISOString();
    await db.table("pontos").update(idDoPontoA, { titulo: "Versão local", atualizadoEm: depois });

    const { previa } = await importarCom("mesclar");
    expect(previa.conflitos).toEqual([{ entidade: "pontos", id: idDoPontoA }]);

    const local = (await db.table("pontos").get(idDoPontoA)) as Ponto;
    expect(local.titulo).toBe("Versão local");
  });

  it("mesclar aplica o lado escolhido quando o usuário resolve o conflito", async () => {
    const depois = new Date(Date.now() + 1000).toISOString();
    await db.table("pontos").update(idDoPontoA, { titulo: "Versão local", atualizadoEm: depois });

    await importar(db, contexto, relogio, pacoteOriginal, {
      modo: "mesclar",
      resolucoes: { [idDoPontoA]: "pacote" },
    });

    const local = (await db.table("pontos").get(idDoPontoA)) as Ponto;
    expect(local.titulo).toBe("Ponto A");
  });

  it("substituir módulo apaga só as entidades escolhidas", async () => {
    await db.table("notas").put({
      id: novoId(),
      usuarioId: contexto.usuarioId,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      origem: "teste",
      excluidoEm: null,
      titulo: "Resumo que deve sobreviver",
      conteudo: "",
      tipo: "resumo",
      disciplinaId: null,
      fonteId: null,
    });
    await db.table("pontos").put(ponto(contexto.usuarioId, { titulo: "Ponto fora do pacote" }));

    await importar(db, contexto, relogio, pacoteOriginal, {
      modo: "substituirModulo",
      entidades: ["pontos"],
    });

    expect(await db.table("pontos").count()).toBe(2);
    expect(await db.table("notas").count()).toBe(1);
  });

  it("espaço separado isola os dados importados sem tocar nos atuais", async () => {
    const outro = { usuarioId: novoId(), aparelhoId: novoId() };
    const dbOutro = criarBanco(`teste-${novoId()}`);
    await dbOutro.open();
    await dbOutro.table("pontos").put(ponto(outro.usuarioId, { titulo: "Ponto de outra pessoa" }));
    const pacoteDeOutro = await exportar(dbOutro, outro);
    await dbOutro.delete();

    const { previa } = await importar(db, contexto, relogio, pacoteDeOutro, {
      modo: "espacoSeparado",
    });

    expect(previa.avisos.some((a) => a.tipo === "outroUsuario")).toBe(true);
    const meus = (await db.table("pontos").toArray()) as Ponto[];
    expect(meus.filter((p) => p.usuarioId === contexto.usuarioId)).toHaveLength(2);
    expect(meus.filter((p) => p.usuarioId !== contexto.usuarioId)).toHaveLength(1);
  });

  it("pacote de outro usuário é recusado fora do modo espaço separado", async () => {
    const outro = { usuarioId: novoId(), aparelhoId: novoId() };
    const dbOutro = criarBanco(`teste-${novoId()}`);
    await dbOutro.open();
    const pacoteDeOutro = await exportar(dbOutro, outro);
    await dbOutro.delete();

    await expect(importarCom("mesclar", pacoteDeOutro)).rejects.toThrow(ErroDeImportacao);
  });

  it("avisa sobre provável duplicata em vez de fundir registros sozinho", async () => {
    const original = (await db.table("pontos").get(idDoPontoA)) as Ponto;
    await db.table("pontos").put({ ...original, id: novoId() });

    const { previa } = await importarCom("simulacao");
    expect(previa.avisos.some((a) => a.tipo === "provavelDuplicata")).toBe(true);
  });

  it("toda escrita cria snapshot e o rollback devolve o estado anterior", async () => {
    const antes = await hashDoBanco(db, ["pontos"]);
    await db.table("pontos").clear();
    await db.table("pontos").put(ponto(contexto.usuarioId, { titulo: "Estrago" }));

    const { snapshotId } = await importarCom("restaurarIntegral");
    expect(snapshotId).not.toBeNull();

    // O snapshot guardou o estado "estragado"; restaurar volta para ele, não para o pacote.
    const depoisDaImportacao = await hashDoBanco(db, ["pontos"]);
    expect(depoisDaImportacao).toBe(antes);

    await desfazer(db, contexto, relogio, snapshotId as string);
    const pontos = (await db.table("pontos").toArray()) as Ponto[];
    expect(pontos.map((p) => p.titulo)).toEqual(["Estrago"]);
  });

  it("toda importação fica registrada com modo, hash do pacote e snapshot", async () => {
    const { logDeImportacaoId, snapshotId } = await importarCom("mesclar");
    const registro = (await db.table("logsDeImportacao").get(logDeImportacaoId as string)) as {
      modo: string;
      hashDoPacote: string;
      snapshotId: string;
    };

    expect(registro.modo).toBe("mesclar");
    expect(registro.hashDoPacote).toBe(await sha256(pacoteOriginal));
    expect(registro.snapshotId).toBe(snapshotId);
  });

  it("a prévia é obrigatória e diz quantas exclusões haverá antes de qualquer escrita", async () => {
    const pacote = await abrir(pacoteOriginal);
    const previa = await preverImportacao(db, contexto, pacote, "restaurarIntegral");

    expect(previa.criaraSnapshot).toBe(true);
    expect(previa.totalDeExclusoes).toBeGreaterThan(0);
    expect(await db.table("snapshots").count()).toBe(0);
  });
});
