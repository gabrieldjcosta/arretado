// O passo Lembrar do Fio (D-D25): para cada artigo lido, a lacuna tirada do destaque com três
// opções da própria norma (ou, se a norma não dá opções, o certo ou errado do mesmo texto). Não
// grava nada: devolve quantas a pessoa acertou e os artigos que errou, e o Guardar cuida do resto.
// A Marca refina o desenho (cartão da lacuna, a resposta como conta no fio); a lógica não muda.
import { useState } from 'react';
import {
  conferirLacuna,
  type Lacuna,
  type LembrarDoArtigo,
  type RespostaCertoOuErrado,
} from '../../../dominios/legislacao/lembrar';
import { CertoOuErrado } from './CertoOuErrado';
import '../../recall/estilos-ache-o-erro.css';
import './passos.css';

export interface ResultadoDoLembrar {
  acertos: number;
  /** Endereços dos artigos que a pessoa errou (o Guardar parte deles). */
  erros: readonly string[];
}

function TextoDaLacuna({ lacuna, revelar }: { lacuna: Lacuna; revelar: boolean }) {
  const { texto } = lacuna.fonte;
  return (
    <p className="ache-texto">
      {texto.slice(0, lacuna.inicio)}
      {revelar ? (
        <ins className="ache-ins">{lacuna.resposta}</ins>
      ) : (
        <span className="fio-tarja" role="img" aria-label="trecho escondido">
          {' '.repeat(Math.min(12, Math.max(4, lacuna.resposta.length)))}
        </span>
      )}
      {texto.slice(lacuna.fim)}
    </p>
  );
}

type Resposta = { tipo: 'lacuna'; opcao: string } | { tipo: 'cartao'; r: RespostaCertoOuErrado };

export function LembrarDoFio({
  perguntas,
  aoConcluir,
}: {
  perguntas: readonly LembrarDoArtigo[];
  aoConcluir: (resultado: ResultadoDoLembrar) => void;
}) {
  const [indice, setIndice] = useState(0);
  const [resposta, setResposta] = useState<Resposta>();
  const [acertos, setAcertos] = useState(0);
  const [erros, setErros] = useState<readonly string[]>([]);

  const atual = perguntas[indice];
  if (!atual) {
    return (
      <div className="coluna-drill fio-passo">
        <p>Nada para lembrar neste passo.</p>
        <button
          type="button"
          className="principal grande"
          onClick={() => {
            aoConcluir({ acertos: 0, erros: [] });
          }}
        >
          Seguir
        </button>
      </div>
    );
  }

  const registrar = (acertou: boolean, r: Resposta) => {
    setResposta(r);
    if (acertou) setAcertos((n) => n + 1);
    else setErros((e) => [...e, atual.artigoEndereco]);
  };
  const seguir = () => {
    if (indice + 1 < perguntas.length) {
      setIndice(indice + 1);
      setResposta(undefined);
      return;
    }
    aoConcluir({ acertos, erros });
  };
  const p = atual.pergunta;
  const fonte = p.tipo === 'lacuna' ? p.lacuna.fonte : p.cartao.fonte;

  return (
    <div className="coluna-drill fio-passo">
      <p className="dica" aria-live="polite">
        {indice + 1} de {perguntas.length}
      </p>
      <article className="cartao-bloco ache-folha" aria-label="Lembrar">
        <p className="ache-referencia">{fonte.referencia}</p>
        {p.tipo === 'lacuna' ? (
          resposta === undefined ? (
            <>
              <p className="ache-instrucao">O que a lei diz neste lugar?</p>
              <TextoDaLacuna lacuna={p.lacuna} revelar={false} />
              <div className="linha-acoes acoes-drill ache-respostas">
                {p.lacuna.opcoes.map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    className="principal grande"
                    onClick={() => {
                      registrar(conferirLacuna(p.lacuna, opcao), { tipo: 'lacuna', opcao });
                    }}
                  >
                    {opcao}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div aria-live="polite">
              <p className="ache-instrucao" role="status">
                {resposta.tipo === 'lacuna' && conferirLacuna(p.lacuna, resposta.opcao)
                  ? 'Isso.'
                  : 'A lei diz:'}
              </p>
              <TextoDaLacuna lacuna={p.lacuna} revelar />
            </div>
          )
        ) : (
          <CertoOuErrado
            cartao={p.cartao}
            {...(resposta?.tipo === 'cartao' ? { resposta: resposta.r } : {})}
            aoResponder={(r, acertou) => {
              registrar(acertou, { tipo: 'cartao', r });
            }}
          />
        )}
      </article>
      {resposta !== undefined && (
        <div className="linha-acoes acoes-drill ache-respostas">
          <button type="button" className="principal grande" onClick={seguir}>
            {indice + 1 < perguntas.length ? 'Seguir' : 'Concluir'}
          </button>
        </div>
      )}
    </div>
  );
}
