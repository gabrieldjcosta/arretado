// Projeto Supabase do Arretado (F4-A, A3). Sem imports: o build (config/seguranca.ts) e o app leem daqui.
// Nada aqui é segredo: a URL e a chave publicável vão a todo navegador por desenho; quem protege os
// dados é a RLS (supabase/). A chave de serviço nunca entra no repositório.

export const URL_SUPABASE = 'https://dgwoemewvpabbppascuw.supabase.co';
export const CHAVE_PUBLICAVEL = 'sb_publishable_OLF0T2liRn-jknoeDbsH0g_M6wKVhsg';

/** Endereços de retorno do login, iguais aos da lista permitida no painel do Supabase (plano §4.2). */
export const RETORNO_PRODUCAO = 'https://arretado.cc/';
export const RETORNO_DESENVOLVIMENTO = 'http://localhost:5173/';

/** Hospedagem local; qualquer outro host (arretado.cc, workers.dev, a casca de um app) volta para o site oficial. */
const HOSTS_LOCAIS: readonly string[] = ['localhost', '127.0.0.1'];

/**
 * Endereço de retorno do OAuth (auditado na Fase 0 do plano de apps). Só devolve um dos dois endereços
 * fixos acima, nunca a origem atual: numa casca (`capacitor://localhost`, `https://localhost`) a origem
 * não está na lista do painel do Supabase, e o retorno ao site oficial é o que um link universal captura.
 */
export function enderecoDeRetorno(hostname: string): string {
  return HOSTS_LOCAIS.includes(hostname) ? RETORNO_DESENVOLVIMENTO : RETORNO_PRODUCAO;
}
