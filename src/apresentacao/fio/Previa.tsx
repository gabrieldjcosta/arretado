// As peças que ligam as telas do Fio (D-D25) ao roteador, sem pesar no pacote inicial: cada tela é carregada quando a
// pessoa chega nela.
import { lazy, Suspense, type ReactNode } from 'react';
import { EsqueletoDoFio } from './avisos/EsqueletoDoFio';

export const ProvaDoFio = lazy(() => import('./m/ProvaM').then((m) => ({ default: m.ProvaM })));
export const AgoraDoFio = lazy(() => import('./m/AgoraM').then((m) => ({ default: m.AgoraM })));
export const DestinoDoFio = lazy(() =>
  import('./m/DestinoM').then((m) => ({ default: m.DestinoM })),
);
export const VaralDoFio = lazy(() => import('./m/VaralM').then((m) => ({ default: m.VaralM })));
export const FolhetoDoFio = lazy(() =>
  import('./m/FolhetoM').then((m) => ({ default: m.FolhetoM })),
);
export const PassoDoFio = lazy(() => import('./m/PassoM').then((m) => ({ default: m.PassoM })));
export const PousoDoFio = lazy(() => import('./m/PousoM').then((m) => ({ default: m.PousoM })));

/**
 * Uma tela do Fio. As telas que moram no quadro do mockup (`noQuadro`) esperam na fronteira do próprio quadro
 * (`CascaM`), que não pisca: o esqueleto cinza de antes ficaria fora do desenho aprovado, e uma fronteira nova a cada
 * tela faria o React segurar a revelação por 300 ms.
 */
export function TelaDoFio({
  children,
  noQuadro = false,
}: {
  children: ReactNode;
  noQuadro?: boolean;
}) {
  if (noQuadro) return children;
  return <Suspense fallback={<EsqueletoDoFio />}>{children}</Suspense>;
}

/** O começo do app: o Agora do Fio (no quadro, que cuida da espera). */
export function PaginaInicial() {
  return <AgoraDoFio />;
}
