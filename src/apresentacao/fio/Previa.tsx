// As peças que ligam o Arretado novo (prévia do Fio, D-D25) ao roteador, sem pesar no pacote inicial:
// as telas novas são carregadas só por quem liga a prévia. Quem não liga abre o Hoje de sempre, e as
// rotas novas levam de volta a ele.
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { EsqueletoDoFio } from './avisos/EsqueletoDoFio';
import { Hoje } from '../hoje/Hoje';
import { escolherInterface, useInterface, type InterfaceDoApp } from './interface';

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
 * Uma tela do Arretado novo: só abre com a prévia ligada; sem ela, volta ao Hoje. As telas que moram no quadro do
 * mockup (`noQuadro`) esperam na fronteira do próprio quadro (`CascaM`), que não pisca: o esqueleto cinza de antes
 * ficaria fora do desenho aprovado, e uma fronteira nova a cada tela faria o React segurar a revelação por 300 ms.
 */
export function TelaDoFio({
  children,
  noQuadro = false,
}: {
  children: ReactNode;
  noQuadro?: boolean;
}) {
  if (useInterface() !== 'fio') return <Navigate to="/" replace />;
  if (noQuadro) return children;
  return <Suspense fallback={<EsqueletoDoFio />}>{children}</Suspense>;
}

/** O começo do app: o Agora na prévia (no quadro, que cuida da espera), o Hoje de sempre fora dela. */
export function PaginaInicial() {
  if (useInterface() !== 'fio') return <Hoje />;
  return <AgoraDoFio />;
}

/** `#/fio/ligar` e `#/fio/desligar`: o atalho para quem recebe o link da prévia. */
export function TrocarInterface({ para }: { para: InterfaceDoApp }) {
  const navegar = useNavigate();
  useEffect(() => {
    escolherInterface(para);
    void navegar('/', { replace: true });
  }, [para, navegar]);
  return null;
}
