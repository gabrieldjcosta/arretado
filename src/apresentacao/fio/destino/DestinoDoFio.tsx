import { Link } from 'react-router';
import { useRepositorio } from '../../dados/contexto';
import { useFioGuardado } from '../dados/guardado';
import './fio-destino.css';

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

/**
 * O Destino, primeira versão (D-D25): o caminho que a pessoa já fez, um pouso atrás do outro. O mapa
 * do Nordeste com a trilha e a câmera entra nas próximas fatias; este caminho segue como a lista
 * por baixo dele, para quem prefere ler a ver.
 */
export function DestinoDoFio() {
  const repo = useRepositorio();
  const { fio } = useFioGuardado(repo.ctx.usuarioId);
  const { etapasFeitas, passosDados, pousos } = fio.estado;

  return (
    <section className="fio-destino" aria-labelledby="fio-destino-titulo">
      <span className="fio-olho">Destino</span>
      <h1 className="fio-titulo" id="fio-destino-titulo">
        {etapasFeitas === 0 ? 'O caminho começa aqui' : 'Seu caminho até aqui'}
      </h1>
      {etapasFeitas === 0 ? (
        <>
          <p className="fio-quieto">
            Cada etapa que pousa deixa um ponto no caminho. Puxe o fio no Agora para o primeiro.
          </p>
          <Link to="/" className="fio-acao">
            Ir ao Agora
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </>
      ) : (
        <>
          <p className="fio-quieto">
            {plural(etapasFeitas, 'etapa pousada', 'etapas pousadas')} ·{' '}
            {plural(passosDados, 'passo dado', 'passos dados')}
          </p>
          <ol className="fio-caminho" aria-label="Pousos, do mais recente ao mais antigo">
            {pousos.map((p) => (
              <li key={p.etapa}>
                <strong>
                  Etapa {String(p.etapa + 1)} · {p.materia}
                </strong>
                {p.fatos.length > 0 && <span>{p.fatos.join(' · ')}</span>}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
