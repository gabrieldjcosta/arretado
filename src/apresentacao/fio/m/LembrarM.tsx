import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { FonteDoItem } from '../../../dominios/legislacao/ache-o-erro';
import {
  conferirCartao,
  conferirLacuna,
  montarLembrar,
  type CartaoCertoOuErrado,
  type Lacuna,
  type LembrarDoArtigo,
  type RespostaCertoOuErrado,
} from '../../../dominios/legislacao/lembrar';
import { useRepositorio } from '../../dados/contexto';
import { referenciaDe, useCargaDoPasso } from '../passos/carregar';
import { guardarFraseDaFonte } from '../passos/guardar-frase';
import { citacaoDaFonte, rotuloSemNorma } from '../passos/lei-do-passo';
import { animar, modoAgora, SAIR, MOLA, TROCAR, useSinal } from './anima';
import { BotaoSeguir, PassoSemNada, PularPorTeclado } from './BotoesM';
import { CartaoM } from './CartaoM';
import { GestoM } from './IconesM';
import type { PropsDoPassoM, Variante } from './passo-tipos';
import { avisar } from './toast';

const fonteDe = (item: LembrarDoArtigo): FonteDoItem =>
  item.pergunta.tipo === 'lacuna' ? item.pergunta.lacuna.fonte : item.pergunta.cartao.fonte;

/** Uma resposta longa não cabe numa conta redonda: vira pílula (desvio 9 de ajustes.css). */
const LIMITE_DA_CONTA_REDONDA = 5;

interface PropsDaPergunta {
  ultima: boolean;
  /** A pessoa respondeu: o cartão já pode ser passado para o lado. */
  aoResponder: (acertou: boolean) => void;
}

/** O retorno e o rodapé chegam depois da resposta (o fim do `click` das contas no mockup). */
function useChegadaDoRetorno(chegou: boolean) {
  const retorno = useRef<HTMLDivElement>(null);
  const rodape = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!chegou) return;
    if (modoAgora() !== 'reduzido') {
      void animar(
        retorno.current?.firstElementChild,
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 260, easing: SAIR },
      );
      void animar(
        rodape.current,
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 380, delay: 120, easing: MOLA },
      );
    }
    // O botão da vez chega com o foco e, se o cartão passa da tela, a tela rola até ele (sem pulo no modo reduzido).
    const botao = rodape.current?.querySelector<HTMLElement>('button');
    botao?.focus({ preventScroll: true });
    botao?.scrollIntoView({
      block: 'nearest',
      behavior: modoAgora() === 'reduzido' ? 'auto' : 'smooth',
    });
  }, [chegou]);
  return { retorno, rodape };
}

function Rodape({
  acertou,
  ultima,
  rodape,
}: {
  acertou: boolean;
  ultima: boolean;
  rodape: RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div className="m-rodape-cartao" ref={rodape}>
        <BotaoSeguir semFaisca={!ultima}>{acertou ? 'Seguir' : 'Guardar e seguir'}</BotaoSeguir>
      </div>
      <div className="m-dica-gesto">
        <GestoM />
        acertou? passe o cartão pro lado
      </div>
    </>
  );
}

/** A pergunta de lacuna: a conta escolhida voa até o buraco da lei e a lei se completa (o mockup). */
function PerguntaDaLacuna({ lacuna, ultima, aoResponder }: PropsDaPergunta & { lacuna: Lacuna }) {
  const [voo, setVoo] = useState<{
    escolhida: string;
    fase: 'voando' | 'cheia';
    voou: boolean;
  }>();
  const lacunaEl = useRef<HTMLSpanElement>(null);
  const sinal = useSinal();
  const { fonte, inicio, fim, resposta, opcoes } = lacuna;
  const longas = opcoes.some((o) => o.length > LIMITE_DA_CONTA_REDONDA) || resposta.length > 12;
  const mostrando = voo?.fase === 'cheia';
  const acertou = voo !== undefined && conferirLacuna(lacuna, voo.escolhida);
  const { retorno, rodape } = useChegadaDoRetorno(mostrando);

  // A lacuna se completa e o grifo acende (`lac.classList.add('aceso')` depois de forçar o layout). A classe
  // entra direto no elemento: o `className` do React não a conhece e, por isso, não a desfaz.
  const fase = voo?.fase;
  useLayoutEffect(() => {
    const buraco = lacunaEl.current;
    if (fase !== 'cheia' || !buraco) return;
    buraco.getBoundingClientRect();
    buraco.classList.add('m-aceso');
  }, [fase]);

  async function escolher(opcao: string, botao: HTMLButtonElement) {
    if (voo) return;
    const modo = modoAgora();
    const voou = modo === 'normal';
    setVoo({ escolhida: opcao, fase: 'voando', voou });
    aoResponder(conferirLacuna(lacuna, opcao));
    const buraco = lacunaEl.current;
    if (voou && buraco) {
      const rb = botao.getBoundingClientRect();
      const rl = buraco.getBoundingClientRect();
      const dx = rl.left + rl.width / 2 - rb.left - rb.width / 2;
      const dy = rl.top + rl.height / 2 - rb.top - rb.height / 2;
      await animar(
        botao,
        [
          { transform: 'none' },
          { transform: `translate(${String(dx)}px, ${String(dy)}px) scale(.42)`, opacity: 0.9 },
        ],
        { duration: 460, easing: TROCAR },
      );
    }
    if (!sinal().aborted) setVoo({ escolhida: opcao, fase: 'cheia', voou });
  }

  return (
    <>
      <h2 style={{ margin: '4px 0 14px' }}>Agora sem olhar.</h2>
      <div className="m-lei">
        <p>
          <span className="m-art">{rotuloSemNorma(fonte.referencia)}.</span>{' '}
          {fonte.texto.slice(0, inicio)}
          <span
            ref={lacunaEl}
            className={['m-lacuna', longas && 'm-longa', mostrando && 'm-cheia m-grifo']
              .filter(Boolean)
              .join(' ')}
            style={
              mostrando
                ? {
                    transition: voo.voou
                      ? 'background-size 420ms cubic-bezier(.2,.7,.2,1)'
                      : 'none',
                  }
                : undefined
            }
          >
            {mostrando ? resposta : ' '}
          </span>
          {fonte.texto.slice(fim)}
        </p>
      </div>
      <div
        className={longas ? 'm-contas m-longas' : 'm-contas'}
        role="group"
        aria-label="Escolha o que a lei diz"
      >
        {opcoes.map((opcao) => {
          const escolhida = voo?.escolhida === opcao;
          const certa = mostrando && conferirLacuna(lacuna, opcao);
          return (
            <button
              key={opcao}
              type="button"
              data-op={opcao}
              disabled={voo !== undefined}
              className={[
                'm-bolinha',
                longas && 'm-longa',
                certa && 'm-certa',
                voo !== undefined && !escolhida && !certa && 'm-some',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                voo?.voou === true && mostrando && escolhida ? { visibility: 'hidden' } : undefined
              }
              onClick={(e) => {
                void escolher(opcao, e.currentTarget);
              }}
            >
              {opcao}
            </button>
          );
        })}
      </div>
      <div className="m-retorno" aria-live="polite" ref={retorno}>
        {mostrando &&
          (acertou ? (
            <p className="m-ok">Isso. É {resposta}.</p>
          ) : (
            <div className="m-frase">
              <span className="m-rot">
                Você marcou {voo.escolhida} · a Frase certa, tirada da lei
              </span>
              {fonte.texto} ({citacaoDaFonte(fonte.referencia)})
            </div>
          ))}
      </div>
      <div className="m-vazio" />
      {!mostrando && <PularPorTeclado />}
      {mostrando && <Rodape acertou={acertou} ultima={ultima} rodape={rodape} />}
    </>
  );
}

const NOME_DA_RESPOSTA: Record<RespostaCertoOuErrado, string> = {
  certo: 'Está certa',
  errado: 'Tem algo trocado',
};

/** O texto da lei com a troca à vista: a palavra falsa riscada e a da lei grifada (o "Ache o erro"). */
function TextoComATroca({ cartao }: { cartao: CartaoCertoOuErrado }) {
  const t = cartao.troca;
  if (!t) return <>{cartao.fonte.texto}</>;
  const fim = t.inicio + t.substituto.length;
  return (
    <>
      {cartao.mostrado.slice(0, t.inicio)}
      <span className="m-palavra m-errada">{t.substituto}</span>
      <span className="m-troca">{t.original}</span>
      {cartao.mostrado.slice(fim)}
    </>
  );
}

/** A pergunta de certo ou errado, para a norma que não dá três opções boas: a frase, duas contas. */
function PerguntaDoCartao({
  cartao,
  ultima,
  aoResponder,
}: PropsDaPergunta & { cartao: CartaoCertoOuErrado }) {
  const [resposta, setResposta] = useState<RespostaCertoOuErrado>();
  const acertou = resposta !== undefined && conferirCartao(cartao, resposta);
  const { retorno, rodape } = useChegadaDoRetorno(resposta !== undefined);
  const { fonte } = cartao;

  return (
    <>
      <h2 style={{ margin: '4px 0 14px' }}>Agora sem olhar.</h2>
      <div className="m-lei">
        <p>
          <span className="m-art">{rotuloSemNorma(fonte.referencia)}.</span>{' '}
          {resposta === undefined ? cartao.mostrado : <TextoComATroca cartao={cartao} />}
        </p>
      </div>
      <p className="m-porque" style={{ margin: '14px 0 0' }}>
        Esta frase está como na lei?
      </p>
      <div className="m-contas m-longas" role="group" aria-label="Esta frase está como na lei?">
        {(['certo', 'errado'] as const).map((r) => (
          <button
            key={r}
            type="button"
            data-op={r}
            disabled={resposta !== undefined}
            className={[
              'm-bolinha',
              'm-longa',
              resposta !== undefined && conferirCartao(cartao, r) && 'm-certa',
              resposta !== undefined && !conferirCartao(cartao, r) && r !== resposta && 'm-some',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              setResposta(r);
              aoResponder(conferirCartao(cartao, r));
            }}
          >
            {NOME_DA_RESPOSTA[r]}
          </button>
        ))}
      </div>
      <div className="m-retorno" aria-live="polite" ref={retorno}>
        {resposta !== undefined &&
          (acertou ? (
            <p className="m-ok">
              {cartao.troca ? 'Isso. Havia uma troca.' : 'Isso. Estava certa.'}
            </p>
          ) : (
            <div className="m-frase">
              <span className="m-rot">
                Você marcou “{NOME_DA_RESPOSTA[resposta]}” · a Frase certa, tirada da lei
              </span>
              {fonte.texto} ({citacaoDaFonte(fonte.referencia)})
            </div>
          ))}
      </div>
      <div className="m-vazio" />
      {resposta === undefined && <PularPorTeclado />}
      {resposta !== undefined && <Rodape acertou={acertou} ultima={ultima} rodape={rodape} />}
    </>
  );
}

/**
 * O passo Lembrar, a tela `lembrar` do mockup: "Agora sem olhar." A lei com um buraco, três contas num fio,
 * e a escolhida voa até o buraco. Acertou: "Seguir". Errou: a Frase certa, tirada da lei, e "Guardar e seguir"
 * (um toque, a Frase vai ao caderno). Vários artigos no passo: uma pergunta por artigo, no mesmo cartão.
 */
export function LembrarM({
  passo,
  semente,
  trilho,
  aoConcluir,
  aoPular,
  aoPausar,
}: PropsDoPassoM<Variante<'lembrar'>>) {
  const repo = useRepositorio();
  const chave = `lembrar|${passo.normaId}|${passo.artigos.map((a) => a.endereco).join(',')}|${String(semente)}`;
  const carga = useCargaDoPasso(chave, (r) =>
    montarLembrar(r, { normaId: passo.normaId, artigos: passo.artigos }, referenciaDe, semente),
  );
  const perguntas = carga.estado === 'pronto' ? carga.dados : [];
  const [indice, setIndice] = useState(0);
  const [acertou, setAcertou] = useState<boolean>();
  const soma = useRef({ acertos: 0, erros: [] as string[], guardados: [] as string[] });
  const atual = perguntas[indice];
  const ultima = indice + 1 >= perguntas.length;
  const sinal = useSinal();

  const responder = (item: LembrarDoArtigo, certo: boolean) => {
    setAcertou(certo);
    if (certo) soma.current.acertos += 1;
    else soma.current.erros.push(item.artigoEndereco);
  };

  /** O cartão já saiu: guarda a Frase de quem errou e vai à pergunta seguinte, ou fecha o passo. */
  const seguir = async () => {
    if (!atual) return;
    if (acertou === false) {
      try {
        await guardarFraseDaFonte(repo, fonteDe(atual));
        soma.current.guardados.push(atual.artigoEndereco);
        if (!ultima) avisar('Frase guardada');
      } catch {
        avisar('Não deu para guardar a Frase agora. Nada foi perdido.');
      }
    }
    if (sinal().aborted) return;
    if (!ultima) {
      setIndice((i) => i + 1);
      setAcertou(undefined);
      return;
    }
    const { acertos, erros, guardados } = soma.current;
    aoConcluir({
      tipo: 'lembrar',
      acertos,
      erros,
      ...(guardados.length > 0 ? { guardados } : {}),
    });
  };

  const vazio = carga.estado === 'falhou' || (carga.estado === 'pronto' && perguntas.length === 0);
  const etiqueta =
    perguntas.length > 1
      ? `Lembrar · ${String(indice + 1)} de ${String(perguntas.length)}`
      : 'Lembrar';

  let conteudo: ReactNode;
  if (vazio) {
    conteudo = (
      <>
        <h2 style={{ margin: '4px 0 14px' }}>Agora sem olhar.</h2>
        <PassoSemNada texto="Nada para lembrar neste passo." />
      </>
    );
  } else if (!atual) {
    conteudo = (
      <>
        <h2 style={{ margin: '4px 0 14px' }}>Agora sem olhar.</h2>
        <div className="m-lei">
          <p>…</p>
        </div>
        <div className="m-vazio" />
      </>
    );
  } else if (atual.pergunta.tipo === 'lacuna') {
    conteudo = (
      <PerguntaDaLacuna
        key={indice}
        lacuna={atual.pergunta.lacuna}
        ultima={ultima}
        aoResponder={(certo) => {
          responder(atual, certo);
        }}
      />
    );
  } else {
    conteudo = (
      <PerguntaDoCartao
        key={indice}
        cartao={atual.pergunta.cartao}
        ultima={ultima}
        aoResponder={(certo) => {
          responder(atual, certo);
        }}
      />
    );
  }

  return (
    <CartaoM
      nome="lembrar"
      etiqueta={etiqueta}
      carimbo="FEITO"
      resolvido={acertou !== undefined}
      aoSeguir={() => void seguir()}
      aoPular={aoPular}
      aoPausar={aoPausar}
      trilho={trilho}
      entrada={indice}
    >
      {conteudo}
    </CartaoM>
  );
}
