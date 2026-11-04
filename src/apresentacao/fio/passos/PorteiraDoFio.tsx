// A porteira do Fio (D-D25 §3 e §4): o passo Praticar em modo `porteira`. Três cartões de certo ou
// errado, feitos dos destaques dos artigos lidos. Sem prazo e sem perda: errar mostra a Frase certa
// e guarda com um toque; a porteira se passa respondendo os três, acertando ou não, e nunca tranca
// o caminho. A Marca desenha o laço e o gesto de arrastar; aqui estão os botões e a lógica.
import { useState } from 'react';
import type {
  CartaoCertoOuErrado,
  RespostaCertoOuErrado,
} from '../../../dominios/legislacao/lembrar';
import { CertoOuErrado } from './CertoOuErrado';
import { FraseGuardavel } from './FraseGuardavel';
import '../../recall/estilos-ache-o-erro.css';
import './passos.css';

export function PorteiraDoFio({
  cartoes,
  aoConcluir,
}: {
  cartoes: readonly CartaoCertoOuErrado[];
  aoConcluir: (resultado: { acertos: number; total: number }) => void;
}) {
  const [indice, setIndice] = useState(0);
  const [resposta, setResposta] = useState<RespostaCertoOuErrado>();
  const [acertou, setAcertou] = useState<boolean>();
  const [acertos, setAcertos] = useState(0);

  const atual = cartoes[indice];
  if (!atual) {
    return (
      <div className="coluna-drill fio-passo">
        <p>Nada para praticar aqui.</p>
        <button
          type="button"
          className="principal grande"
          onClick={() => {
            aoConcluir({ acertos: 0, total: 0 });
          }}
        >
          Seguir
        </button>
      </div>
    );
  }
  const ultimo = indice + 1 >= cartoes.length;
  const seguir = () => {
    if (!ultimo) {
      setIndice(indice + 1);
      setResposta(undefined);
      setAcertou(undefined);
      return;
    }
    aoConcluir({ acertos, total: cartoes.length });
  };

  return (
    <div className="coluna-drill fio-passo">
      {cartoes.length > 1 && (
        <p className="dica" aria-live="polite">
          {indice + 1} de {cartoes.length}
        </p>
      )}
      <article className="cartao-bloco ache-folha" aria-label="Porteira">
        <p className="ache-referencia">{atual.fonte.referencia}</p>
        <CertoOuErrado
          key={atual.fonte.dispositivoId}
          cartao={atual}
          {...(resposta === undefined ? {} : { resposta })}
          aoResponder={(r, certo) => {
            setResposta(r);
            setAcertou(certo);
            if (certo) setAcertos((n) => n + 1);
          }}
        />
        {acertou === false && <FraseGuardavel fonte={atual.fonte} />}
      </article>
      {resposta !== undefined && (
        <div className="linha-acoes acoes-drill ache-respostas">
          <button type="button" className="principal grande" onClick={seguir}>
            {ultimo ? 'Passar a porteira' : 'Seguir'}
          </button>
        </div>
      )}
    </div>
  );
}
