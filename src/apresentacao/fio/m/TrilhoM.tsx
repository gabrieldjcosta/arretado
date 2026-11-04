import { useLayoutEffect, useRef } from 'react';
import { animar, MOLA, modoAgora, SAIR } from './anima';
import { PASSO, Y0 } from './trilho';

/**
 * O trilho do mockup: um nó por passo (e um para o pouso), os feitos acesos, o da vez maior. Quando chega a
 * um passo que não é o primeiro, a linha cresce até o nó novo e o nó "pinga" aceso (`animarNovo`).
 */
export function TrilhoM({
  feitos,
  nos,
  animarNovo,
}: {
  feitos: number;
  nos: number;
  animarNovo: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const t = ref.current;
    if (!t || !animarNovo || feitos <= 0) return;
    const modo = modoAgora();
    const calmo = modo === 'calmo';
    void animar(
      t.querySelector('.m-feita'),
      [{ height: `${String((feitos - 1) * PASSO)}px` }, { height: `${String(feitos * PASSO)}px` }],
      { duration: calmo ? 0 : 420, easing: SAIR },
    );
    void animar(
      t.querySelectorAll('.m-no')[feitos],
      calmo
        ? [{ opacity: 0.3 }, { opacity: 1 }]
        : [{ transform: 'scale(.4)' }, { transform: 'scale(1)' }],
      { duration: calmo ? 240 : 500, delay: calmo ? 0 : 300, easing: MOLA },
    );
    // Só ao montar: o trilho de cada passo nasce com o passo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="m-trilho" ref={ref} aria-hidden="true">
      <span className="m-linha" />
      <span className="m-feita" style={{ height: feitos > 0 ? feitos * PASSO : 0 }} />
      {Array.from({ length: nos }, (_, i) => (
        <span
          key={i}
          className={['m-no', i < feitos ? 'm-feito' : i === feitos ? 'm-atual' : '']
            .filter(Boolean)
            .join(' ')}
          style={{ top: Y0 + i * PASSO - (i === feitos ? 2 : 0) }}
        />
      ))}
      <span className="m-faisca" />
    </div>
  );
}
