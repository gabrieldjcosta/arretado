import type { Disciplina, Faixa, Ponto } from '../../core/modelo';
import { Esqueleto, Vazio } from '../componentes/estados';
import { useDados } from '../dados/contexto';
import { pontosEDisciplinas } from '../recall/carregadores';
import { ImportarPontos } from './ImportarPontos';

const ROTULO_FAIXA: Record<Faixa, string> = {
  altissima: 'Altíssima',
  alta: 'Alta',
  media: 'Média',
  extra: 'Extra',
};

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
  if (!dados) return <Esqueleto />;
  const grupos = porDisciplina(dados.disciplinas, dados.pontos);

  return (
    <>
      <h1>Plano</h1>
      {dados.pontos.length === 0 ? (
        <>
          <Vazio titulo="Nenhum ponto do edital ainda">
            <p>Importe seus pontos para poder vincular erros a eles.</p>
          </Vazio>
          <ImportarPontos />
        </>
      ) : (
        <>
          <p className="dica">
            {dados.pontos.length} pontos importados. Servem para vincular erros; mudar faixas e
            receber sugestão do próximo ponto chega numa próxima fase.
          </p>
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
            <summary className="botao discreto">Importar outra planilha</summary>
            <ImportarPontos />
          </details>
        </>
      )}
    </>
  );
}
