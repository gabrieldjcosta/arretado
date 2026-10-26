import { useId, useState } from 'react';
import { Link } from 'react-router';
import {
  FIXAR_POR_DIA,
  fixarEstas,
  type EnunciadoParaFixar,
} from '../../dominios/recall/fixar-estas';
import { Dialogo } from '../componentes/Dialogo';
import { useRepositorio } from '../dados/contexto';

const PREVIA = 140;
const previa = (t: string) => (t.length > PREVIA ? `${t.slice(0, PREVIA).trimEnd()}…` : t);

/**
 * "Fixar estas": oferta opcional de levar uma lista pronta (hoje, as súmulas vinculantes) às
 * Frases. A lista inteira aparece no diálogo antes da confirmação; nada é gravado até o botão.
 */
export function FixarEstas({
  itens,
  semColecao = false,
}: {
  itens: readonly EnunciadoParaFixar[];
  /** A coleção ainda não está na Biblioteca: a oferta leva a adicioná-la. */
  semColecao?: boolean;
}) {
  const repo = useRepositorio();
  const [aberto, setAberto] = useState(false);
  const [falha, setFalha] = useState(false);
  const [anuncio, setAnuncio] = useState('');
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
  const dias = Math.ceil(itens.length / FIXAR_POR_DIA);

  return (
    <section className="fixar-estas" aria-label="Fixar as súmulas vinculantes">
      <h2>Fixar as súmulas vinculantes</h2>
      <p>
        {itens.length} enunciados que a prova costuma cobrar. Você vê a lista antes de confirmar.
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
      <p role="status" className="visualmente-oculto">
        {anuncio}
      </p>
      <Dialogo
        aberto={aberto}
        aoFechar={() => {
          setAberto(false);
        }}
        titulo="Fixar as súmulas vinculantes?"
        descritoPor={idDescricao}
      >
        <p id={idDescricao}>
          Entram {itens.length} frases, {FIXAR_POR_DIA} por dia a partir de amanhã (cerca de {dias}{' '}
          dias). Nada muda até você confirmar, e dá para apagar cada frase depois.
        </p>
        <ul className="lista-simples fixar-estas-lista" tabIndex={0} aria-label="Súmulas">
          {itens.map((i) => (
            <li key={i.dispositivoId}>
              <strong>{i.rotulo}</strong> {previa(i.texto)}
            </li>
          ))}
        </ul>
        {falha && <p role="alert">Não consegui fixar agora. Tente de novo.</p>}
        <div className="linha-acoes">
          <button
            type="button"
            className="botao"
            onClick={() => {
              fixarEstas(repo, itens).then(
                (r) => {
                  setAnuncio(`${String(r.fixadas)} frases fixadas.`);
                  setAberto(false);
                },
                () => {
                  setFalha(true);
                },
              );
            }}
          >
            Fixar {itens.length} frases
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
