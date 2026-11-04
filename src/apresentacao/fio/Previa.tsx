// As peças que ligam o Arretado novo (prévia do Fio, D-D25) ao roteador, sem pesar no pacote inicial:
// as telas novas são carregadas só por quem liga a prévia. Quem não liga abre o Hoje de sempre, e as
// rotas novas levam de volta a ele.
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Esqueleto } from '../componentes/estados';
import { Hoje } from '../hoje/Hoje';
import { escolherInterface, useInterface, type InterfaceDoApp } from './interface';

export const AgoraDoFio = lazy(() =>
  import('./agora/AgoraDoFio').then((m) => ({ default: m.AgoraDoFio })),
);
export const DestinoDoFio = lazy(() =>
  import('./destino/DestinoDoFio').then((m) => ({ default: m.DestinoDoFio })),
);
export const Varal = lazy(() => import('./varal/Varal').then((m) => ({ default: m.Varal })));
export const PassoDoFio = lazy(() =>
  import('./etapa/PassoDoFio').then((m) => ({ default: m.PassoDoFio })),
);
export const PousoDoFio = lazy(() =>
  import('./etapa/PousoDoFio').then((m) => ({ default: m.PousoDoFio })),
);

/** Uma tela do Arretado novo: só abre com a prévia ligada; sem ela, volta ao Hoje. */
export function TelaDoFio({ children }: { children: ReactNode }) {
  if (useInterface() !== 'fio') return <Navigate to="/" replace />;
  return <Suspense fallback={<Esqueleto linhas={4} />}>{children}</Suspense>;
}

/** O começo do app: o Agora na prévia, o Hoje de sempre fora dela. */
export function PaginaInicial() {
  if (useInterface() !== 'fio') return <Hoje />;
  return (
    <Suspense fallback={<Esqueleto linhas={4} />}>
      <AgoraDoFio />
    </Suspense>
  );
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
