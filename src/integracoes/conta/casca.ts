// Ponte da casca nativa (Capacitor, Fase 1 do plano de apps). Só roda dentro do app instalado; no navegador
// nada daqui é chamado e os plugins nem são baixados (importação dinâmica). Regra de negócio fica fora.
import { tratarRetornoDoLogin } from './retorno';
import type { ServicoDeConta } from './interface';

/** Dentro do app instalado (Capacitor)? Mesma checagem de `suporte/plataforma.ts`, que esta camada não pode importar. */
export function naCasca(): boolean {
  return (
    (
      window as { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor?.isNativePlatform?.() === true
  );
}

/** Dentro da casca, o link de volta é de https://arretado.cc: só o hash vale na origem local do WebView. */
const trocarHash = (novo: string) => {
  window.location.hash = new URL(novo).hash;
};

/** Abre o login do provedor no navegador do sistema (o Google bloqueia login dentro de WebView). */
export async function abrirNoNavegador(url: string): Promise<void> {
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
}

const CHAVE_TRATADA = 'arretado:retorno-tratado';

/**
 * Trata a volta do login (link `https://arretado.cc/?code=…`, capturado pelo app) e recarrega só se entrou.
 * Cobre o app já aberto (`appUrlOpen`) e o app aberto pelo próprio link (`getLaunchUrl`). O link de abertura
 * volta igual depois de recarregar (a ponte o guarda), então cada URL é tratada uma vez por sessão do app.
 */
export async function ouvirRetornoDoLogin(servico: ServicoDeConta): Promise<void> {
  if (!naCasca()) return;
  const { App } = await import('@capacitor/app');
  const { Browser } = await import('@capacitor/browser');
  const tratar = async (url: string) => {
    let busca: URLSearchParams;
    try {
      busca = new URL(url).searchParams;
    } catch {
      return;
    }
    if (!busca.has('code') && !busca.has('error')) return;
    try {
      if (sessionStorage.getItem(CHAVE_TRATADA) === url) return;
      sessionStorage.setItem(CHAVE_TRATADA, url);
    } catch {
      // Sem sessionStorage a deduplicação não vale; o pior caso é uma troca repetida, que falha sem laço.
    }
    await Browser.close().catch(() => undefined);
    const resultado = await tratarRetornoDoLogin({ servico, url, substituirUrl: trocarHash });
    if (resultado === 'entrou') window.location.reload();
  };
  await App.addListener('appUrlOpen', ({ url }) => void tratar(url));
  const aberto = await App.getLaunchUrl();
  if (aberto?.url) await tratar(aberto.url);
}
