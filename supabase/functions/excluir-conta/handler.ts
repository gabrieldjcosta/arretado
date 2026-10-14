// Lógica da Edge Function `excluir-conta` (F4-A, A5; plano §6), sem dependência de Deno para ser
// testada com Vitest. `index.ts` liga estas dependências ao Supabase com a chave de serviço, que
// existe só dentro da função (segredo da função, nunca no cliente nem no repositório).

export interface DependenciasDeExclusao {
  /** Valida o JWT e devolve o usuário; `null` se inválido ou vencido. */
  usuarioDoToken(token: string): Promise<{ id: string } | null>;
  /** Caminhos dos objetos do bucket `backups` na pasta do usuário (todas as páginas). */
  listarObjetos(uid: string): Promise<string[]>;
  apagarObjetos(caminhos: string[]): Promise<void>;
  /** Só data e se havia cópia; sem e-mail nem id. */
  registrarExclusao(tinhaCopia: boolean): Promise<void>;
  /** `auth.admin.deleteUser`: `on delete cascade` leva perfil, registros, log e posse. */
  apagarUsuario(uid: string): Promise<void>;
}

export interface PedidoDeExclusao {
  metodo: string;
  origem: string | null;
  autorizacao: string | null;
}

export interface RespostaDeExclusao {
  status: number;
  corpo: { estado: 'concluido' } | { erro: string } | null;
  cabecalhos: Record<string, string>;
}

/** Origens do app que podem chamar a função (iguais às URLs de retorno do login). */
export const ORIGENS_PERMITIDAS: readonly string[] = [
  'https://arretado.gabrieldjcosta.workers.dev',
  'http://localhost:5173',
];

function cabecalhosCors(origem: string | null): Record<string, string> {
  const base: Record<string, string> = { Vary: 'Origin' };
  if (origem && ORIGENS_PERMITIDAS.includes(origem)) {
    base['Access-Control-Allow-Origin'] = origem;
    base['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info';
    base['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  }
  return base;
}

export async function excluirConta(
  pedido: PedidoDeExclusao,
  deps: DependenciasDeExclusao,
): Promise<RespostaDeExclusao> {
  const cabecalhos = cabecalhosCors(pedido.origem);
  const responder = (status: number, corpo: RespostaDeExclusao['corpo']): RespostaDeExclusao => ({
    status,
    corpo,
    cabecalhos,
  });

  if (pedido.metodo === 'OPTIONS') return responder(204, null);
  if (pedido.metodo !== 'POST') return responder(405, { erro: 'método não permitido' });
  if (!pedido.origem || !ORIGENS_PERMITIDAS.includes(pedido.origem)) {
    return responder(403, { erro: 'origem não permitida' });
  }
  const token = /^Bearer (.+)$/i.exec(pedido.autorizacao ?? '')?.[1];
  const usuario = token ? await deps.usuarioDoToken(token) : null;
  if (!usuario) return responder(401, { erro: 'sessão inválida' });

  try {
    // O Supabase impede apagar usuário dono de objetos do Storage: objetos primeiro.
    const objetos = await deps.listarObjetos(usuario.id);
    if (objetos.length > 0) await deps.apagarObjetos(objetos);
    await deps.registrarExclusao(objetos.length > 0).catch(() => undefined);
    await deps.apagarUsuario(usuario.id);
  } catch {
    // Nada é meio apagado de forma irrecuperável: repetir o pedido continua de onde parou.
    return responder(500, { erro: 'não foi possível concluir a exclusão agora' });
  }
  return responder(200, { estado: 'concluido' });
}
