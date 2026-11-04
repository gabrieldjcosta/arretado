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

/** Reavalia a cada 15 min; a troca é suave no CSS (e nenhuma em movimento reduzido). */
export function useLuzDaHora(): LuzDaHora {
  const [luz, setLuz] = useState<LuzDaHora>(() => luzDaHora(new Date()));
  useEffect(() => {
    const id = window.setInterval(
      () => {
        setLuz(luzDaHora(new Date()));
      },
      15 * 60 * 1000,
    );
    return () => {
      window.clearInterval(id);
    };
  }, []);
  return luz;
}
