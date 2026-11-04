// A troca de tela do mockup (`ir()`): a que sai esmaece e escorrega um pouco, a que entra sobe do lado
// de onde a pessoa vem, com a mesma curva e os mesmos tempos. A que sai já foi desmontada pelo React; o que
// se anima é uma cópia dela (o "fantasma"), tirada no instante em que ela sai.
import { ABAS, definirTela, telaAtual } from './tela-atual';
import { animar, animarEDeixar, cancelarAnimacoes, modoAgora, SAIR } from './anima';

interface Fantasma {
  copia: HTMLElement;
  de: string;
}

/** O fantasma que ainda espera a tela que vem; quem entra o pega. */
let pendente: Fantasma | null = null;

/** Deslocamento da troca: as abas deslizam de lado, o resto sobe um pouco (o mockup: `dx` e `dy`). */
function deslocamento(de: string | null, para: string) {
  const calmo = modoAgora() === 'calmo';
  const ia = ABAS.indexOf(de as (typeof ABAS)[number]);
  const ib = ABAS.indexOf(para as (typeof ABAS)[number]);
  const lado = ia >= 0 && ib >= 0 ? Math.sign(ib - ia) : 0;
  return { calmo, dx: calmo ? 0 : lado * 22, dy: lado ? 0 : calmo ? 6 : 14 };
}

function animarSaida(copia: HTMLElement, de: string | null, para: string) {
  const { calmo, dx, dy } = deslocamento(de, para);
  void animar(
    copia,
    [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: `translate(${String(-dx * 0.6)}px, ${String(-dy * 0.4)}px)` },
    ],
    { duration: calmo ? 360 : 260, easing: 'cubic-bezier(.4,0,1,1)' },
  ).then(() => {
    copia.remove();
  });
}

/** A tela `el` vai sair: guarda uma cópia estática dela, no mesmo quadro, para esmaecer. */
export function sairDaTela(el: HTMLElement, nome: string): void {
  const quadro = el.parentElement;
  if (!quadro || !el.isConnected || modoAgora() === 'reduzido') return;
  // O que a Web Animations deixou valendo (opacidade, transformações) passa para o estilo, que a cópia leva.
  if (typeof el.getAnimations === 'function') {
    el.getAnimations({ subtree: true }).forEach((a) => {
      try {
        a.commitStyles();
      } catch {
        /* alvo fora da tela: nada a guardar */
      }
    });
  }
  const copia = el.cloneNode(true) as HTMLElement;
  copia.removeAttribute('id');
  copia.querySelectorAll('[id]').forEach((n) => {
    n.removeAttribute('id');
  });
  copia.setAttribute('aria-hidden', 'true');
  copia.setAttribute('inert', '');
  copia.removeAttribute('data-foco');
  copia.classList.add('m-saindo');
  // A cópia nasce no topo da tela: sem o esmaecimento de quem estava rolado (desvio 36).
  copia.classList.remove('m-rolada');
  copia.style.removeProperty('--m-rolado');
  quadro.appendChild(copia);
  pendente = { copia, de: nome };
  // Se nenhuma tela chegar neste mesmo quadro (a próxima é outra casca), a cópia só esmaece.
  queueMicrotask(() => {
    if (pendente?.copia === copia) {
      pendente = null;
      animarSaida(copia, nome, '');
    }
  });
}

/** A tela `el` entrou: registra-a, anima a entrada e a saída da anterior, e leva o foco ao título. */
export function entrarNaTela(el: HTMLElement, nome: string): void {
  const veio = pendente?.de ?? telaAtual();
  const fantasma = pendente;
  pendente = null;
  definirTela(nome);
  if (!veio || veio === nome) {
    fantasma?.copia.remove();
    return;
  }
  const { calmo, dx, dy } = deslocamento(veio, nome);
  if (fantasma) animarSaida(fantasma.copia, veio, nome);
  void animarEDeixar(
    el,
    [
      { opacity: 0, transform: `translate(${String(dx)}px, ${String(dy)}px)` },
      { opacity: 1, transform: 'none' },
    ],
    { duration: calmo ? 620 : 480, delay: calmo ? 140 : 90, easing: SAIR },
  );
  const foco = el.querySelector<HTMLElement>('h1, h2') ?? el;
  foco.setAttribute('tabindex', '-1');
  foco.focus({ preventScroll: true });
}

/** A tela saiu de vez (a casca do Fio fechou): esquece qual era a atual. */
export function esquecerTelas(): void {
  pendente?.copia.remove();
  pendente = null;
  definirTela(null);
}

export { cancelarAnimacoes };
