import { afterEach, describe, expect, it, vi } from 'vitest';
import { simularMovimento } from '../../../testes/movimento';
import { animarEDeixar, animarEDeixarSo } from './anima';

type ComAnimate = { animate?: unknown };

/** Uma animação de mentira: `finished` resolve quando `terminar` é chamada; `cancel` anota quem a soltou. */
function animacaoDeMentira() {
  let terminar: () => void = () => undefined;
  const finished = new Promise<void>((resolver) => {
    terminar = resolver;
  });
  return { finished, cancel: vi.fn(), terminar };
}

/**
 * Um elemento com duas animações correndo juntas, como a Frase achada pela busca: a descida (que acaba primeiro) e o brilho
 * (que ainda corre). O jsdom não tem `animate` nem `getAnimations`; aqui os dois vêm de mentira.
 */
function elementoComDuasAnimacoes() {
  simularMovimento('normal');
  const el = document.createElement('div');
  const brilho = animacaoDeMentira();
  const descida = animacaoDeMentira();
  const animate = vi.fn().mockReturnValueOnce(brilho).mockReturnValueOnce(descida);
  (Element.prototype as ComAnimate).animate = animate;
  (el as unknown as { getAnimations: () => unknown[] }).getAnimations = () => [brilho, descida];
  return { el, brilho, descida };
}

afterEach(() => {
  delete (Element.prototype as ComAnimate).animate;
});

describe('soltar a animação no fim', () => {
  it('animarEDeixarSo solta só a animação que criou: a que corre junto continua até o fim', async () => {
    const { el, brilho, descida } = elementoComDuasAnimacoes();
    const passaOBrilho = animarEDeixarSo(el, [{ boxShadow: 'none' }], { duration: 1400 });
    const desceAFrase = animarEDeixarSo(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 420 });

    descida.terminar();
    await desceAFrase;
    expect(descida.cancel).toHaveBeenCalledTimes(1);
    expect(brilho.cancel).not.toHaveBeenCalled();

    brilho.terminar();
    await passaOBrilho;
    expect(brilho.cancel).toHaveBeenCalledTimes(1);
  });

  it('animarEDeixar, como o mockup, solta todas as do elemento (por isso o Caderno não o usa onde duas correm juntas)', async () => {
    const { el, brilho, descida } = elementoComDuasAnimacoes();
    void animarEDeixar(el, [{ boxShadow: 'none' }], { duration: 1400 });
    const desceAFrase = animarEDeixar(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 420 });

    descida.terminar();
    await desceAFrase;
    expect(descida.cancel).toHaveBeenCalledTimes(1);
    expect(brilho.cancel).toHaveBeenCalledTimes(1);
  });

  it('sem movimento, aplica o quadro final no estilo e resolve na hora', async () => {
    const el = document.createElement('div');
    await animarEDeixarSo(el, [{ opacity: 0 }, { opacity: 1, transform: 'none' }]);
    expect(el.style.opacity).toBe('1');
    expect(el.style.transform).toBe('none');
    await expect(animarEDeixarSo(null, [{ opacity: 1 }])).resolves.toBeUndefined();
  });
});
