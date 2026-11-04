// A câmera do mapa na tela: escuta o toque, a roda, o teclado e o tamanho da caixa e põe a câmera (função
// pura de `camera.ts`) no desenho e nas marcas. Nada disso passa pelo React depois de montado: a câmera
// muda o `viewBox` do SVG e três variáveis CSS da caixa (`--cam-x`, `--cam-y`, `--cam-k`), e cada marca
// acha o seu lugar sozinha. Movimento reduzido e perfil Calmo: a câmera não voa, só aparece onde deve.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { movimentoAgora } from '../../movimento';
import {
  LARGURA_DE_LONGE,
  arrastar,
  cameraNoCentro,
  centroDaCamera,
  entreCameras,
  escala,
  prender,
  proporcao,
  suavizar,
  zoomEmPonto,
  zoomNoCentro,
  type Caixa,
  type Camera,
} from './camera';

/** Onde a câmera está: no Nordeste todo, em torno da pessoa, ou solta (a pessoa passeou). */
export type Vista = 'todo' | 'voce' | 'livre';

export interface OpcoesDaCamera {
  /** O tamanho do desenho todo, para a câmera não sair dele. */
  limites: Caixa;
  /** As duas câmeras de referência, para o tamanho atual da caixa. */
  vistas: (caixa: Caixa) => { todo: Camera; voce: Camera };
  /** A câmera parou (ou mudou a distância): hora de esconder os rótulos que se cobrem. */
  aoAssentar: (cam: Camera, caixa: Caixa, el: HTMLElement) => void;
  /** Muda quando a pessoa anda no caminho: com a câmera em torno dela, ela a acompanha. */
  seguir: number;
}

/** Quanto o dedo anda antes de a pressão virar arrasto (abaixo disso, ainda é um toque). */
const FOLGA_DO_TOQUE = 6;
/** Quanto de um passo do teclado, em fração da caixa. */
const PASSO_DO_TECLADO = 0.15;
const ASSENTA_EM_MS = 140;

type Gesto =
  | { tipo: 'nenhum' }
  | { tipo: 'arrasto'; x0: number; y0: number; cam0: Camera; ativo: boolean }
  | { tipo: 'beliscao'; d0: number; m0: { x: number; y: number }; cam0: Camera };

export function useCamera(opcoes: OpcoesDaCamera) {
  const caixaRef = useRef<HTMLDivElement>(null);
  const desenhoRef = useRef<SVGSVGElement>(null);
  const opc = useRef(opcoes);
  useLayoutEffect(() => {
    opc.current = opcoes;
  });

  const cam = useRef<Camera>({ x: 0, y: 0, w: 1400 });
  const geracao = useRef(0);
  const relogio = useRef<number | undefined>(undefined);
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<Gesto>({ tipo: 'nenhum' });
  // Com movimento a câmera começa longe e se aproxima; sem, já começa em torno da pessoa.
  const [vista, setVista] = useState<Vista>(() =>
    movimentoAgora() === 'normal' ? 'todo' : 'voce',
  );
  const vistaRef = useRef<Vista>(vista);

  const medir = useCallback((): Caixa => {
    const el = caixaRef.current;
    return { largura: el?.clientWidth ?? 0, altura: el?.clientHeight ?? 0 };
  }, []);

  const mudarVista = useCallback((v: Vista) => {
    if (vistaRef.current === v) return;
    vistaRef.current = v;
    setVista(v);
  }, []);

  /** Põe a câmera no desenho e nas marcas. */
  const definir = useCallback(
    (c: Camera) => {
      cam.current = c;
      const el = caixaRef.current;
      const svg = desenhoRef.current;
      if (!el || !svg) return;
      const caixa = medir();
      const altura = c.w * proporcao(caixa);
      svg.setAttribute(
        'viewBox',
        `${c.x.toFixed(2)} ${c.y.toFixed(2)} ${c.w.toFixed(2)} ${altura.toFixed(2)}`,
      );
      el.style.setProperty('--cam-x', c.x.toFixed(2));
      el.style.setProperty('--cam-y', c.y.toFixed(2));
      el.style.setProperty('--cam-k', escala(c, caixa).toFixed(5));
      const longe = c.w > LARGURA_DE_LONGE;
      if (longe !== el.hasAttribute('data-longe')) el.toggleAttribute('data-longe', longe);
      window.clearTimeout(relogio.current);
      relogio.current = window.setTimeout(() => {
        opc.current.aoAssentar(cam.current, medir(), el);
      }, ASSENTA_EM_MS);
    },
    [medir],
  );

  /** Leva a câmera até `alvo`; sem movimento, ou com duração zero, ela já aparece lá. */
  const voar = useCallback(
    (alvo: Camera, duracao: number) => {
      geracao.current += 1;
      const id = geracao.current;
      if (movimentoAgora() !== 'normal' || duracao <= 0) {
        definir(alvo);
        return;
      }
      const de = cam.current;
      const inicio = performance.now();
      const quadro = (agora: number) => {
        if (geracao.current !== id) return;
        const k = Math.min(1, (agora - inicio) / duracao);
        definir(entreCameras(de, alvo, medir(), suavizar(k)));
        if (k < 1) requestAnimationFrame(quadro);
      };
      requestAnimationFrame(quadro);
    },
    [definir, medir],
  );

  const irPara = useCallback(
    (v: 'todo' | 'voce', duracao = 1300) => {
      mudarVista(v);
      voar(opc.current.vistas(medir())[v], duracao);
    },
    [medir, mudarVista, voar],
  );

  const alternar = useCallback(() => {
    irPara(vistaRef.current === 'voce' ? 'todo' : 'voce');
  }, [irPara]);

  /** A pessoa pegou o mapa: o que estava voando para e a câmera fica solta. */
  const soltar = useCallback(() => {
    geracao.current += 1;
    mudarVista('livre');
  }, [mudarVista]);

  const mover = useCallback(
    (proxima: Camera, duracao = 0) => {
      voar(prender(proxima, medir(), opc.current.limites), duracao);
    },
    [medir, voar],
  );

  const aproximar = useCallback(() => {
    soltar();
    mover(zoomNoCentro(cam.current, medir(), 0.6), 250);
  }, [medir, mover, soltar]);

  const afastar = useCallback(() => {
    soltar();
    mover(zoomNoCentro(cam.current, medir(), 1 / 0.6), 250);
  }, [medir, mover, soltar]);

  // Primeira posição, antes da primeira pintura; com movimento, depois de um instante a câmera se aproxima.
  useLayoutEffect(() => {
    const v = opc.current.vistas(medir());
    definir(v[vistaRef.current === 'voce' ? 'voce' : 'todo']);
    if (vistaRef.current !== 'todo') return;
    const espera = window.setTimeout(() => {
      irPara('voce', 1800);
    }, 900);
    return () => {
      window.clearTimeout(espera);
    };
  }, [definir, irPara, medir]);

  // A pessoa andou (chegou um pouso com o mapa aberto): a câmera em torno dela vai até o lugar novo.
  const seguindo = useRef(opcoes.seguir);
  useEffect(() => {
    if (seguindo.current === opcoes.seguir) return;
    seguindo.current = opcoes.seguir;
    if (vistaRef.current === 'voce') voar(opc.current.vistas(medir()).voce, 1200);
  }, [opcoes.seguir, medir, voar]);

  // Mudou o tamanho da caixa (girou o aparelho, a janela cresceu): a câmera acompanha.
  useEffect(() => {
    const el = caixaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let anterior = medir();
    const observador = new ResizeObserver(() => {
      const agora = medir();
      if (agora.largura === anterior.largura && agora.altura === anterior.altura) return;
      if (vistaRef.current === 'livre') {
        definir(cameraNoCentro(centroDaCamera(cam.current, anterior), cam.current.w, agora));
      } else {
        definir(opc.current.vistas(agora)[vistaRef.current]);
      }
      anterior = agora;
    });
    observador.observe(el);
    return () => {
      observador.disconnect();
    };
  }, [definir, medir]);

  // A roda aproxima em torno do cursor. Escuta direto no elemento: o React registra a roda como passiva.
  useEffect(() => {
    const el = caixaRef.current;
    if (!el) return;
    const aoRolar = (e: WheelEvent) => {
      if ((e.target as Element).closest('.ne-ficha')) return;
      e.preventDefault();
      soltar();
      const r = el.getBoundingClientRect();
      const passo = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      mover(
        zoomEmPonto(
          cam.current,
          medir(),
          e.clientX - r.left,
          e.clientY - r.top,
          Math.exp(passo * 0.0015),
        ),
      );
    };
    el.addEventListener('wheel', aoRolar, { passive: false });
    return () => {
      el.removeEventListener('wheel', aoRolar);
    };
  }, [medir, mover, soltar]);

  // Foco por teclado numa marca que a câmera deixou fora da caixa: a caixa não rola, a câmera vai até ela.
  useEffect(() => {
    const el = caixaRef.current;
    if (!el) return;
    const aoRolarACaixa = () => {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    };
    el.addEventListener('scroll', aoRolarACaixa);
    return () => {
      el.removeEventListener('scroll', aoRolarACaixa);
    };
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(relogio.current);
      geracao.current += 1;
    },
    [],
  );

  const aoFocar = (e: FocusEvent<HTMLDivElement>) => {
    const marca = (e.target as Element).closest<HTMLElement>('.ne-marcas > *');
    if (!marca) return;
    const x = Number(marca.style.getPropertyValue('--x'));
    const y = Number(marca.style.getPropertyValue('--y'));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const caixa = medir();
    const k = escala(cam.current, caixa);
    const sx = (x - cam.current.x) * k;
    const sy = (y - cam.current.y) * k;
    const borda = 48;
    if (sx >= borda && sy >= borda && sx <= caixa.largura - borda && sy <= caixa.altura - borda) {
      return;
    }
    soltar();
    mover(cameraNoCentro({ x, y }, cam.current.w, caixa), 300);
  };

  const aoPressionar = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('.ne-ficha, .ne-vista, .ne-zoom, .ne-aviso')) return;
    const r = e.currentTarget.getBoundingClientRect();
    ponteiros.current.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    const todos = [...ponteiros.current.values()];
    if (todos.length === 1) {
      const p = todos[0];
      if (p) gesto.current = { tipo: 'arrasto', x0: p.x, y0: p.y, cam0: cam.current, ativo: false };
    } else if (todos.length === 2) {
      const [a, b] = todos;
      if (!a || !b) return;
      soltar();
      gesto.current = {
        tipo: 'beliscao',
        d0: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
        m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        cam0: cam.current,
      };
    }
  };

  const aoMover = (e: PointerEvent<HTMLDivElement>) => {
    if (!ponteiros.current.has(e.pointerId)) return;
    const r = e.currentTarget.getBoundingClientRect();
    ponteiros.current.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    const g = gesto.current;
    if (g.tipo === 'arrasto') {
      const p = ponteiros.current.get(e.pointerId);
      if (!p) return;
      const dx = p.x - g.x0;
      const dy = p.y - g.y0;
      if (!g.ativo) {
        if (Math.hypot(dx, dy) < FOLGA_DO_TOQUE) return;
        g.ativo = true;
        soltar();
        e.currentTarget.setAttribute('data-arrastando', '');
        // Daqui em diante os eventos vêm para a caixa, e o toque que começou num botão não o aciona.
        if (typeof e.currentTarget.setPointerCapture === 'function') {
          e.currentTarget.setPointerCapture(e.pointerId);
        }
      }
      mover(arrastar(g.cam0, medir(), dx, dy));
    } else if (g.tipo === 'beliscao') {
      const [a, b] = [...ponteiros.current.values()];
      if (!a || !b) return;
      const d = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const caixa = medir();
      const aproximado = zoomEmPonto(g.cam0, caixa, g.m0.x, g.m0.y, g.d0 / d);
      mover(arrastar(aproximado, caixa, meio.x - g.m0.x, meio.y - g.m0.y));
    }
  };

  const aoSoltar = (e: PointerEvent<HTMLDivElement>) => {
    ponteiros.current.delete(e.pointerId);
    if (ponteiros.current.size === 0) {
      gesto.current = { tipo: 'nenhum' };
      e.currentTarget.removeAttribute('data-arrastando');
    } else if (ponteiros.current.size === 1) {
      // Soltou um dos dedos do beliscão: o que sobrou passeia a partir de onde está.
      const p = [...ponteiros.current.values()][0];
      if (p) gesto.current = { tipo: 'arrasto', x0: p.x, y0: p.y, cam0: cam.current, ativo: true };
    }
  };

  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    // Só com o foco na caixa: nas marcas, as setas e o Enter são delas.
    if (e.target !== e.currentTarget) return;
    const caixa = medir();
    const passoX = (caixa.largura || 340) * PASSO_DO_TECLADO;
    const passoY = (caixa.altura || 500) * PASSO_DO_TECLADO;
    const andar = (dx: number, dy: number) => {
      e.preventDefault();
      soltar();
      mover(arrastar(cam.current, caixa, dx, dy), 160);
    };
    switch (e.key) {
      case 'ArrowLeft':
        andar(passoX, 0);
        break;
      case 'ArrowRight':
        andar(-passoX, 0);
        break;
      case 'ArrowUp':
        andar(0, passoY);
        break;
      case 'ArrowDown':
        andar(0, -passoY);
        break;
      case '+':
      case '=':
        e.preventDefault();
        aproximar();
        break;
      case '-':
      case '_':
        e.preventDefault();
        afastar();
        break;
      case '0':
      case 'Home':
        e.preventDefault();
        irPara('voce');
        break;
      default:
    }
  };

  return {
    caixaRef,
    desenhoRef,
    vista,
    alternar,
    aproximar,
    afastar,
    eventos: {
      onPointerDown: aoPressionar,
      onPointerMove: aoMover,
      onPointerUp: aoSoltar,
      onPointerCancel: aoSoltar,
      onKeyDown: aoTeclar,
      onFocus: aoFocar,
    },
  };
}
