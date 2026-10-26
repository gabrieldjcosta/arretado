import { useId, useState } from 'react';
import { Link } from 'react-router';
import {
  FIXAR_POR_DIA,
  fixarEstas,
  type EnunciadoParaFixar,
} from '../../dominios/recall/fixar-estas';
import { Dialogo } from '../componentes/Dialogo';
import { useRepositorio } from '../dados/contexto';

const frases = (n: number) => (n === 1 ? '1 frase' : `${String(n)} frases`);

/**
 * "Fixar estas": oferta opcional de levar uma lista pronta (hoje, as súmulas vinculantes) às
 * Frases. A lista inteira aparece no diálogo antes da confirmação; nada é gravado até o botão.
 */
export function FixarEstas({
  itens,
  semColecao = false,
  aoFixar,
}: {
  itens: readonly EnunciadoParaFixar[];
  /** A coleção ainda não está na Biblioteca: a oferta leva a adicioná-la. */
  semColecao?: boolean;
  /** Depois de gravar. Este cartão some com a recarga da lista, então o aviso é de quem a lista. */
  aoFixar?: (fixadas: number) => void;
}) {
  const repo = useRepositorio();
  const [aberto, setAberto] = useState(false);
  const [falha, setFalha] = useState(false);
  const idDescricao = useId();
  if (itens.length === 0 && !semColecao) return null;
  if (semColecao) {
    return (
      <section className="fixar-estas" aria-label="Fixar as súmulas vinculantes">
        <h2>Fixar as súmulas vinculantes</h2>
        <p>
          Adicione a coleção à Biblioteca e depois escolha fixar. Nada entra sem a sua confirmação.
        </p>
        <Link to="/biblioteca/acervo?tipo=sumulas" className="botao">
          Adicionar as súmulas
        </Link>
      </section>
    );
  }

  return (
    <section className="fixar-estas" aria-label="Fixar as súmulas vinculantes">
      <h2>Fixar as súmulas vinculantes</h2>
      <p>
        Uma Frase para cada súmula vinculante vigente ({itens.length}). Você vê a lista antes de
        confirmar.
      </p>
      <button
        type="button"
        className="botao"
        onClick={() => {
          setFalha(false);
          setAberto(true);
        }}
      >
        Ver a lista
      </button>
      <Dialogo
        aberto={aberto}
        aoFechar={() => {
          setAberto(false);
        }}
        titulo="Fixar as súmulas vinculantes?"
        classe="dialogo-lista"
        descritoPor={idDescricao}
      >
        <p id={idDescricao}>
          As Frases entram agora; a Revisão delas começa amanhã, {FIXAR_POR_DIA} por dia.
        </p>
        <ul className="lista-simples fixar-estas-lista" tabIndex={0} aria-label="Súmulas">
          {itens.map((i) => (
            <li key={i.dispositivoId}>
              <span>
                <strong>{i.rotulo}:</strong> {i.texto}
              </span>
            </li>
          ))}
        </ul>
        {falha && <p role="alert">Não consegui fixar agora. Tente de novo.</p>}
        <div className="linha-acoes">
          <button
            type="button"
            className="principal"
            onClick={() => {
              fixarEstas(repo, itens).then(
                (r) => {
                  setAberto(false);
                  aoFixar?.(r.fixadas);
                },
                () => {
                  setFalha(true);
                },
              );
            }}
          >
            Fixar {frases(itens.length)}
          </button>
          <button
            type="button"
            onClick={() => {
              setAberto(false);
            }}
          >
            Agora não
          </button>
        </div>
      </Dialogo>
    </section>
  );
}
