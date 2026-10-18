import { useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router';
import {
  criarDisciplina,
  criarPonto,
  descreverAtividade,
  excluirDisciplina,
  renomearDisciplina,
  ROTULO_STATUS,
  SEM_ATIVIDADE,
  statusDoPonto,
  type StatusDoPonto,
} from '../../../dominios/pontos';
import { Selo } from '../../componentes/Selo';
import { Esqueleto, Vazio } from '../../componentes/estados';
import { useDados, useRepositorio } from '../../dados/contexto';
import { mensagem } from '../erros';
import { carregarPontos, ROTULO_FAIXA } from './carregar';
import './estilos-pontos.css';

type Filtro = 'todos' | StatusDoPonto;

function NovaMateria({ aoErro }: { aoErro: (m: string | null) => void }) {
  const repo = useRepositorio();
  const [nome, setNome] = useState('');
  const enviar = (e: SyntheticEvent) => {
    e.preventDefault();
    aoErro(null);
    criarDisciplina(repo, nome).then(
      () => {
        setNome('');
      },
      (x: unknown) => {
        aoErro(mensagem(x));
      },
    );
  };
  return (
    <details className="pontos-novo">
      <summary>Nova matéria</summary>
      <form onSubmit={enviar} className="pontos-form">
        <div className="campo">
          <label htmlFor="nova-materia">Nome da matéria</label>
          <input
            id="nova-materia"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
            }}
          />
        </div>
        <button type="submit" className="principal">
          Adicionar matéria
        </button>
      </form>
    </details>
  );
}

function EditarMateria({
  id,
  nome,
  pontos,
  aoErro,
}: {
  id: string;
  nome: string;
  pontos: number;
  aoErro: (m: string | null) => void;
}) {
  const repo = useRepositorio();
  const [novo, setNovo] = useState(nome);
  const [confirmando, setConfirmando] = useState(false);
  return (
    <div className="pontos-secao">
      <h3>Editar matéria</h3>
      <form
        className="pontos-form"
        onSubmit={(e) => {
          e.preventDefault();
          aoErro(null);
          renomearDisciplina(repo, id, novo).catch((x: unknown) => {
            aoErro(mensagem(x));
          });
        }}
      >
        <div className="campo">
          <label htmlFor={`renomear-${id}`}>Nome</label>
          <input
            id={`renomear-${id}`}
            value={novo}
            onChange={(e) => {
              setNovo(e.target.value);
            }}
          />
        </div>
        <button type="submit">Salvar nome</button>
      </form>
      {!confirmando ? (
        <button
          type="button"
          className="discreto"
          onClick={() => {
            setConfirmando(true);
          }}
        >
          Excluir matéria
        </button>
      ) : (
        <div role="group" aria-label="Confirmar exclusão" className="pontos-confirmar">
          <p>
            Isto tira a matéria e {pontos} {pontos === 1 ? 'ponto' : 'pontos'} da lista. Erros,
            cartões e sessões continuam guardados.
          </p>
          <button
            type="button"
            className="principal"
            onClick={() => {
              setConfirmando(false);
            }}
          >
            Não excluir
          </button>
          <button
            type="button"
            className="discreto"
            onClick={() => {
              aoErro(null);
              excluirDisciplina(repo, id).catch((x: unknown) => {
                aoErro(mensagem(x));
              });
            }}
          >
            Sim, excluir
          </button>
        </div>
      )}
    </div>
  );
}

function NovoPonto({
  disciplinaId,
  aoErro,
}: {
  disciplinaId: string;
  aoErro: (m: string | null) => void;
}) {
  const repo = useRepositorio();
  const [titulo, setTitulo] = useState('');
  return (
    <div className="pontos-secao">
      <h3>Adicionar ponto</h3>
      <form
        className="pontos-form"
        onSubmit={(e) => {
          e.preventDefault();
          aoErro(null);
          criarPonto(repo, disciplinaId, titulo).then(
            () => {
              setTitulo('');
            },
            (x: unknown) => {
              aoErro(mensagem(x));
            },
          );
        }}
      >
        <div className="campo">
          <label htmlFor={`novo-ponto-${disciplinaId}`}>Título do ponto</label>
          <input
            id={`novo-ponto-${disciplinaId}`}
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
            }}
          />
        </div>
        <button type="submit" className="principal">
          Salvar ponto
        </button>
      </form>
    </div>
  );
}

export function ListaDePontos() {
  const { dados } = useDados(carregarPontos);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [erro, setErro] = useState<string | null>(null);
  if (!dados) return <Esqueleto />;

  return (
    <>
      <h1>Pontos do programa</h1>
      <p className="dica">
        O que cai (faixa) e o que você já fez (andamento) são coisas separadas.{' '}
        <Link to="/plano">Voltar ao Plano</Link>
      </p>
      {erro && (
        <p role="alert" className="aviso falha">
          {erro}
        </p>
      )}
      <NovaMateria aoErro={setErro} />
      {dados.disciplinas.length === 0 ? (
        <Vazio titulo="Nenhuma matéria ainda">
          <p>
            Adicione uma matéria acima, ou <Link to="/plano/onboarding">monte pelo catálogo</Link>.
          </p>
        </Vazio>
      ) : (
        <>
          <div className="campo pontos-filtro">
            <label htmlFor="filtro-status">Mostrar</label>
            <select
              id="filtro-status"
              value={filtro}
              onChange={(e) => {
                setFiltro(e.target.value as Filtro);
              }}
            >
              <option value="todos">Todos os pontos</option>
              {(Object.keys(ROTULO_STATUS) as StatusDoPonto[]).map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS[s]}
                </option>
              ))}
            </select>
          </div>
          {dados.disciplinas.map((d) => {
            const todos = dados.pontos.filter((p) => p.disciplinaId === d.id);
            const vistos = todos.filter(
              (p) =>
                filtro === 'todos' ||
                statusDoPonto(p, dados.atividade.get(p.id) ?? SEM_ATIVIDADE, dados.hoje) === filtro,
            );
            if (filtro !== 'todos' && vistos.length === 0) return null;
            return (
              <section key={d.id} aria-labelledby={`m-${d.id}`} className="pontos-materia">
                <h2 id={`m-${d.id}`}>{d.nome}</h2>
                <p className="dica">
                  {todos.length} {todos.length === 1 ? 'ponto' : 'pontos'}
                </p>
                <ul className="lista-simples">
                  {vistos.map((p) => {
                    const a = dados.atividade.get(p.id) ?? SEM_ATIVIDADE;
                    const status = statusDoPonto(p, a, dados.hoje);
                    return (
                      <li key={p.id} className="pontos-item">
                        <Link to={`/plano/pontos/${p.id}`}>
                          {p.codigo ? `${p.codigo}. ` : ''}
                          {p.titulo}
                        </Link>
                        <span className="pontos-selos">
                          <Selo>{ROTULO_STATUS[status]}</Selo>
                          {p.faixa && <span className="marcador">{ROTULO_FAIXA[p.faixa]}</span>}
                        </span>
                        <span className="dica">{descreverAtividade(a)}</span>
                      </li>
                    );
                  })}
                </ul>
                <details className="pontos-novo">
                  <summary>Mais</summary>
                  <NovoPonto disciplinaId={d.id} aoErro={setErro} />
                  <EditarMateria id={d.id} nome={d.nome} pontos={todos.length} aoErro={setErro} />
                </details>
              </section>
            );
          })}
        </>
      )}
    </>
  );
}
