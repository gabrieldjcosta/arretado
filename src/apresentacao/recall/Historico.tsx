import type { Repositorio } from '../../core/persistencia';
import { historicoRevisoes } from '../../dominios/recall/servico';
import { Esqueleto, Vazio } from '../componentes/estados';
import { useDados } from '../dados/contexto';
import { formatarQuando, ROTULO_RESPOSTA } from './rotulos';

async function carregar(repo: Repositorio) {
  const { itens } = await historicoRevisoes(repo, null, 100);
  const cartoes = await Promise.all(itens.map((r) => repo.colecao('cartoes').obter(r.cartaoId)));
  return itens.map((r, i) => ({ revisao: r, frente: cartoes[i]?.frente ?? '(cartão removido)' }));
}

/** Aba Histórico: revisões recentes (sem gráficos, D20). */
export function Historico() {
  const { dados } = useDados(carregar);
  if (!dados) return <Esqueleto />;
  if (dados.length === 0) return <Vazio titulo="Nenhuma revisão ainda" />;
  return (
    <section aria-label="Histórico de revisões">
      <ul className="lista-simples">
        {dados.map(({ revisao, frente }) => (
          <li key={revisao.id}>
            <span>{frente}</span>
            <span className="dica">
              {formatarQuando(revisao.em)} · {ROTULO_RESPOSTA[revisao.resposta]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
