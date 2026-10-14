// Projeto Supabase do Arretado (F4-A, A3). Sem imports: o build (config/seguranca.ts) e o app leem daqui.
// Nada aqui é segredo: a URL e a chave publicável vão a todo navegador por desenho; quem protege os
// dados é a RLS (supabase/). A chave de serviço nunca entra no repositório.

export const URL_SUPABASE = 'https://dgwoemewvpabbppascuw.supabase.co';
export const CHAVE_PUBLICAVEL = 'sb_publishable_OLF0T2liRn-jknoeDbsH0g_M6wKVhsg';

/** Endereços de retorno do login, iguais aos da lista permitida no painel do Supabase (plano §4.2). */
export const RETORNO_PRODUCAO = 'https://arretado.gabrieldjcosta.workers.dev/';
export const RETORNO_DESENVOLVIMENTO = 'http://localhost:5173/';
