// `/plano/tarefas` (pacote B4): fila de tarefas pequenas e sugestões com o "por quê".
import { useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router';
import type { Disciplina, Ponto, TarefaDeEstudo } from '../../../core/modelo';
import {
  adiarTarefa,
  carregarFila,
  concluirTarefa,
  criarTarefa,
  dividirTarefa,
  excluirTarefa,
  moverTarefa,
  pularTarefa,
  reabrirTarefa,
  TarefaInvalida,
  type Sugestao,
} from '../../../dominios/tarefas';
import { dataCivil } from '../../../core/datas';
import type { Repositorio } from '../../../core/persistencia';
import { Esqueleto, Vazio } from '../../componentes/estados';
import { Selo } from '../../componentes/Selo';
import { useDados, useRepositorio } from '../../dados/contexto';
import { rotaDeInicio } from '../../hoje/rota-de-inicio';
import { gravarDispensadas, lerDispensadas } from './dispensadas';
import { sugestoesDoDia } from './sugestoes-do-dia';
import './estilos-tarefas.css';

const LIMITE_DE_SUGESTOES = 3;

async function carregar(repo: Repositorio) {
  const hoje = dataCivil(repo.ctx.agora());
  const [fila, sugestoes, pontos, disciplinas] = await Promise.all([
    carregarFila(repo, hoje),
    sugestoesDoDia(repo),
    repo.colecao('pontos').todosDoUsuario(),
    repo.colecao('disciplinas').todosDoUsuario(),
  ]);
  return {
    hoje,
    fila,
    sugestoes,
    pontos: pontos.filter((p) => p.excluidoEm === null),
    disciplinas: disciplinas.filter((d) => d.excluidoEm === null),
  };
}

function mensagem(e: unknown): string {
  return e instanceof TarefaInvalida ? e.message : 'Não foi possível salvar. Nada foi alterado.';
}

function NovaTarefa({
  pontos,
  disciplinas,
  aoErro,
}: {
  pontos: readonly Ponto[];
  disciplinas: readonly Disciplina[];
  aoErro: (m: string | null) => void;
}) {
  const repo = useRepositorio();
  const [titulo, setTitulo] = useState('');
  const [pontoId, setPontoId] = useState('');
  const [minutos, setMinutos] = useState('');
  const enviar = (e: SyntheticEvent) => {
    e.preventDefault();
    aoErro(null);
    const min = Number.parseInt(minutos, 10);
    criarTarefa(repo, {
      titulo,
      ...(pontoId ? { pontoId } : {}),
      ...(Number.isInteger(min) && min >= 1 && min <= 600 ? { estimativaMin: min } : {}),
    }).then(
      () => {
        setTitulo('');
        setMinutos('');
      },
      (x: unknown) => {
        aoErro(mensagem(x));
      },
    );
  };
  return (
    <form onSubmit={enviar} className="tarefas-form" aria-label="Nova tarefa">
      <div className="campo">
        <label htmlFor="tarefa-titulo">O que fazer?</label>
        <input
          id="tarefa-titulo"
          value={titulo}
          placeholder="Ler arts. 10 a 13"
          onChange={(e) => {
            setTitulo(e.target.value);
          }}
        />
      </div>
      <details className="tarefas-mais">
        <summary>Ligar a um ponto ou estimar (opcional)</summary>
        <div className="campo">
          <label htmlFor="tarefa-ponto">Ponto</label>
          <select
            id="tarefa-ponto"
            value={pontoId}
            onChange={(e) => {
              setPontoId(e.target.value);
            }}
          >
            <option value="">Nenhum</option>
            {disciplinas.map((d) => (
              <optgroup key={d.id} label={d.nome}>
                {pontos
                  .filter((p) => p.disciplinaId === d.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titulo.length > 80 ? `${p.titulo.slice(0, 77)}…` : p.titulo}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="tarefa-min">Minutos (opcional)</label>
          <input
            id="tarefa-min"
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            value={minutos}
            onChange={(e) => {
              setMinutos(e.target.value);
            }}
          />
        </div>
      </details>
      <button type="submit" className="principal">
        Adicionar tarefa
      </button>
    </form>
  );
}

function Sugestoes({
  sugestoes,
  hoje,
  aoErro,
}: {
  sugestoes: readonly Sugestao[];
  hoje: string;
  aoErro: (m: string | null) => void;
}) {
  const repo = useRepositorio();
  const [dispensadas, setDispensadas] = useState<string[]>(() => lerDispensadas(hoje));
  const visiveis = sugestoes
    .filter((s) => !dispensadas.includes(s.chave))
    .slice(0, LIMITE_DE_SUGESTOES);
  if (visiveis.length === 0) return null;
  return (
    <section aria-labelledby="tarefas-sugestoes" className="tarefas-bloco">
      <h2 id="tarefas-sugestoes">Sugestões</h2>
      <ul className="lista-simples">
        {visiveis.map((s) => (
          <li key={s.chave} className="tarefas-item">
            <span>{s.titulo}</span>
            <span className="dica">Por quê: {s.razao}</span>
            <span className="linha-acoes">
              <button
                type="button"
                onClick={() => {
                  aoErro(null);
                  criarTarefa(repo, {
                    titulo: s.titulo,
                    autoria: 'sugerida',
                    razao: s.razao,
                    ...(s.pontoId ? { pontoId: s.pontoId } : {}),
                  }).catch((x: unknown) => {
                    aoErro(mensagem(x));
                  });
                }}
              >
                Adicionar à fila
              </button>
              <button
                type="button"
                className="discreto"
                onClick={() => {
                  const novas = [...dispensadas, s.chave];
                  setDispensadas(novas);
                  gravarDispensadas(hoje, novas);
                }}
              >
                Não agora
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Acoes({
  tarefa,
  hoje,
  aoErro,
}: {
  tarefa: TarefaDeEstudo;
  hoje: string;
  aoErro: (m: string | null) => void;
}) {
  const repo = useRepositorio();
  const [data, setData] = useState('');
  const [partes, setPartes] = useState('');
  const rodar = (promessa: Promise<unknown>) => {
    aoErro(null);
    promessa.catch((x: unknown) => {
      aoErro(mensagem(x));
    });
  };
  return (
    <details className="tarefas-mais">
      <summary>Mais</summary>
      <div className="linha-acoes">
        <button
          type="button"
          onClick={() => {
            rodar(moverTarefa(repo, tarefa.id, 'cima', hoje));
          }}
        >
          Subir
        </button>
        <button
          type="button"
          onClick={() => {
            rodar(moverTarefa(repo, tarefa.id, 'baixo', hoje));
          }}
        >
          Descer
        </button>
        <button
          type="button"
          onClick={() => {
            rodar(pularTarefa(repo, tarefa.id));
          }}
        >
          Deixar para o fim
        </button>
      </div>
      <p className="dica">Vai para o fim da fila; a tarefa continua aqui.</p>
      <div className="campo">
        <label htmlFor={`adiar-${tarefa.id}`}>Deixar para depois, até</label>
        <input
          id={`adiar-${tarefa.id}`}
          type="date"
          min={hoje}
          value={data}
          onChange={(e) => {
            setData(e.target.value);
          }}
        />
      </div>
      <button
        type="button"
        disabled={data === '' || data <= hoje}
        onClick={() => {
          rodar(adiarTarefa(repo, tarefa.id, data));
        }}
      >
        Deixar para depois
      </button>
      <div className="campo">
        <label htmlFor={`dividir-${tarefa.id}`}>Dividir (uma parte por linha)</label>
        <textarea
          id={`dividir-${tarefa.id}`}
          rows={3}
          value={partes}
          onChange={(e) => {
            setPartes(e.target.value);
          }}
        />
      </div>
      <button
        type="button"
        onClick={() => {
          rodar(dividirTarefa(repo, tarefa.id, partes.split('\n')));
        }}
      >
        Dividir esta tarefa
      </button>
      <button
        type="button"
        className="discreto"
        onClick={() => {
          rodar(excluirTarefa(repo, tarefa.id));
        }}
      >
        Excluir tarefa
      </button>
    </details>
  );
}

export function Tarefas() {
  const { dados } = useDados(carregar);
  const [erro, setErro] = useState<string | null>(null);
  const repo = useRepositorio();
  if (!dados) return <Esqueleto />;
  const nomeDoPonto = new Map(dados.pontos.map((p) => [p.id, p.titulo]));
  const { fila, adiadas, feitas } = dados.fila;
  return (
    <>
      <h1>Tarefas</h1>
      <p className="dica">
        Passos pequenos, como “ler arts. 10 a 13”. O que não der fica na fila, sem cobrança.{' '}
        <Link to="/plano">Voltar ao Plano</Link>
      </p>
      {erro && (
        <p role="alert" className="aviso falha">
          {erro}
        </p>
      )}
      <NovaTarefa pontos={dados.pontos} disciplinas={dados.disciplinas} aoErro={setErro} />
      <section aria-labelledby="tarefas-fila" className="tarefas-bloco">
        <h2 id="tarefas-fila">Fila</h2>
        {fila.length === 0 ? (
          <Vazio titulo="Nenhuma tarefa na fila">
            <p>Escreva uma tarefa acima ou adicione uma sugestão.</p>
          </Vazio>
        ) : (
          <ol className="lista-simples tarefas-fila">
            {fila.map((t) => (
              <li key={t.id} className="tarefas-item">
                <span>{t.titulo}</span>
                <span className="tarefas-selos">
                  {t.autoria === 'sugerida' && <Selo>Sugerida</Selo>}
                  {t.estimativaMin !== undefined && (
                    <span className="dica">cerca de {t.estimativaMin} min</span>
                  )}
                  {t.pontoId && nomeDoPonto.has(t.pontoId) && (
                    <span className="dica">Ponto: {nomeDoPonto.get(t.pontoId)}</span>
                  )}
                </span>
                {t.razao && <span className="dica">Por quê: {t.razao}</span>}
                <span className="linha-acoes">
                  <Link
                    className="botao principal"
                    to={rotaDeInicio({
                      tipo: 'tarefa',
                      razao: 'Tarefa da sua fila',
                      alvo: { tipo: 'tarefa', id: t.id, rotulo: t.titulo.slice(0, 200) },
                    })}
                  >
                    Começar
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      concluirTarefa(repo, t.id).catch((x: unknown) => {
                        setErro(mensagem(x));
                      });
                    }}
                  >
                    Feita
                  </button>
                </span>
                <Acoes tarefa={t} hoje={dados.hoje} aoErro={setErro} />
              </li>
            ))}
          </ol>
        )}
      </section>
      <Sugestoes sugestoes={dados.sugestoes} hoje={dados.hoje} aoErro={setErro} />
      {adiadas.length > 0 && (
        <details className="tarefas-bloco">
          <summary>Para depois</summary>
          <ul className="lista-simples">
            {adiadas.map((t) => (
              <li key={t.id} className="tarefas-item">
                <span>{t.titulo}</span>
                <span className="dica">Volta à fila em {t.adiadaAte}.</span>
                <button
                  type="button"
                  onClick={() => {
                    reabrirTarefa(repo, t.id).catch((x: unknown) => {
                      setErro(mensagem(x));
                    });
                  }}
                >
                  Voltar agora
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {feitas.length > 0 && (
        <details className="tarefas-bloco">
          <summary>Feitas ({feitas.length})</summary>
          <ul className="lista-simples">
            {feitas.map((t) => (
              <li key={t.id} className="tarefas-item">
                <span>{t.titulo}</span>
                <button
                  type="button"
                  onClick={() => {
                    reabrirTarefa(repo, t.id).catch((x: unknown) => {
                      setErro(mensagem(x));
                    });
                  }}
                >
                  Voltar para a fila
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
