import { haMigracaoPendente } from '../../../core/pacote/migrar-para-conta';
import type { SessaoDeConta } from '../../../integracoes/conta';

/** A migração só quando há estudo sem conta e ela ainda não terminou; senão, a página da conta. */
export const destinoDepoisDeEntrar = async (
  sessao: SessaoDeConta,
  opcoes?: Parameters<typeof haMigracaoPendente>[1],
): Promise<string> =>
  (await haMigracaoPendente(sessao.uid, opcoes)) ? '#/conta/migracao' : '#/conta';
