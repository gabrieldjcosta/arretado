// Estado vazio do Hoje (pacote A1): nada a revisar nem a retomar, então três começos concretos.
import { Link } from 'react-router';
import type { ComecoSugerido } from '../../dominios/hoje/contrato';
import mascote from '../imagens/mascote-estudando.svg';
import './estilos-hoje.css';

export function EstadoVazio({
  comecos,
  aoVoltar,
}: {
  comecos: readonly ComecoSugerido[];
  /** Presente quando a pessoa dispensou a sugestão: volta a ela. */
  aoVoltar?: () => void;
}) {
  return (
    <section className="vazio" aria-label="Por onde começar">
      <img className="vazio-mascote" src={mascote} alt="" width={96} />
      <h2>Por onde começar?</h2>
      <p>Escolha um começo. Dá para mudar depois.</p>
      <ul className="comecos">
        {comecos.map((c, i) => (
          <li key={c.id}>
            <Link to={c.para} className={i === 0 ? 'botao principal' : 'botao'}>
              {c.rotulo}
            </Link>
          </li>
        ))}
      </ul>
      {aoVoltar && (
        <button type="button" className="agora-outra" onClick={aoVoltar}>
          Voltar à sugestão
        </button>
      )}
    </section>
  );
}
