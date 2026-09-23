import { VERSAO_ESQUEMA } from "../esquema/versao";
import { novoId } from "../ids";
import type { RelogioHibrido } from "../log/relogio";
import type { BancoArretado } from "../persistencia/db";
import { Repositorio } from "../persistencia/repositorio";
import type { Aparelho, ContextoDeEscrita, Usuario } from "./modelo";

const META_USUARIO_ATUAL = "usuarioAtualId";
const META_APARELHO_ATUAL = "aparelhoAtualId";

export interface Identidade extends ContextoDeEscrita {
  usuarios: Repositorio<Usuario>;
  aparelhos: Repositorio<Aparelho>;
}

/**
 * Garante que este aparelho tem um Usuário local e um Aparelho registrados (§7.2 Identidade).
 * No primeiro uso cria ambos; depois só os reencontra pela tabela `meta` (nunca exportada).
 * F4 vincula o `usuarioId` local à conta Google sem trocar o id.
 */
export async function inicializarIdentidade(
  db: BancoArretado,
  relogio: RelogioHibrido,
  plataforma: string = detectarPlataforma(),
): Promise<Identidade> {
  const contexto: ContextoDeEscrita = { usuarioId: "", aparelhoId: "" };
  const usuarios = new Repositorio<Usuario>(db, db.usuarios, "Usuario", () => contexto, relogio);
  const aparelhos = new Repositorio<Aparelho>(
    db,
    db.aparelhos,
    "Aparelho",
    () => contexto,
    relogio,
  );

  const usuarioGravado = await db.meta.get(META_USUARIO_ATUAL);
  const aparelhoGravado = await db.meta.get(META_APARELHO_ATUAL);
  contexto.usuarioId = typeof usuarioGravado?.valor === "string" ? usuarioGravado.valor : novoId();
  contexto.aparelhoId =
    typeof aparelhoGravado?.valor === "string" ? aparelhoGravado.valor : novoId();

  const agora = new Date().toISOString();
  if (!(await usuarios.obter(contexto.usuarioId))) {
    await usuarios.salvar({
      id: contexto.usuarioId,
      usuarioId: contexto.usuarioId,
      criadoEm: agora,
      atualizadoEm: agora,
      origem: "app",
      excluidoEm: null,
      consentimentos: [],
    });
    await db.meta.put({ chave: META_USUARIO_ATUAL, valor: contexto.usuarioId });
  }
  if (!(await aparelhos.obter(contexto.aparelhoId))) {
    await aparelhos.salvar({
      id: contexto.aparelhoId,
      usuarioId: contexto.usuarioId,
      criadoEm: agora,
      atualizadoEm: agora,
      origem: "app",
      excluidoEm: null,
      nome: nomePadraoDoAparelho(plataforma),
      plataforma,
      versaoEsquemaLocal: VERSAO_ESQUEMA,
      ultimaSincronizacaoEm: null,
      posseAtivaAte: null,
    });
    await db.meta.put({ chave: META_APARELHO_ATUAL, valor: contexto.aparelhoId });
  }

  return { ...contexto, usuarios, aparelhos };
}

function detectarPlataforma(): string {
  if (typeof navigator === "undefined") return "desconhecida";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac OS/i.test(ua)) return "macos";
  if (/Linux/i.test(ua)) return "linux";
  return "desconhecida";
}

function nomePadraoDoAparelho(plataforma: string): string {
  switch (plataforma) {
    case "android":
    case "ios":
      return "Celular";
    case "windows":
    case "macos":
    case "linux":
      return "Computador";
    default:
      return "Este aparelho";
  }
}
