import { Fragment, useEffect, useRef, useState } from 'react';
import { conferir } from '../../../dominios/legislacao/ache-o-erro';
import type { AlvoDaPorteira } from '../passos/alvo-da-porteira';
import { itemDoAche, pedacos } from '../passos/ache';
import { rotuloSemNorma } from '../passos/lei-do-passo';
import { useCargaDoPasso } from '../passos/carregar';
import { animar, cancelarAnimacoes, modoAgora, MOLA } from './anima';
import { BotaoPular, BotaoSeguir, PassoSemNada } from './BotoesM';
import { CartaoM } from './CartaoM';
import type { PropsDoPassoM, Variante } from './passo-tipos';
import { avisar } from './toast';

/**
 * O passo Ache o erro (o `achar` do mockup): uma palavra da lei está trocada; a pessoa toca nela. Errar uma
 * vez avisa e deixa tentar de novo; na segunda, ou ao acertar, a troca aparece. Nada se perde.
 */
export function AcheOErroM({
  semente,
  alvo,
  trilho,
  aoConcluir,
  aoPular,
  aoPausar,
}: PropsDoPassoM<Variante<'praticar'>> & { alvo: AlvoDaPorteira }) {
  const chave = `ache|${alvo.normaId}|${alvo.artigos.map((a) => a.endereco).join(',')}|${String(semente)}`;
  const carga = useCargaDoPasso(chave, (repo) => itemDoAche(repo, alvo, semente));
  const item = carga.estado === 'pronto' ? carga.dados : undefined;
  const [achou, setAchou] = useState<boolean>();
  const [tentativas, setTentativas] = useState(0);
  const [tentou, setTentou] = useState<ReadonlySet<number>>(new Set());
  const troca = useRef<HTMLSpanElement>(null);
  const rodape = useRef<HTMLDivElement>(null);
  const vazio = carga.estado === 'falhou' || (carga.estado === 'pronto' && !item);

  // A troca entra crescendo e o "Seguir" sobe, como no mockup.
  useEffect(() => {
    if (achou === undefined || modoAgora() === 'reduzido') return;
    const t = troca.current;
    const r = rodape.current;
    void animar(
      t,
      [
        { transform: 'scale(.3)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      {
        duration: 420,
        easing: MOLA,
      },
    ).then(() => {
      cancelarAnimacoes(t);
    });
    void animar(
      r,
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 380, easing: MOLA },
    ).then(() => {
      cancelarAnimacoes(r);
    });
  }, [achou]);

  function tocar(el: HTMLElement, inicio: number, fim: number) {
    if (!item || achou !== undefined) return;
    if (conferir(item, { tipo: 'tocou', inicio, fim })) {
      setAchou(true);
      return;
    }
    setTentou((s) => new Set(s).add(inicio));
    if (modoAgora() !== 'reduzido') {
      void animar(
        el,
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(3px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 220 },
      ).then(() => {
        cancelarAnimacoes(el);
      });
    }
    if (tentativas === 0) {
      setTentativas(1);
      avisar('Essa está certa. Procure de novo.');
      return;
    }
    setAchou(false);
  }

  const t = item?.troca;
  return (
    <CartaoM
      nome="achar"
      etiqueta="Ache o erro"
      carimbo="ACHEI"
      resolvido={achou !== undefined}
      aoSeguir={() => {
        aoConcluir({ tipo: 'praticar', acertos: achou === true ? 1 : 0, total: item ? 1 : 0 });
      }}
      aoPular={aoPular}
      aoPausar={aoPausar}
      trilho={trilho}
    >
      <h2 style={{ margin: '4px 0 4px' }}>Uma palavra está trocada. Toque nela.</h2>
      <p className="m-porque">
        <span className="m-ponto-azul" />É assim que a FCC cobra: a lei quase igual.
      </p>
      {vazio && <PassoSemNada texto="Nada para praticar aqui." />}
      {carga.estado === 'carregando' && <p className="m-quieto">…</p>}
      {item && t && (
        <>
          <div className="m-lei">
            <p>
              <span className="m-art">{rotuloSemNorma(item.referencia)}.</span>{' '}
              {pedacos(item).map((p, i, todos) => (
                <Fragment key={p.inicio}>
                  <button
                    type="button"
                    className={[
                      'm-palavra',
                      achou !== undefined && p.troca && 'm-errada',
                      tentou.has(p.inicio) && 'm-tentou',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={(e) => {
                      tocar(e.currentTarget, p.inicio, p.fim);
                    }}
                  >
                    {p.texto}
                  </button>
                  {p.troca && !todos[i + 1]?.troca && achou !== undefined && (
                    <span className="m-troca" ref={troca}>
                      {t.original}
                    </span>
                  )}
                  {(todos[i + 1]?.inicio ?? p.fim) > p.fim ? ' ' : null}
                </Fragment>
              ))}
            </p>
          </div>
          <div className="m-retorno" aria-live="polite">
            {achou === true && (
              <p className="m-ok">
                Achou. A lei diz “{t.original}”, não “{t.substituto}”.
              </p>
            )}
            {achou === false && (
              <div className="m-frase">
                <span className="m-rot">A troca estava aqui</span>A lei diz “{t.original}”, não “
                {t.substituto}”.
              </div>
            )}
          </div>
          <div className="m-vazio" />
          <div className="m-rodape-cartao" ref={rodape}>
            {achou === undefined ? <BotaoPular /> : <BotaoSeguir>Seguir</BotaoSeguir>}
          </div>
        </>
      )}
    </CartaoM>
  );
}
