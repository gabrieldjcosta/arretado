import { Link, useParams } from 'react-router';
import { Vazio } from '../componentes/estados';

/**
 * Importar norma (F2, 9.5). Provisória até a 2ª parte da 9.5: a colagem, o sumário e a publicação
 * do rascunho entram aqui (`/biblioteca/importar` e, para retomar, `/biblioteca/importar/:versaoId`).
 */
export function Importar() {
  const { versaoId } = useParams();
  return (
    <>
      <h1>Importar norma</h1>
      <Vazio
        titulo={versaoId ? 'Revisão da importação em construção' : 'Importação em construção'}
        acao={
          <Link to="/biblioteca" className="botao">
            Voltar à Biblioteca
          </Link>
        }
      >
        <p>
          {versaoId
            ? 'Retomar o rascunho, conferir o sumário e publicar chegam na próxima atualização.'
            : 'Colar a lei da página oficial chega na próxima atualização.'}
        </p>
      </Vazio>
    </>
  );
}
