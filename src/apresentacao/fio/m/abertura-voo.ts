// A abertura do mockup aprovado (`telas.abertura()`), porte quase literal: o ponto de luz entra de longe e quica de
// letra em letra, deixando o rastro, cada letra acorda quando ele pousa; ele vira o ponto final do cacto, um fio o
// ergue até o canto e o leva, como um pêndulo, até onde a tela seguinte o espera. Os números (alturas dos pulos,
// pausas, tempos, a física do pêndulo) são os do arquivo. O que o React pede: o alvo e a tela seguinte vêm de fora
// (`preparar`), e tudo o que a abertura põe no quadro é recolhido por `limpar`.
import { animar as animarBase, espera as esperaBase } from './anima';

const NS = 'http://www.w3.org/2000/svg';

/** O mockup leva o foco ao título da tela que chegou (`ir()`); quem usa teclado ou leitor de tela segue dali. */
export function focarATela(tela: Element | null | undefined): void {
  const titulo = tela?.querySelector<HTMLElement>('h1, h2');
  if (!titulo) return;
  titulo.setAttribute('tabindex', '-1');
  titulo.focus({ preventScroll: true });
}

export type DestinoDaAbertura = 'inicio' | 'prova';

/** Onde o ponto pousa na tela seguinte, em coordenadas do quadro. */
export interface Alvo {
  x: number;
  y: number;
  s: number;
  /** A caixa do cacto da marca da tela seguinte (só o Agora tem): o nome sobe até ela. */
  cacto?: DOMRect;
}

export interface TelaSeguinte {
  destino: DestinoDaAbertura;
  alvo: Alvo;
  /** A tela que chega (a `section` do Agora ou da prova). */
  tela: HTMLElement;
}

export interface PedidoDaAbertura {
  /** O quadro (`.m-app`), onde o ponto e o fio voam. */
  app: HTMLElement;
  tela: HTMLElement;
  rastro: SVGSVGElement;
  nome: HTMLElement;
  frase: HTMLElement;
  pular: HTMLElement;
  calmo: boolean;
  /** O ritmo: 1 é o do mockup; abaixo de 1 é a mesma coreografia mais depressa (as aberturas de rotina). */
  ritmo: number;
  dia: boolean;
  /** Aborta quando a tela sai (pulo, rota, desmontagem): como `viva()` no mockup. */
  sinal: AbortSignal;
  /** Decide a tela seguinte, a põe por baixo (escondida) e a mede. `null`: não deu, a abertura sai sem o voo. */
  preparar: () => Promise<TelaSeguinte | null>;
  /** O ponto pousou: tira a abertura e deixa a tela seguinte à vista (o `ir(destino, { continuo: true })`). */
  aoPousar: (destino: DestinoDaAbertura) => void;
}

interface Trecho {
  d: string;
  q: string;
  dur: number;
  pausa: number;
  inicio: number;
  quique?: boolean;
}

const pos = (x: number, y: number, k: number) =>
  `translate(${String(x)}px, ${String(y)}px) scale(${String(k)})`;

function criarSvg<K extends 'svg' | 'g' | 'path'>(nome: K): SVGElementTagNameMap[K] {
  return document.createElementNS(NS, nome);
}

/** Roda a abertura. Devolve `limpar`, que tira do quadro o que ela pôs (o ponto, o fio, o rastro). */
export function rodarAbertura(p: PedidoDaAbertura): { limpar: () => void; fim: Promise<void> } {
  const { app, tela, rastro, nome, frase, pular, calmo, dia: diaM, sinal, ritmo } = p;
  // Todo tempo da coreografia passa por aqui: durações, atrasos, esperas e o pêndulo andam no mesmo ritmo.
  const animar = (
    el: Element | null | undefined,
    quadros: Keyframe[],
    opc?: KeyframeAnimationOptions,
  ) =>
    animarBase(
      el,
      quadros,
      opc && {
        ...opc,
        ...(typeof opc.duration === 'number' ? { duration: opc.duration * ritmo } : {}),
        ...(opc.delay === undefined ? {} : { delay: opc.delay * ritmo }),
      },
    );
  const espera = (ms: number, s?: AbortSignal) => esperaBase(ms * ritmo, s);
  const criados: Element[] = [];
  const limpar = () => {
    for (const el of criados) el.remove();
    criados.length = 0;
  };
  const viva = () => !sinal.aborted;
  const letras = Array.from(nome.querySelectorAll<HTMLElement>(':scope > span'));
  const cacto = nome.querySelector<SVGSVGElement>('.m-cacto-abertura');
  const cl = cacto?.querySelector<SVGPathElement>('.m-cm-l');
  const cp = cacto?.querySelector<SVGCircleElement>('.m-cm-p');

  const rodar = async () => {
    if (!cacto || !cl || !cp || letras.length === 0) return;
    tela.getAnimations({ subtree: true }).forEach((a) => {
      a.cancel();
    });
    rastro.replaceChildren();
    letras.forEach((l) => {
      l.style.opacity = '0';
    });
    frase.style.opacity = '0';
    nome.style.transform = '';
    cl.style.strokeDasharray = '1 2';
    cl.style.strokeDashoffset = '1.05';
    cl.style.opacity = '0';
    cp.style.opacity = '0';
    const A = app.getBoundingClientRect();
    const W = tela.clientWidth;
    const H = tela.clientHeight;
    rastro.setAttribute('viewBox', `0 0 ${String(W)} ${String(H)}`);
    // Onde cada letra recebe o ponto
    const caixas = letras.map((l) => {
      const r = l.getBoundingClientRect();
      return { x: r.left - A.left + r.width / 2, topo: r.top - A.top, alt: r.height };
    });
    const primeira = caixas[0];
    if (!primeira) return;
    const pouso = primeira.topo + primeira.alt * 0.36;
    // e no cacto: a ponta do braço esquerdo, o alto do tronco e, por fim, o ponto do braço direito
    const cm = cacto.getScreenCTM();
    if (!cm) return;
    const noCacto = (x: number, y: number) => {
      const q = new DOMPoint(x, y).matrixTransform(cm);
      return { x: q.x - A.left, y: q.y - A.top };
    };
    const bracoE = noCacto(866, 56);
    const tronco = noCacto(923, 28);
    const bola = noCacto(980, 87);
    const kd = (26 * cm.a) / 84;
    const px = bola.x;
    let py = bola.y + 8; // a bolinha se apoia pela base: assim ela cai bem em cima do ponto
    // O caminho: entra de longe e quica de letra em letra até virar o ponto final
    // alturas de cada pulo (a, r, r, e, t, a, d, o, ponto final): curtos, um respiro, um salto alto, e o pouso com dois quiques
    const ALTURAS = calmo
      ? [0, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]
      : [0, 30, 16, 42, 22, 70, 18, 28, 40, 26, 16];
    const PAUSAS: Record<number, number> = calmo ? {} : { 4: 420, 7: 220, 9: 170 };
    const duracao = (h: number) => (calmo ? 360 : Math.round(150 + Math.sqrt(h) * 34));
    const ENTRADA = calmo ? 900 : 820;
    const pts = [
      { x: -24, y: pouso - 70 },
      ...caixas.map((c) => ({ x: c.x, y: pouso })),
      bracoE,
      tronco,
      { x: px, y: py },
    ];
    const trechos: Trecho[] = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (!a || !b) continue;
      const h = i === 1 ? 90 : (ALTURAS[i - 1] ?? 0);
      const cx = i === 1 ? (a.x + b.x) / 2 - 20 : (a.x + b.x) / 2;
      const cy = Math.min(a.y, b.y) - h * 2;
      trechos.push({
        d: `M${String(a.x)} ${String(a.y)} Q${String(cx)} ${String(cy)} ${String(b.x)} ${String(b.y)}`,
        q: ` Q${String(cx)} ${String(cy)} ${String(b.x)} ${String(b.y)}`,
        dur: i === 1 ? ENTRADA : duracao(h),
        pausa: PAUSAS[i - 1] ?? 0,
        inicio: 0,
      });
    }
    const total = trechos.reduce((s, t) => s + t.dur + t.pausa, 0);
    const T0 = calmo ? 350 : 300;
    // Rastro: cada salto deixa um fio que se apaga devagar
    let t = T0;
    for (const tr of trechos) {
      const g = criarSvg('g');
      const b = criarSvg('path');
      const l = criarSvg('path');
      b.setAttribute('class', 'm-rastro-b m-brilho');
      l.setAttribute('class', 'm-rastro-l');
      b.setAttribute('d', tr.d);
      l.setAttribute('d', tr.d);
      g.append(b, l);
      rastro.appendChild(g);
      const L = l.getTotalLength();
      for (const traco of [b, l]) {
        traco.style.strokeDasharray = String(L);
        void animar(traco, [{ strokeDashoffset: L }, { strokeDashoffset: 0 }], {
          duration: tr.dur,
          delay: t,
          easing: 'linear',
        });
      }
      void animar(g, [{ opacity: 1 }, { opacity: calmo ? 0.2 : 0.14 }], {
        duration: 1100,
        delay: t + tr.dur,
        easing: 'ease-out',
      });
      tr.inicio = t;
      t += tr.dur + tr.pausa;
    }
    // o cacto se desenha enquanto a bolinha sai do "o" rumo ao braço
    const ultimo = trechos[8];
    if (ultimo) {
      void animar(
        cl,
        [
          { strokeDashoffset: 1.05, opacity: 0 },
          { opacity: 1, offset: 0.06 },
          { strokeDashoffset: 0, opacity: 1 },
        ],
        {
          duration: calmo ? 500 : ultimo.dur + 380,
          delay: ultimo.inicio - (calmo ? 0 : 300),
          easing: 'cubic-bezier(.4,0,.2,1)',
        },
      );
    }
    // O ponto anda pelo mesmo caminho
    const lanc = document.createElement('div');
    lanc.className = 'm-voo-ponto m-lancadeira';
    app.appendChild(lanc);
    criados.push(lanc);
    const inicio0 = pts[0];
    if (!inicio0) return;
    const caminho = `M${String(inicio0.x)} ${String(inicio0.y)}${trechos.map((tr) => tr.q).join('')}`;
    if (CSS.supports('offset-path', 'path("M0 0L1 1")')) {
      lanc.style.offsetPath = `path("${caminho}")`;
      const medidor = criarSvg('path');
      rastro.appendChild(medidor);
      let acum = `M${String(inicio0.x)} ${String(inicio0.y)}`;
      const quadros: Keyframe[] = [
        {
          offsetDistance: '0%',
          opacity: 0,
          offset: 0,
          easing: 'cubic-bezier(.3,.1,.5,1)',
        },
      ];
      medidor.setAttribute('d', caminho);
      const LT = medidor.getTotalLength();
      let dt = 0;
      for (const tr of trechos) {
        acum += tr.q;
        medidor.setAttribute('d', acum);
        dt += tr.dur;
        const od = `${String((medidor.getTotalLength() / LT) * 100)}%`;
        quadros.push({
          offsetDistance: od,
          opacity: 1,
          offset: dt / total,
          easing: 'cubic-bezier(.33,0,.67,1)',
        });
        if (tr.pausa) {
          dt += tr.pausa;
          quadros.push({
            offsetDistance: od,
            opacity: 1,
            offset: dt / total,
            easing: 'cubic-bezier(.33,0,.67,1)',
          });
        }
      }
      medidor.remove();
      void animar(lanc, quadros, { duration: total, delay: T0 });
    }
    // o ponto amassa ao pousar e estica ao sair; antes do salto alto, se agacha
    if (!calmo) {
      trechos.forEach((tr, i) => {
        const pousa = tr.inicio + tr.dur;
        const forte = tr.pausa > 0 || i === trechos.length - 1;
        void animar(
          lanc,
          [
            { transform: 'scale(1,1)' },
            { transform: forte ? 'scale(1.45,.6)' : 'scale(1.25,.78)', offset: 0.25 },
            { transform: 'scale(.9,1.15)', offset: 0.7 },
            { transform: 'scale(1,1)' },
          ],
          {
            duration: forte ? 340 : 240,
            delay: pousa - 20,
            easing: 'ease-out',
            composite: 'replace',
            fill: 'none',
          },
        );
      });
    }
    // Cada letra acorda quando o ponto pousa nela
    letras.forEach((l, i) => {
      const tr = trechos[i];
      if (!tr) return;
      const quando = tr.inicio + tr.dur - 30;
      void animar(
        l,
        calmo
          ? [
              { opacity: 0, transform: 'translateY(4px)' },
              { opacity: 1, transform: 'none' },
            ]
          : [
              {
                opacity: 0,
                transform: 'translateY(14px) scaleY(.82)',
                textShadow: '0 0 0 rgba(57,202,239,0)',
              },
              {
                opacity: 1,
                transform: 'translateY(-3px) scaleY(1.06)',
                textShadow: diaM ? '0 0 0 rgba(0,0,0,0)' : '0 0 18px rgba(57,202,239,.9)',
                offset: 0.45,
              },
              {
                opacity: 1,
                transform: 'none',
                textShadow: diaM ? '0 0 0 rgba(0,0,0,0)' : '0 0 6px rgba(57,202,239,.25)',
              },
            ],
        { duration: calmo ? 520 : 620, delay: quando, easing: 'cubic-bezier(.2,.7,.2,1)' },
      );
    });
    await espera(T0 + total, sinal);
    if (!viva()) return;
    // O ponto vira o ponto final; o rastro some; a frase chega
    py = bola.y;
    const ponto = document.createElement('div');
    ponto.className = 'm-voo-ponto';
    ponto.style.transform = pos(px, py, kd);
    app.appendChild(ponto);
    criados.push(ponto);
    lanc.remove();
    // bate no ponto do cacto e os dois viram um só
    cp.style.opacity = '1';
    if (!calmo) {
      void animar(
        cp,
        [
          { transform: 'scale(1.7)' },
          { transform: 'scale(.85)', offset: 0.55 },
          { transform: 'scale(1)' },
        ],
        { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' },
      );
    }
    void animar(rastro, [{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' });
    void animar(
      frase,
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: 700,
        delay: 200,
        easing: 'cubic-bezier(.2,.7,.2,1)',
      },
    );
    await animar(
      ponto,
      calmo
        ? [{ opacity: 1 }, { opacity: 1 }]
        : [
            { transform: pos(px, py, kd * 1.7) },
            { transform: pos(px, py, kd * 0.85), offset: 0.55 },
            { transform: pos(px, py, kd) },
          ],
      { duration: calmo ? 600 : 520, easing: 'cubic-bezier(.34,1.56,.64,1)' },
    );
    await espera(calmo ? 1300 : 1000, sinal);
    if (!viva()) return;
    // A tela seguinte: decidida e medida agora, já montada por baixo (a abertura segue por cima).
    const seguinte = await p.preparar();
    if (!viva()) return;
    if (!seguinte) {
      await animar(ponto, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-in' });
      return;
    }
    const { destino, alvo } = seguinte;
    if (calmo) {
      await animar(
        ponto,
        [
          { opacity: 1, transform: pos(px, py, 0.2) },
          { opacity: 0, transform: pos(px, py, 0.1) },
        ],
        { duration: 260, easing: 'ease-in' },
      );
      if (viva()) {
        p.aoPousar(destino);
        focarATela(seguinte.tela);
      }
      return;
    }
    // Um fio sobe do ponto até o canto de cima, à direita, e o leva como um pêndulo
    const svg = criarSvg('svg');
    svg.setAttribute('class', 'm-voo-fio');
    svg.setAttribute('aria-hidden', 'true');
    const pb = criarSvg('path');
    const pl = criarSvg('path');
    pb.setAttribute('class', 'm-b m-brilho');
    pl.setAttribute('class', 'm-l');
    svg.append(pb, pl);
    app.appendChild(svg);
    criados.push(svg);
    const LA = app.clientWidth;
    let ax = Math.min(LA - 66, px + 18);
    const ay = -14;
    const desenha = (bx: number, by: number, k: number, curva = 0) => {
      const dx = bx - ax;
      const dy = by - ay;
      const L = Math.hypot(dx, dy) || 1;
      const ux = dx / L;
      const uy = dy / L;
      const ex = bx - ux * 42 * k;
      const ey = by - uy * 42 * k;
      const mx = (ax + ex) / 2 - uy * curva;
      const my = (ay + ey) / 2 + ux * curva;
      const d = `M${ax.toFixed(1)} ${ay.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
      pl.setAttribute('d', d);
      pb.setAttribute('d', d);
    };
    desenha(px, py, kd);
    const comp = pl.getTotalLength();
    // o traço nasce no ponto e sobe (deslocamento negativo revela do fim do caminho para o começo)
    for (const traco of [pl, pb]) traco.style.strokeDasharray = `${String(comp)} ${String(comp)}`;
    await Promise.all(
      [pl, pb].map((traco) =>
        animar(traco, [{ strokeDashoffset: -comp }, { strokeDashoffset: 0 }], {
          duration: 520,
          easing: 'cubic-bezier(.3,.6,.2,1)',
        }),
      ),
    );
    if (!viva()) return;
    for (const traco of [pl, pb]) {
      traco.getAnimations().forEach((a) => {
        a.cancel();
      });
      traco.style.strokeDasharray = 'none';
    }
    if (alvo.cacto) {
      const de = cacto.getBoundingClientRect();
      const n0 = nome.getBoundingClientRect();
      const k2 = alvo.cacto.width / de.width;
      const dx = alvo.cacto.left - (n0.left + (de.left - n0.left) * k2);
      const dy = alvo.cacto.top - (n0.top + (de.top - n0.top) * k2);
      nome.style.transformOrigin = '0 0';
      void animar(
        nome,
        [
          { transform: 'none' },
          { transform: `translate(${String(dx)}px, ${String(dy)}px) scale(${String(k2)})` },
        ],
        { duration: 1500, delay: 380, easing: 'cubic-bezier(.6,0,.2,1)' },
      );
    } else {
      void animar(
        nome,
        [
          { transform: 'none', opacity: 1 },
          { transform: 'translateY(-24px)', opacity: 0 },
        ],
        { duration: 620, delay: 260, easing: 'cubic-bezier(.45,0,.25,1)' },
      );
    }
    void animar(
      frase,
      [
        { transform: 'none', opacity: 1 },
        { transform: 'translateY(-16px)', opacity: 0 },
      ],
      { duration: 520, delay: 200, easing: 'cubic-bezier(.45,0,.25,1)' },
    );
    void animar(pular, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
    // Pêndulo de verdade: o ponto é erguido, balança sob o canto, e o pivô desliza até onde o fio mora;
    // um vento fraco e irregular (duas senoides que não se repetem juntas) tira a regularidade do balanço
    ponto.getAnimations().forEach((an) => {
      an.cancel();
    });
    await new Promise<void>((fim) => {
      const L0 = Math.hypot(px - ax, py - ay);
      const Lf = alvo.y - ay;
      const ax0 = ax;
      const axf = alvo.x;
      let th = Math.atan2(px - ax, py - ay);
      let om = -0.75;
      let L = L0;
      let Lv = 0;
      let vx = 0;
      let tAnt = performance.now();
      let T = 0;
      const G = 9000;
      const ERGUE = 0.42;
      const BALANCA = 0.78;
      const VIAGEM = 1.35;
      const FIM = BALANCA + VIAGEM;
      const suave = (k: number) => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
      const passo = (h: number) => {
        T += h;
        const kv = suave((T - BALANCA) / VIAGEM);
        const nx = ax0 + (axf - ax0) * kv;
        const novoVx = (nx - ax) / h;
        const acx = (novoVx - vx) / h;
        ax = nx;
        vx = novoVx;
        const Lalvo =
          T < ERGUE ? L0 - L0 * 0.3 * suave(T / ERGUE) : L0 * 0.7 + (Lf - L0 * 0.7) * kv;
        const novoLv = (Lalvo - L) / h;
        Lv = novoLv;
        L = Lalvo;
        const amort = 1.3 + 7 * kv * kv;
        const vento = 4 * Math.sin(T * 5.3) * Math.sin(T * 1.9 + 0.7);
        const acel =
          -(G / L) * Math.sin(th) -
          (acx / L) * Math.cos(th) -
          2 * (Lv / L) * om -
          amort * om +
          (T < BALANCA + VIAGEM * 0.8 ? vento : 0);
        om += acel * h;
        th += om * h;
      };
      const quadro = (tt: number) => {
        if (!viva()) {
          fim();
          return;
        }
        let dt = Math.min(0.05, (tt - tAnt) / 1000 / ritmo);
        tAnt = tt;
        while (dt > 0) {
          const h = Math.min(dt, 1 / 240);
          passo(h);
          dt -= h;
        }
        const fecha = suave((T - (FIM - 0.32)) / 0.32);
        const thv = th * (1 - fecha);
        const k = suave((T - BALANCA) / VIAGEM);
        const esc = kd + (alvo.s - kd) * (1 - Math.pow(1 - k, 2));
        let bx = ax + Math.sin(thv) * L;
        let by = ay + Math.cos(thv) * L;
        bx += (alvo.x - bx) * fecha;
        by += (alvo.y - by) * fecha;
        ponto.style.transform = pos(bx, by, esc);
        desenha(bx, by, esc, Math.max(-14, Math.min(14, -om * 7 * (1 - fecha))));
        if (T < FIM) window.requestAnimationFrame(quadro);
        else fim();
      };
      window.requestAnimationFrame(quadro);
    });
    if (!viva()) return;
    p.aoPousar(destino);
    focarATela(seguinte.tela);
    // a marca já está no lugar (foi o nome que subiu): só o resto da tela aparece
    const nova = seguinte.tela;
    const chegam: Element[] =
      destino === 'inicio'
        ? [
            ...Array.from(nova.children).filter((c) => !c.classList.contains('m-cabeca')),
            ...Array.from(nova.querySelectorAll('.m-cabeca .m-cobre')),
          ]
        : [nova];
    for (const c of chegam) {
      void animar(c, [{ opacity: 0 }, { opacity: 1 }], {
        duration: 420,
        easing: 'cubic-bezier(.2,.7,.2,1)',
      }).then(() => {
        c.getAnimations().forEach((a) => {
          a.cancel();
        });
      });
    }
    if (destino === 'inicio') {
      const puxador = nova.querySelector<HTMLElement>('.m-puxador');
      if (puxador) puxador.style.visibility = 'hidden';
      await espera(420);
      if (puxador) puxador.style.visibility = '';
      ponto.remove();
      void animar(svg, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).then(() => {
        svg.remove();
      });
    } else {
      void animar(svg, [{ opacity: 1 }, { opacity: 0 }], { duration: 360 }).then(() => {
        svg.remove();
      });
      await espera(420);
      ponto.remove();
    }
  };

  return { limpar, fim: rodar() };
}
