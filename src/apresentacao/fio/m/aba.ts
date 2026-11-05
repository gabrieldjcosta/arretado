// A troca de aba do mockup aprovado (`trocarAba`): o fio da tela que sai voa até o lugar do fio da tela que chega.
// Antes de trocar, tira da tela de agora 96 pontos do fio (o pendurado do Agora, o tracejado do mapa, o do varal);
// troca a tela; mede onde o fio da nova ficou e, durante 640 ms (820 no Calmo), leva cada ponto de um lugar ao outro,
// com a cauda chegando um pouco depois da ponta e uma folga no meio, como linha de verdade. Quando pousa, as linhas
// da tela nova aparecem enquanto o fio que voou se apaga. Tudo no DOM, como no mockup: nada passa pelo React.
//
// O que o app acrescenta: a tela nova só existe depois de a rota trocar (e, na primeira vez, de o pedaço dela chegar), então
// a troca espera que ela se registre e o fio dela apareça (até 1,5 s) antes de voar; se não aparecer, o voo não acontece.
import { animar, modoAgora } from './anima';
import { destinoJaVisto } from './destino-visto';
import { telaAtual } from './tela-atual';

interface Ponto {
  x: number;
  y: number;
}

/** O fio de cada tela, o que o voo leva e traz (o `FIO_DA_TELA` do mockup). A cópia que esmaece não conta. */
const FIO_DA_TELA: Readonly<Record<string, string>> = {
  inicio: '[data-tela="inicio"]:not(.m-saindo) .m-fio-pendurado',
  mapa: '[data-tela="mapa"]:not(.m-saindo) .m-tracejado',
  varal: '[data-tela="varal"]:not(.m-saindo) .m-varal-fio path',
};

/** Só as linhas que viram fio somem durante a troca; o resto da tela continua (o `LINHAS_DA_TELA` do mockup). */
const LINHAS_DA_TELA: Readonly<Record<string, string>> = {
  inicio:
    '[data-tela="inicio"]:not(.m-saindo) .m-fio-pendurado, [data-tela="inicio"]:not(.m-saindo) .m-fio-pendurado-b',
  mapa: '[data-tela="mapa"]:not(.m-saindo) .m-tracejado, [data-tela="mapa"]:not(.m-saindo) .m-andado, [data-tela="mapa"]:not(.m-saindo) .m-andado-b',
  varal: '[data-tela="varal"]:not(.m-saindo) .m-varal-linha:first-of-type .m-varal-fio path',
};

const NS = 'http://www.w3.org/2000/svg';
/** Os pontos do fio no quadro: tantos quanto o mockup, para a curva ser a mesma. */
const PONTOS = 96;
const AMOSTRAS = 480;
/**
 * A faixa de baixo do fio que voa é o neon amarelo do ponto, a .38 (desvio 20 de `ajustes.css`). Ao chegar ao mapa ela se
 * apaga a partir desse valor: o mockup a levava a 1 antes de apagar, e em amarelo isso estoura.
 */
const OPACIDADE_DA_FAIXA = 0.38;

const quadroDoFio = () => document.getElementById('conteudo');

/** Os 96 pontos do fio da tela `nome`, em px do quadro (só o que está à vista); `null` se a tela ainda não tem fio. */
function amostrar(nome: string): Ponto[] | null {
  const seletor = FIO_DA_TELA[nome];
  const quadro = quadroDoFio();
  const caminho = seletor ? document.querySelector<SVGPathElement>(seletor) : null;
  if (!caminho || !quadro || typeof caminho.getTotalLength !== 'function') return null;
  const A = quadro.getBoundingClientRect();
  const total = caminho.getTotalLength();
  const m = caminho.getScreenCTM();
  if (!m || !total) return null;
  const pts: Ponto[] = [];
  for (let i = 0; i <= AMOSTRAS; i += 1) {
    const q = caminho.getPointAtLength((total * i) / AMOSTRAS);
    const c = new DOMPoint(q.x, q.y).matrixTransform(m);
    const x = c.x - A.left;
    const y = c.y - A.top;
    if (x > -60 && x < A.width + 60 && y > -60 && y < A.height - 70) pts.push({ x, y });
  }
  if (pts.length < 2) return null;
  return Array.from({ length: PONTOS }, (_, i) => {
    const p = pts[Math.round((i * (pts.length - 1)) / (PONTOS - 1))];
    return p ?? { x: 0, y: 0 };
  });
}

/** A linha que passa pelos pontos, suavizada (o `suave` do mockup). */
function suave(pts: readonly Ponto[]): string {
  const primeiro = pts[0];
  const ultimo = pts[pts.length - 1];
  if (!primeiro || !ultimo) return '';
  let d = `M${String(primeiro.x)} ${String(primeiro.y)}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) continue;
    d += ` Q${String(a.x)} ${String(a.y)} ${String((a.x + b.x) / 2)} ${String((a.y + b.y) / 2)}`;
  }
  return `${d} L${String(ultimo.x)} ${String(ultimo.y)}`;
}

/** Espera o próximo quadro. */
const proximoQuadro = () =>
  new Promise<void>((resolver) => {
    requestAnimationFrame(() => {
      resolver();
    });
  });

/** Espera, quadro a quadro, até `obter()` devolver algo, ou até `limite` ms (então devolve `null`). */
async function esperarPor<T>(obter: () => T | null, limite: number): Promise<T | null> {
  const fim = performance.now() + limite;
  for (;;) {
    const achado = obter();
    if (achado !== null) return achado;
    if (performance.now() > fim) return null;
    await proximoQuadro();
  }
}

/**
 * Troca de aba: tira a amostra do fio de agora, chama `navegar` (que troca a rota) e, quando a tela nova chega, faz o fio
 * voar de uma para a outra. Na primeira ida ao Destino (que tem entrada própria), na falta de movimento ou de um dos dois
 * fios, só troca.
 */
export async function trocarDeAba(para: string, navegar: () => void): Promise<void> {
  const de = telaAtual();
  const modo = modoAgora();
  const amostraDe = de && modo !== 'reduzido' ? amostrar(de) : null;
  const comIntro = para === 'mapa' && modo === 'normal' && !destinoJaVisto();
  navegar();
  if (!amostraDe || comIntro) return;

  // A tela nova se registra quando monta; o fio dela, quando a leitura dos dados chega.
  if ((await esperarPor(() => (telaAtual() === para ? true : null), 1500)) === null) return;
  await proximoQuadro();
  const nova = document.querySelector<HTMLElement>(`[data-tela="${para}"]:not(.m-saindo)`);
  const quadro = quadroDoFio();
  const medido = await esperarPor(() => amostrar(para), 700);
  if (!nova || !quadro || !medido || telaAtual() !== para) return;
  // A tela nova entra deslizando: tira esse deslocamento da amostra, para o fio pousar onde a linha vai ficar.
  const transformada = getComputedStyle(nova).transform;
  const mt = new DOMMatrix(transformada === 'none' ? undefined : transformada);
  const alvoPontos = medido.map((p) => ({ x: p.x - mt.m41, y: p.y - mt.m42 }));

  const linhas = [
    ...document.querySelectorAll<HTMLElement | SVGElement>(LINHAS_DA_TELA[para] ?? ''),
  ];
  linhas.forEach((x) => {
    x.style.opacity = '0';
  });
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'm-voo-fio');
  svg.setAttribute('aria-hidden', 'true');
  const brilho = document.createElementNS(NS, 'path');
  const linha = document.createElementNS(NS, 'path');
  brilho.setAttribute('class', 'm-b m-brilho');
  linha.setAttribute('class', 'm-l');
  svg.append(brilho, linha);
  quadro.appendChild(svg);

  const N = amostraDe.length - 1;
  const calmo = modo === 'calmo';
  const D = calmo ? 820 : 640;
  const atrasoDaCauda = calmo ? 0.1 : 0.22;
  const t0 = performance.now();
  // Curva sem tranco: começa e termina com velocidade zero, e a cauda chega um pouco depois da ponta.
  const curva = (k: number) => (k < 0.5 ? 16 * k ** 5 : 1 - Math.pow(-2 * k + 2, 5) / 2);
  const tracejar = para === 'mapa';

  await new Promise<void>((fim) => {
    const passo = (t: number) => {
      if (telaAtual() !== para) {
        fim();
        return;
      }
      const k = Math.min(1, (t - t0) / D);
      const pts = amostraDe.map((p0, i) => {
        const p1 = alvoPontos[i] ?? p0;
        const atraso = (i / N) * atrasoDaCauda;
        const kk = Math.max(0, Math.min(1, (k - atraso) / (1 - atrasoDaCauda)));
        const e = curva(kk);
        // No meio do caminho o fio afrouxa um pouco, como linha de verdade.
        const folga = calmo ? 0 : Math.sin(Math.PI * e) * 10 * Math.sin((i / N) * Math.PI);
        return { x: p0.x + (p1.x - p0.x) * e, y: p0.y + (p1.y - p0.y) * e + folga };
      });
      const d = suave(pts);
      linha.setAttribute('d', d);
      brilho.setAttribute('d', d);
      if (tracejar && k > 0.55) {
        const q = (k - 0.55) / 0.45;
        linha.style.strokeDasharray = `${(300 * (1 - q) + 7 * q).toFixed(1)} ${(8 * q).toFixed(1)}`;
        brilho.style.opacity = String(OPACIDADE_DA_FAIXA * (1 - q));
      }
      if (k < 1) requestAnimationFrame(passo);
      else fim();
    };
    requestAnimationFrame(passo);
  });

  // As linhas da tela aparecem enquanto o fio que voou se apaga: troca sem salto.
  linhas.forEach((x) => {
    x.style.opacity = '';
    void animar(x, [{ opacity: 0 }, { opacity: getComputedStyle(x).opacity || 1 }], {
      duration: 260,
      easing: 'ease-out',
    }).then(() => {
      x.getAnimations().forEach((a) => {
        a.cancel();
      });
    });
  });
  void animar(svg, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-in' }).then(
    () => {
      svg.remove();
    },
  );
}
