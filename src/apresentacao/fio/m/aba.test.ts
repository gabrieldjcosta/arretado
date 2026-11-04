import { simularMovimento } from '../../../testes/movimento';
import { trocarDeAba } from './aba';
import { esquecerDestinoVisto, marcarDestinoVisto } from './destino-visto';
import { definirTela } from './tela-atual';

type ComAnimate = { animate?: unknown };

afterEach(() => {
  delete (Element.prototype as ComAnimate).animate;
  vi.unstubAllGlobals();
  definirTela(null);
  esquecerDestinoVisto();
  document.body.replaceChildren();
});

/** O jsdom não anima: com `animate` e o sistema sem pedir menos movimento, o modo é o normal, como num navegador. */
function comMovimento() {
  (Element.prototype as ComAnimate).animate = vi.fn();
  simularMovimento('normal');
}

/** O quadro e o fio pendurado do Agora, com a geometria que o jsdom não tem (o caminho é uma reta de 300 px). */
function montarOAgoraComFio() {
  const quadro = document.createElement('main');
  quadro.id = 'conteudo';
  quadro.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 800, right: 400, bottom: 800 }) as DOMRect;
  const tela = document.createElement('section');
  tela.dataset.tela = 'inicio';
  const fio = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  fio.setAttribute('class', 'm-fio-pendurado');
  const caminho = fio as unknown as {
    getTotalLength: () => number;
    getPointAtLength: (n: number) => { x: number; y: number };
    getScreenCTM: () => object;
  };
  caminho.getTotalLength = () => 300;
  caminho.getPointAtLength = (n) => ({ x: 200, y: n });
  caminho.getScreenCTM = () => ({});
  tela.appendChild(fio);
  quadro.appendChild(tela);
  document.body.appendChild(quadro);
  vi.stubGlobal(
    'DOMPoint',
    class {
      constructor(
        public x: number,
        public y: number,
      ) {}
      matrixTransform() {
        return { x: this.x, y: this.y };
      }
    },
  );
  definirTela('inicio');
}

describe('a troca de aba do mockup (o fio que voa de uma tela à outra)', () => {
  it('sem movimento (o modo dos testes) só troca a rota, uma vez, na hora', async () => {
    const navegar = vi.fn();
    await trocarDeAba('mapa', navegar);
    expect(navegar).toHaveBeenCalledTimes(1);
  });

  it('com movimento, mas sem fio na tela de agora, só troca e não espera a tela nova', async () => {
    comMovimento();
    definirTela('inicio');
    const navegar = vi.fn();
    const inicio = performance.now();
    await trocarDeAba('varal', navegar);
    expect(navegar).toHaveBeenCalledTimes(1);
    expect(performance.now() - inicio).toBeLessThan(500);
  });

  it('na primeira ida ao Destino a entrada dele tem o palco: só troca, sem fio voando', async () => {
    comMovimento();
    montarOAgoraComFio();
    esquecerDestinoVisto();
    const navegar = vi.fn();
    const inicio = performance.now();
    await trocarDeAba('mapa', navegar);
    expect(navegar).toHaveBeenCalledTimes(1);
    expect(performance.now() - inicio).toBeLessThan(500);
    expect(document.querySelector('.m-voo-fio')).toBeNull();
  });

  it('depois da primeira visita o fio voa: espera a tela nova, e se ela não chega, desiste sem deixar nada no quadro', async () => {
    vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    try {
      comMovimento();
      montarOAgoraComFio();
      marcarDestinoVisto();
      const navegar = vi.fn();
      const fim = trocarDeAba('mapa', navegar);
      // A tela nova nunca se registra: depois de 1,5 s de espera a troca desiste.
      await vi.advanceTimersByTimeAsync(1700);
      await fim;
      expect(navegar).toHaveBeenCalledTimes(1);
      expect(document.querySelector('.m-voo-fio')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
