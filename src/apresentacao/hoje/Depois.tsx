// "Em seguida" do Hoje (pacote B4; D-D7, P3; D-D9, Q5): o que vem depois do Agora, num <details> nativo e
// subordinado a ele (sem botão de ação, sombra nem fundo). Fechado: o rótulo, a primeira atividade e a
// seta. Aberto: a lista e, por atividade, o "Trocar", que abre as atividades com algo a fazer hoje.
// Trocar só muda a ordem desta visita (nada é gravado); "Deixar para amanhã" fica fora até haver regra
// de domínio.
import type { OrigemDaAcao } from '../../core/modelo';
import type { ProximaAcao } from '../../dominios/hoje/contrato';
import { tituloDaAcao } from './textos-da-acao';
import './estilos-hoje.css';

function Atividade({ acao }: { acao: ProximaAcao }) {
  return (
    <span className="em-seguida-nome">
      {tituloDaAcao(acao)}
      {acao.estimativaMin !== undefined && (
        <small className="em-seguida-tempo">cerca de {acao.estimativaMin} min</small>
      )}
    </span>
  );
}

export function Depois({
  acoes,
  opcoes,
  aoTrocar,
}: {
  acoes: readonly ProximaAcao[];
  /** O que o "Trocar" oferece: as atividades do "Em seguida" e as que ficaram de fora. */
  opcoes: readonly ProximaAcao[];
  aoTrocar: (lugar: number, tipo: OrigemDaAcao['tipo']) => void;
}) {
  const [primeira, ...resto] = acoes;
  if (primeira === undefined) return null;
  return (
    <section className="em-seguida" aria-label="Em seguida">
      <details className="em-seguida-bloco">
        <summary className="em-seguida-resumo">
          <span className="em-seguida-rotulo">Em seguida</span>
          <span className="em-seguida-vem">
            <span className="em-seguida-vem-nome">{tituloDaAcao(primeira)}</span>
            {resto.length > 0 && `, mais ${resto.length}`}
          </span>
          <span className="em-seguida-seta" aria-hidden="true" />
        </summary>
        <ul className="em-seguida-lista">
          {/* A chave é o lugar: depois de um "Trocar" o item segue aberto, com a atividade nova. */}
          {acoes.map((acao, lugar) => (
            <li key={lugar}>
              {opcoes.length > 1 ? (
                <details className="em-seguida-troca">
                  <summary className="em-seguida-linha">
                    <Atividade acao={acao} />
                    <span className="em-seguida-trocar">Trocar</span>
                  </summary>
                  <div className="em-seguida-opcoes" role="group" aria-label="Trocar por">
                    <span className="em-seguida-opcoes-rotulo" aria-hidden="true">
                      Trocar por
                    </span>
                    {opcoes.map((opcao) => (
                      <button
                        key={opcao.tipo}
                        type="button"
                        className={opcao.tipo === acao.tipo ? 'chip principal' : 'chip'}
                        aria-pressed={opcao.tipo === acao.tipo}
                        onClick={() => {
                          aoTrocar(lugar, opcao.tipo);
                        }}
                      >
                        {tituloDaAcao(opcao)}
                      </button>
                    ))}
                  </div>
                </details>
              ) : (
                <div className="em-seguida-linha">
                  <Atividade acao={acao} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
