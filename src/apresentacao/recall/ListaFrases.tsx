import { Link } from 'react-router';
import type { Repositorio } from '../../core/persistencia';
import { listarFrases } from '../../dominios/recall/servico';
import { Esqueleto, Vazio } from '../componentes/estados';
import { useDados } from '../dados/contexto';

const carregar = async (repo: Repositorio) => (await listarFrases(repo, {}, null, 200)).itens;

/**
 * Aba Frases (D9, D25, D-D5): a lista das Frases, uma por linha. Cada uma leva ao Erro que a
 * originou (é por aqui que se chega a ele, já que "Erros" deixou de ser aba) e, por "Esconder
 * trecho", ao cartão com lacuna. A lista dos Erros, com os filtros (resultado, situação,
 * "completar"), é a página `/recall/erros`, a que um link no fim desta lista leva. O link fica
 * também sem Frase nenhuma: Erro antigo, sem frase correta, só se alcança por ele.
 */
export function ListaFrases() {
  const { dados } = useDados(carregar);
  if (!dados) return <Esqueleto />;
  const verErros = (
    <p className="mais-da-lista">
      <Link to="/recall/erros" className="botao botao-texto">
        Ver os erros, com filtros
      </Link>
    </p>
  );
  if (dados.length === 0) {
    return (
      <>
        <Vazio titulo="Nenhuma frase ainda">
          <p>Ao registrar um erro, escreva a frase correta: ela aparece aqui.</p>
        </Vazio>
        {verErros}
      </>
    );
  }
  return (
    <section aria-label="Frases">
      <ul className="lista-simples frases">
        {dados.map((f) => (
          <li key={f.id}>
            <span className="texto-leitura">
              {f.erroId ? <Link to={`/recall/erros/${f.erroId}`}>{f.texto}</Link> : f.texto}
            </span>
            <Link
              to={`/recall/frases/${f.id}/cartao`}
              className="botao botao-texto"
              aria-label={`Esconder trecho: ${f.texto}`}
            >
              Esconder trecho
            </Link>
          </li>
        ))}
      </ul>
      {verErros}
    </section>
  );
}
