import { Navigate } from 'react-router';
import { Esqueleto } from '../../componentes/estados';
import { useFio } from '../dados/useFio';
import './fio-etapa.css';

/**
 * O pouso (D-D25): a etapa fecha com os fatos do que foi feito, em frases curtas e sem placar. Passo
 * pulado não deixa fato. Pousar conta a etapa; o próximo puxão planeja a seguinte.
 */
export function PousoDoFio() {
  const fio = useFio();
  const { avanco } = fio;
  if (fio.falhou) {
    return (
      <p className="fio-quieto" role="alert">
        Não deu para ler seus dados agora. Nada se perdeu; tente de novo em instantes.
      </p>
    );
  }
  if (!avanco) return <Esqueleto linhas={3} />;
  if (avanco.proximo.tipo !== 'pouso') return <Navigate to="/" replace />;

  const { pouso } = avanco.proximo;
  return (
    <section className="fio-etapa fio-pouso" aria-labelledby="fio-pouso-titulo">
      <span className="fio-olho">
        Etapa {String(pouso.etapa + 1)} · {pouso.materia}
      </span>
      <h1 className="fio-titulo" id="fio-pouso-titulo">
        Pousou.
      </h1>
      {pouso.fatos.length > 0 ? (
        <ul className="fio-fatos">
          {pouso.fatos.map((fato) => (
            <li key={fato}>{fato}</li>
          ))}
        </ul>
      ) : (
        <p className="fio-quieto">Esta etapa passou sem deixar fato. Tudo bem: o fio segue.</p>
      )}
      <button
        type="button"
        className="fio-acao"
        onClick={() => {
          fio.pousarEtapa();
        }}
      >
        Pousar
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </section>
  );
}
