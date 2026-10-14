// Ao fechar: o que ficou no estacionamento, para marcar como resolvido (A3a). Opcional e sem pressão.
import type { Sessao } from '../../../core/modelo';
import { resolverNota } from '../../../dominios/sessao/estacionamento';
import { useRepositorio } from '../../dados/contexto';
import './estilos-alavancas.css';

export function NotasDoEstacionamento({ sessao }: { sessao: Sessao }) {
  const repo = useRepositorio();
  const notas = sessao.estacionamento ?? [];
  if (notas.length === 0) return null;
  return (
    <section className="alavanca" aria-labelledby="notas-titulo">
      <h2 id="notas-titulo">Ficou no estacionamento</h2>
      <ul className="estacionamento-lista sem-marcador">
        {notas.map((n, i) => (
          <li key={n.em}>
            <label>
              <input
                type="checkbox"
                checked={Boolean(n.resolvidaEm)}
                onChange={(e) => {
                  void resolverNota(repo, sessao.id, i, e.target.checked);
                }}
              />
              {n.texto}
            </label>
          </li>
        ))}
      </ul>
      <p className="dica">Marque o que já resolveu. O resto fica guardado nesta Sessão.</p>
    </section>
  );
}
