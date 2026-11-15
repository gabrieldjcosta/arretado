// Ponte da casca nativa (Capacitor, Fase 1 do plano de apps). Só roda dentro do app instalado; no navegador
// nada daqui é chamado e os plugins nem são baixados (importação dinâmica). Regra de negócio fica fora.
import { ambienteAtual, emCasca } from './plataforma';
import { tratarRetornoDoLogin } from '../integracoes/conta/retorno';
import type { ServicoDeConta } from '../integracoes/conta/interface';

/** Dentro da casca, o link de volta é de https://arretado.cc: só o hash vale na origem local do WebView. */
const trocarHash = (novo: string) => {
  window.location.hash = new URL(novo).hash;
};

/** Abre o login do provedor no navegador do sistema (o Google bloqueia login dentro de WebView). */
export async function abrirNoNavegador(url: string): Promise<void> {
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
}

/**
 * Trata a volta do login (link `https://arretado.cc/?code=…`, capturado pelo app) e recarrega no destino.
 * Cobre o app já aberto (`appUrlOpen`) e o app aberto pelo próprio link (`getLaunchUrl`).
 */
export async function ouvirRetornoDoLogin(servico: ServicoDeConta): Promise<void> {
  if (!emCasca(ambienteAtual())) return;
  const { App } = await import('@capacitor/app');
  const { Browser } = await import('@capacitor/browser');
  const tratar = async (url: string) => {
    if (!new URL(url).searchParams.has('code') && !new URL(url).searchParams.has('error')) return;
    await Browser.close().catch(() => undefined);
    const resultado = await tratarRetornoDoLogin({ servico, url, substituirUrl: trocarHash });
    if (resultado !== 'sem-codigo') window.location.reload();
  };
  await App.addListener('appUrlOpen', ({ url }) => void tratar(url));
  const aberto = await App.getLaunchUrl();
  if (aberto?.url) await tratar(aberto.url);
}
