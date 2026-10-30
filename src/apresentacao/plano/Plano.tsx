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
import { ProximoBloco } from './ProximoBloco';
import { useCicloPadrao } from './ciclo/padrao';
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

function resumoDosPontos(n: number) {
  // Espaço sem quebra: o número não fica numa linha e "pontos" na outra.
  return n === 1 ? '1\u00a0ponto' : `${String(n)}\u00a0pontos`;
}

/** Plano na F1: pontos importados, só para vincular erros. Edição e sugestão chegam na F3. */
export function Plano() {
  const { dados } = useDados(pontosEDisciplinas);
  const [confirmacao, setConfirmacao] = useState<string | null>(null);
  useCicloPadrao();
  if (!dados) return <Esqueleto />;
  const grupos = porDisciplina(dados.disciplinas, dados.pontos);

  return (
    <>
      <h1>{ROTULO_DA_AREA.plano}</h1>
      <GuiaDaTela tela="plano" vazio={dados.pontos.length === 0} />
      {/* A ação principal vem antes do campo opcional: o Começar não desce e é o primeiro foco. */}
      {dados.pontos.length > 0 && <ProximoBloco />}
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
              Escolha o concurso e o app monta a Trilha pelo edital mais recente, com as normas para
              ler; lá dá para trocar o edital e as matérias. Ou traga o seu edital.
            </p>
            <div className="plano-vazio-caminhos">
              <Link to="/comecar" className="botao principal">
                Escolher meu concurso
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
          <Link to="/plano/tarefas" className="botao botao-texto na-margem">
            Tarefas
          </Link>
          {grupos.map(({ disciplina, pontos }) => (
            <section key={disciplina.id} aria-labelledby={`d-${disciplina.id}`}>
              <details className="trilha-materia" open={grupos.length === 1 || undefined}>
                <summary>
                  <span className="trilha-seta" aria-hidden="true" />
                  <h2 id={`d-${disciplina.id}`}>{disciplina.nome}</h2>{' '}
                  <span className="dica">{resumoDosPontos(pontos.length)}</span>
                </summary>
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
              </details>
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
