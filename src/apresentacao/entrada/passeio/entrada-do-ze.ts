// A entrada do Zé nas Boas-vindas da primeira vez (D-D10, contrato §9). A luz que veio da Abertura pousa no pé
// esquerdo e desenha o contorno de pé a pé (1,2 s) com o néon aceso; o texto sobe na metade. No pé direito a
// luz salta à flor (0,24 s), que brota (0,16 s) e acende o miolo; os olhos surgem um depois do outro
// (0,14 s cada), as bochechas esquentam (0,24 s) e o olho direito dá uma piscadela (0,56 s). É a
// coreografia da maquete, quadro a quadro, pelo controle do Zé. O que ela deixa é o Zé inteiro e parado, o
// mesmo de quem não a viu. Só no movimento normal: nos outros o Zé aparece pronto, na hora.
import type { ControleDoZe } from '../../componentes/ze/controle';
import { PONTO_DA_FLOR } from '../../componentes/ze/geometria';
import { criarCurva, curva, esperar, movimentoAgora } from '../../movimento';
import { andar, curvaDaViagem } from '../abertura/voo';

/**
 * Como o Zé das Boas-vindas entra. `pronta`: inteiro e parado desde o primeiro quadro (o passeio refeito, a
 * Chegada depois de uma Abertura pulada ou sem voo). `espera`: a Chegada já está na tela, escondida por baixo da
 * Abertura, esperando a luz pousar. `desenhar`: a luz pousou e o Zé se desenha.
 */
export type EntradaDoZe = 'espera' | 'desenhar' | 'pronta';

/** A curva da tinta da maquete: o contorno arranca, corre e assenta. */
const curvaDaTinta = criarCurva(0.4, 0, 0.3, 1);

/** Quanto a luz sobe no arco do salto do pé direito à flor (unidades do desenho). */
const ALTURA_DO_SALTO = 22;
/** O tamanho em que a flor e os olhos começam a brotar (a fração do tamanho inteiro). */
const ESCALA_INICIAL = 0.55;

interface Opcoes {
  /** A tela saiu: a entrada para onde está. Quem a montou de novo (o StrictMode) a recomeça do zero. */
  sinal: AbortSignal;
  /** O contorno passou da metade: o texto sobe. Chamada uma vez (e na hora, quando o Zé aparece pronto). */
  aoMeio: () => void;
}

/** Um olho surge do tamanho de `ESCALA_INICIAL` ao inteiro em 140 ms. */
async function surgirOlho(ze: ControleDoZe, olho: 0 | 1, sinal: AbortSignal) {
  ze.olhoEscala(olho, ESCALA_INICIAL);
  ze.mostrar(olho === 0 ? 'olho0' : 'olho1');
  await andar(
    140,
    curva,
    (e) => {
      ze.olhoEscala(olho, ESCALA_INICIAL + (1 - ESCALA_INICIAL) * e);
    },
    sinal,
  );
}

/**
 * Desenha o Zé do começo ao fim (cerca de 3 s). Resolve quando o Zé está inteiro, ou quando `sinal` aborta
 * (então não mexe mais em nada: quem o abortou cuida do que vem depois).
 */
export async function desenharOZe(ze: ControleDoZe, { sinal, aoMeio }: Opcoes): Promise<void> {
  // Uma função e não `sinal.aborted` direto: o TypeScript fixaria o valor da primeira checagem para as seguintes,
  // e é justamente depois de cada espera que o sinal pode ter mudado.
  const abortado = () => sinal.aborted;
  const corpo = ze.corpo;
  // Só o movimento normal desenha: nos outros não há o que medir.
  const total = movimentoAgora() === 'normal' ? ze.comprimento() : 0;
  if (!corpo || total === 0) {
    ze.tudoVisivel();
    aoMeio();
    return;
  }
  ze.ocultarTudo();
  ze.mostrar('corpo');
  ze.prepararTraco();
  ze.acender(true);
  ze.pena(corpo.getPointAtLength(0));

  // 1. A luz desenha o contorno, de pé a pé, e o néon acende junto; o texto sobe na metade.
  let passouDaMetade = false;
  await andar(
    1200,
    curvaDaTinta,
    (e) => {
      ze.tracar(e);
      ze.pena(corpo.getPointAtLength(e * total));
      if (!passouDaMetade && e > 0.5) {
        passouDaMetade = true;
        aoMeio();
      }
    },
    sinal,
  );
  if (abortado()) return;
  ze.tracoPronto();

  // 2. A luz salta do pé direito ao braço, o miolo acende e o néon assenta; ela vira a flor.
  const fim = corpo.getPointAtLength(total);
  const [florX, florY] = PONTO_DA_FLOR;
  ze.acender(false);
  await andar(
    240,
    curvaDaViagem,
    (e) => {
      ze.miolo(e);
      ze.pena({
        x: fim.x + (florX - fim.x) * e,
        y: fim.y + (florY - fim.y) * e - Math.sin(e * Math.PI) * ALTURA_DO_SALTO,
      });
    },
    sinal,
  );
  if (abortado()) return;
  ze.mostrar('miolo');
  ze.pena(null);
  ze.florEscala(ESCALA_INICIAL);
  ze.mostrar('flor');
  await andar(
    160,
    curva,
    (e) => {
      ze.florEscala(ESCALA_INICIAL + (1 - ESCALA_INICIAL) * e);
    },
    sinal,
  );
  if (abortado()) return;
  ze.florEscala(1);

  // 3. Os olhos surgem, um depois do outro; as bochechas esquentam e o olho direito dá uma piscadela.
  await esperar(80, sinal);
  if (abortado()) return;
  void surgirOlho(ze, 0, sinal);
  await esperar(120, sinal);
  if (abortado()) return;
  await surgirOlho(ze, 1, sinal);
  if (abortado()) return;
  await andar(
    240,
    curva,
    (e) => {
      ze.bochechas(e);
    },
    sinal,
  );
  if (abortado()) return;
  ze.mostrar('bochechas');
  await esperar(260, sinal);
  if (abortado()) return;
  await ze.piscadela(1);
  if (abortado()) return;
  ze.tudoVisivel();
}
