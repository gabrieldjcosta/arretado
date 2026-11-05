// Instalação guiada da PWA (Fase 0 do plano de apps). Android e Windows (Chrome, Edge) oferecem o
// convite pelo evento `beforeinstallprompt`; o Safari do iOS não tem convite, só o passo a passo.
import { useCallback, useEffect, useState } from 'react';
import { ambienteAtual, jaInstalado, sistemaDe, type AmbienteDePlataforma } from './plataforma';

export type EstadoDaInstalacao = 'instalado' | 'convite' | 'passo-a-passo-ios' | 'indisponivel';

interface EventoDeConvite extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function estadoDaInstalacao(
  ambiente: AmbienteDePlataforma,
  temConvite: boolean,
): EstadoDaInstalacao {
  if (jaInstalado(ambiente)) return 'instalado';
  if (temConvite) return 'convite';
  if (sistemaDe(ambiente) === 'ios') return 'passo-a-passo-ios';
  return 'indisponivel';
}

export function useInstalacao(): { estado: EstadoDaInstalacao; instalar: () => Promise<void> } {
  const [convite, setConvite] = useState<EventoDeConvite | null>(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    const aoConvidar = (e: Event) => {
      e.preventDefault();
      setConvite(e as EventoDeConvite);
    };
    const aoInstalar = () => {
      setConvite(null);
      setInstalado(true);
    };
    window.addEventListener('beforeinstallprompt', aoConvidar);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoConvidar);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!convite) return;
    await convite.prompt();
    const { outcome } = await convite.userChoice;
    // O evento só serve uma vez; se a pessoa recusou, o navegador manda outro mais tarde.
    setConvite(null);
    if (outcome === 'accepted') setInstalado(true);
  }, [convite]);

  const estado = instalado ? 'instalado' : estadoDaInstalacao(ambienteAtual(), convite !== null);
  return { estado, instalar };
}
