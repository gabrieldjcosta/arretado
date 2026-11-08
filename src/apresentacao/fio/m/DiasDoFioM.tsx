import { fraseDaSequencia, sequenciaDoFio } from '../../../dominios/dia/sequencia';
import { useDadosDoFio } from '../dados/sem-vazio';

/**
 * A sequência que dobra (aprovada pelo Gabriel em 05/11/2026): os últimos dias no fio, cada um estudo (ponto
 * dourado) ou descanso (contorno azul). Descanso não é falta e não tem cor de alerta; o total só cresce.
 */
export function DiasDoFioM() {
  const { dados } = useDadosDoFio('dias-do-fio', sequenciaDoFio);
  if (!dados) return null;
  return (
    <section className="m-dias-fio" aria-label="Seus dias de estudo">
      <ul className="m-dias-fio-fila">
        {dados.dias.map((d) => (
          <li
            key={d.data}
            className="m-dia-fio"
            data-estado={d.estado}
            aria-label={`${d.data.slice(8)}/${d.data.slice(5, 7)}: ${d.estado === 'estudo' ? 'estudo' : 'descanso'}`}
          />
        ))}
      </ul>
      <p className="m-quieto">{fraseDaSequencia(dados)}</p>
      <p className="m-dias-fio-regra">
        Dia sem estudo vira <b>descanso</b>. O total de dias de estudo <b>nunca diminui</b>.
      </p>
    </section>
  );
}
