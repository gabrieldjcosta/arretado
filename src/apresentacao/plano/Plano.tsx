import { useState } from 'react';
import { GuiaDaTela } from '../guia/GuiaDaTela';
import { Link } from 'react-router';
import type { Disciplina, Ponto } from '../../core/modelo';
import { Esqueleto, Vazio } from '../componentes/estados';
import { useDados } from '../dados/contexto';
import { ROTULO_DA_AREA } from '../textos';
import { pontosEDisciplinas } from '../recall/carregadores';
import { ImportarPontos } from './ImportarPontos';
import { ProvaDoPlano } from './ProvaDoPlano';
import { ROTULO_FAIXA } from './pontos/carregar';
import './estilos-plano.css';

function porDisciplina(disciplinas: Disciplina[], pontos: Ponto[]) {
  const ordenadas = [...disciplinas].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  return ordenadas.map((d) => ({
    disciplina: d,
    pontos: pontos
      .filter((p) => p.disciplinaId === d.id)
      .sort((a, b) => (a.prioridade ?? 0) - (b.prioridade ?? 0)),
  }));
}

/** Plano na F1: pontos importados, só para vincular erros. Edição e sugestão chegam na F3. */
export function Plano() {
  const { dados } = useDados(pontosEDisciplinas);
  const [confirmacao, setConfirmacao] = useState<string | null>(null);
  if (!dados) return <Esqueleto />;
  const grupos = porDisciplina(dados.disciplinas, dados.pontos);

  return (
    <>
      <h1>{ROTULO_DA_AREA.plano}</h1>
      <ProvaDoPlano />
      {confirmacao && (
        <p role="status" className="sucesso">
          {confirmacao}
        </p>
      )}
      {dados.pontos.length === 0 ? (
        <>
          <Vazio titulo="Monte seu plano do seu jeito">
            <p>
              Você pode importar as disciplinas e os pontos do seu edital ou montar o plano a partir
              do nosso catálogo de concursos.
            </p>
            <div className="plano-vazio-caminhos">
              <Link to="/plano/onboarding" className="botao">
                Montar pelo catálogo
              </Link>
              <a
                href="#importar-edital"
                className="botao"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById('importar-edital')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Trazer meu edital
              </a>
            </div>
          </Vazio>
          <GuiaDaTela tela="plano" />
          <ImportarPontos aoImportar={setConfirmacao} afastado />
        </>
      ) : (
        <>
          <p className="dica">
            {dados.pontos.length} pontos. Servem para vincular erros e acompanhar o que você já fez.
          </p>
          <Link to="/plano/pontos" className="botao botao-texto na-margem">
            Editar pontos e matérias
          </Link>
          <Link to="/plano/ciclo" className="botao botao-texto na-margem">
            Ciclo de estudo
          </Link>
          {grupos.map(({ disciplina, pontos }) => (
            <section key={disciplina.id} aria-labelledby={`d-${disciplina.id}`}>
              <h2 id={`d-${disciplina.id}`}>{disciplina.nome}</h2>
              <ul className="lista-simples">
                {pontos.map((p) => (
                  <li key={p.id}>
                    <span>
                      {p.codigo ? `${p.codigo}. ` : ''}
                      {p.titulo}
                    </span>
                    {p.faixa && <span className="marcador">{ROTULO_FAIXA[p.faixa]}</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <details>
            <summary className="botao botao-texto na-margem">Importar outra planilha</summary>
            <ImportarPontos aoImportar={setConfirmacao} />
          </details>
        </>
      )}
    </>
  );
}
