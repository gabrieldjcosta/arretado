// "A lei mudou" no Hoje (AP-05): uma linha por norma cujo texto mudou onde a pessoa guardou algo. Só
// leva à norma, onde estão o antes e o agora; some quando todos os avisos foram relidos. Não entra
// no Agora nem na contagem do Dia, e o texto não cobra nada.
import { Link } from 'react-router';
import { avisosDeLeiMudou } from '../../dominios/acervo/pendencias';
import { useDados } from '../dados/contexto';

export function LeiMudouNoHoje() {
  const { dados } = useDados(avisosDeLeiMudou);
  if (!dados?.length) return null;
  return (
    <section className="aviso lei-mudou-no-hoje" aria-label="A lei mudou">
      <h2>A lei mudou</h2>
      <ul className="lista-simples">
        {dados.map((a) => (
          <li key={a.normaId}>
            <span>
              {a.titulo}: o texto mudou em {a.quantos}{' '}
              {a.quantos === 1 ? 'dispositivo' : 'dispositivos'} em que você guardou algo.
            </span>
            <Link
              to={`/biblioteca/normas/${a.normaId}`}
              className="botao"
              aria-label={`Ver o que mudou em ${a.titulo}`}
            >
              Ver o que mudou
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
