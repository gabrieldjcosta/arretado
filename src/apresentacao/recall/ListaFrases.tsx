import { Link } from 'react-router';
import type { Repositorio } from '../../core/persistencia';
import { listarFrases } from '../../dominios/recall/servico';
import { Esqueleto, Vazio } from '../componentes/estados';
import { useDados } from '../dados/contexto';

const carregar = async (repo: Repositorio) => (await listarFrases(repo, {}, null, 200)).itens;

/** Lista das Frases, uma por linha (D9, D25); cada uma leva ao cartão com lacuna. */
export function ListaFrases() {
  const { dados } = useDados(carregar);
  if (!dados) return <Esqueleto />;
  if (dados.length === 0) {
    return (
      <Vazio titulo="Nenhuma frase ainda">
        <p>Ao registrar um erro, escreva a frase correta: ela aparece aqui.</p>
      </Vazio>
    );
  }
  return (
    <section aria-label="Frases">
      <ul className="lista-simples frases texto-leitura">
        {dados.map((f) => (
          <li key={f.id}>
            {f.erroId ? <Link to={`/recall/erros/${f.erroId}`}>{f.texto}</Link> : f.texto}{' '}
            <Link
              to={`/recall/frases/${f.id}/cartao`}
              className="discreto"
              aria-label={`Esconder trecho: ${f.texto}`}
            >
              Esconder trecho
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
