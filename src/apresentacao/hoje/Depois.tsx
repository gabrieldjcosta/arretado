// "Em seguida" do Hoje (pacote B4; D-D7, P3): até dois itens depois do Agora, só para saber o que vem.
// Texto sobre a areia, sem botão: a ação é uma só por tela, e "Escolher outra coisa" já traz o próximo.
import type { ProximaAcao } from '../../dominios/hoje/contrato';
import { tituloDaAcao } from './textos-da-acao';
import './estilos-hoje.css';

export function Depois({ acoes }: { acoes: readonly ProximaAcao[] }) {
  if (acoes.length === 0) return null;
  return (
    <section className="em-seguida" aria-labelledby="em-seguida-titulo">
      <h2 id="em-seguida-titulo" className="em-seguida-titulo">
        Em seguida
      </h2>
      <ul className="em-seguida-lista">
        {acoes.map((acao) => (
          <li key={acao.tipo}>
            <span className="em-seguida-nome">{tituloDaAcao(acao)}</span>
            {acao.estimativaMin !== undefined && (
              <span className="em-seguida-tempo">cerca de {acao.estimativaMin} min</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
