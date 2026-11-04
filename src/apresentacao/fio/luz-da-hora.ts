import { useEffect, useState } from 'react';

/** A luz do Dia segue a hora: só o brilho do fundo muda, de leve. Noite não muda. */
export type LuzDaHora = 'manha' | 'dia' | 'tarde' | 'entardecer';

export function luzDaHora(agora: Date): LuzDaHora {
  const h = agora.getHours();
  if (h < 5) return 'entardecer';
  if (h < 10) return 'manha';
  if (h < 16) return 'dia';
  if (h < 18) return 'tarde';
  return 'entardecer';
}

/** Decide ao abrir e ao voltar à aba (nunca no meio da leitura: a troca de variável CSS não transiciona). */
export function useLuzDaHora(): LuzDaHora {
  const [luz, setLuz] = useState<LuzDaHora>(() => luzDaHora(new Date()));
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') setLuz(luzDaHora(new Date()));
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, []);
  return luz;
}
