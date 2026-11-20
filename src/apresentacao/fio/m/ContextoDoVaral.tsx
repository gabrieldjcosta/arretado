import { Link, useNavigate } from 'react-router';
import { descreverPasso } from '../dados/descrever';
import { useFio } from '../dados/useFio';
import { resumoDoMapa } from '../destino/resumo';
import { useJornadaDoFio } from '../destino/useJornadaDoFio';
import type { DadosDoVaral } from './varal-dados';

/**
 * O painel ao lado do Varal no monitor (layout B, 17/11/2026): onde a pessoa parou, o que vem na ponta do fio e quanto da prova
 * já é dela. Só lê o que o Agora e o Destino já sabem e leva a eles; não guarda nada. Monta de 1100 px para cima (a
 * pessoa que não tem lugar para ele vê o Varal como sempre).
 */
export function ContextoDoVaral({ dados }: { dados: DadosDoVaral | undefined }) {
  const navegar = useNavigate();
  const { avanco } = useFio();
  const { entrada } = useJornadaDoFio();
  const proximo = avanco?.proximo;
  const materia = avanco?.estado.etapa?.materia ?? '';
  const ponta =
    proximo?.tipo === 'passo'
      ? descreverPasso(proximo.passo, materia)
      : proximo?.tipo === 'pouso'
        ? {
            titulo: `Etapa ${String(proximo.pouso.etapa + 1)} pronta para pousar`,
            apoio: proximo.pouso.materia,
          }
        : undefined;
  const minutos = ponta && 'minutos' in ponta ? ponta.minutos : undefined;
  const mapa = resumoDoMapa(entrada);

  return (
    <aside className="m-contexto" aria-label="Seu contexto">
      {dados?.retomar && dados.retomarPara && (
        <section className="m-proximo m-contexto-cartao" aria-label="Retomar">
          <span className="m-olho">Retomar</span>
          <strong>{dados.retomar}</strong>
          {dados.retomarQuando && <span>parou {dados.retomarQuando}</span>}
          <button
            type="button"
            className="m-acao m-contexto-acao"
            onClick={() => {
              void navegar(dados.retomarPara ?? '/');
            }}
          >
            Continuar
          </button>
        </section>
      )}
      {ponta && (
        <Link to="/" className="m-proximo m-contexto-cartao">
          <span className="m-olho">Na ponta do fio</span>
          <strong>{ponta.titulo}</strong>
          <span>{ponta.apoio}</span>
          {minutos !== undefined && <span className="m-min">{String(minutos)} min</span>}
        </Link>
      )}
      {mapa && (
        <Link to="/destino" className="m-proximo m-contexto-cartao">
          <span className="m-olho">Sua prova</span>
          <span className="m-contexto-barra" aria-hidden="true">
            <i style={{ width: `${String(mapa.percentual)}%` }} />
          </span>
          <span>{mapa.percentual}% da prova é seu</span>
        </Link>
      )}
    </aside>
  );
}
