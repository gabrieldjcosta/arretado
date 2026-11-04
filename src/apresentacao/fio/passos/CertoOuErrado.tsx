// Um cartão de certo ou errado do Fio (a porteira e a queda da lacuna): a frase como a tela a
// mostra, duas respostas e, depois de responder, o que a lei diz. A frase falsa nunca é gravada.
import { useEffect, useRef } from 'react';
import type {
  CartaoCertoOuErrado,
  RespostaCertoOuErrado,
} from '../../../dominios/legislacao/lembrar';
import { conferirCartao } from '../../../dominios/legislacao/lembrar';
import { tic } from '../toque';

/** O texto depois de responder: a troca riscada ao lado do que a lei diz. */
function TextoDepois({ cartao }: { cartao: CartaoCertoOuErrado }) {
  const t = cartao.troca;
  if (!t) return <p className="ache-texto">{cartao.fonte.texto}</p>;
  const fim = t.inicio + t.substituto.length;
  return (
    <p className="ache-texto">
      {cartao.mostrado.slice(0, t.inicio)}
      <del className="ache-del">{t.substituto}</del> <ins className="ache-ins">{t.original}</ins>
      {cartao.mostrado.slice(fim)}
    </p>
  );
}

export function CertoOuErrado({
  cartao,
  resposta,
  aoResponder,
}: {
  cartao: CartaoCertoOuErrado;
  /** Ausente: ainda perguntando. */
  resposta?: RespostaCertoOuErrado;
  aoResponder: (resposta: RespostaCertoOuErrado, acertou: boolean) => void;
}) {
  const aviso = useRef<HTMLParagraphElement>(null);
  const acertouAgora = resposta !== undefined && conferirCartao(cartao, resposta);
  useEffect(() => {
    if (acertouAgora) tic(aviso.current);
  }, [acertouAgora]);
  const responder = (r: RespostaCertoOuErrado) => {
    aoResponder(r, conferirCartao(cartao, r));
  };
  if (resposta === undefined) {
    return (
      <>
        <p className="ache-instrucao">Esta frase está como na lei?</p>
        <p className="ache-texto">{cartao.mostrado}</p>
        <div className="linha-acoes acoes-drill ache-respostas">
          <button
            type="button"
            className="principal grande"
            onClick={() => {
              responder('certo');
            }}
          >
            Está certa
          </button>
          <button
            type="button"
            className="principal grande"
            onClick={() => {
              responder('errado');
            }}
          >
            Tem algo trocado
          </button>
        </div>
      </>
    );
  }
  const acertou = conferirCartao(cartao, resposta);
  return (
    <div aria-live="polite">
      <p className="ache-instrucao" role="status" ref={aviso}>
        {acertou
          ? cartao.troca
            ? 'Isso. Havia uma troca.'
            : 'Isso. Estava certa como está.'
          : cartao.troca
            ? 'Havia uma troca. A lei diz:'
            : 'Estava certa como está. A lei diz:'}
      </p>
      <TextoDepois cartao={cartao} />
    </div>
  );
}
