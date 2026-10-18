import { ServicoDeContaNulo } from './nulo';
import { ServicoDeContaPreguicoso } from './preguicoso';
import type { ServicoDeConta } from './interface';

export {
  type CopiaNaNuvem,
  FalhaDeConta,
  type MotivoDeFalha,
  type ServicoDeConta,
  type SessaoDeConta,
} from './interface';
export { ServicoDeContaNulo } from './nulo';
export { ServicoDeContaPreguicoso } from './preguicoso';
export { ServicoDeContaFalso } from './falso';
export { tratarRetornoDoLogin, type ResultadoDoRetorno } from './retorno';

/** Chave de build `VITE_CONTA=1` liga a F4-A. Padrão (qualquer outro valor): app idêntico ao de hoje. */
export function contasHabilitadas(
  env: { VITE_CONTA?: string | undefined } = import.meta.env as { VITE_CONTA?: string },
): boolean {
  return env.VITE_CONTA === '1';
}

/** Serviço de conta do build: nulo com a chave desligada; com ela, o Supabase carregado só quando usado. */
export function criarServicoDeConta(habilitadas: boolean = contasHabilitadas()): ServicoDeConta {
  if (!habilitadas) return new ServicoDeContaNulo();
  return new ServicoDeContaPreguicoso(async () => {
    const { ServicoDeContaSupabase } = await import('./supabase');
    return new ServicoDeContaSupabase();
  });
}
