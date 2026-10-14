import { useState, type SyntheticEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Faixa, Ponto } from '../../../core/modelo';
import {
  adiarPonto,
  descreverAtividade,
  EdicaoInvalida,
  editarPonto,
  excluirPonto,
  mudarFaixa,
  retomarPonto,
  ROTULO_STATUS,
  SEM_ATIVIDADE,
  statusDoPonto,
} from '../../../dominios/pontos';
import { Selo } from '../../componentes/Selo';
import { Esqueleto, Vazio } from '../../componentes/estados';
import { useDados, useRepositorio } from '../../dados/contexto';
import { rotaDeInicio } from '../../hoje/rota-de-inicio';
import { carregarPontos, ROTULO_FAIXA, type DadosDosPontos } from './carregar';
import './estilos-pontos.css';

const FAIXAS = Object.keys(ROTULO_FAIXA) as Faixa[];

function mensagem(e: unknown): string {
  return e instanceof EdicaoInvalida ? e.message : 'Não foi possível salvar. Nada foi alterado.';
}

function Formulario({ ponto, dados }: { ponto: Ponto; dados: DadosDosPontos }) {
  const repo = useRepositorio();
  const [titulo, setTitulo] = useState(ponto.titulo);
  const [codigo, setCodigo] = useState(ponto.codigo ?? '');
  const [disciplinaId, setDisciplinaId] = useState(ponto.disciplinaId ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const salvar = (e: SyntheticEvent) => {
    e.preventDefault();
    setErro(null);
    setSalvo(false);
    editarPonto(repo, ponto.id, { titulo, codigo, ...(disciplinaId ? { disciplinaId } : {}) }).then(
      () => {
        setSalvo(true);
      },
      (x: unknown) => {
        setErro(mensagem(x));
      },
    );
  };
  return (
    <form onSubmit={salvar} className="pontos-form" aria-label="Dados do ponto">
      <div className="campo">
        <label htmlFor="ponto-titulo">Título</label>
        <textarea
          id="ponto-titulo"
          rows={3}
          value={titulo}
          onChange={(e) => {
            setTitulo(e.target.value);
          }}
        />
      </div>
      <div className="campo">
        <label htmlFor="ponto-codigo">Código (opcional)</label>
        <input
          id="ponto-codigo"
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value);
          }}
        />
      </div>
      <div className="campo">
        <label htmlFor="ponto-materia">Matéria</label>
        <select
          id="ponto-materia"
          value={disciplinaId}
          onChange={(e) => {
            setDisciplinaId(e.target.value);
          }}
        >
          {dados.disciplinas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nome}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="principal">
        Salvar
      </button>
      {salvo && (
        <p role="status" className="sucesso">
          Salvo.
        </p>
      )}
      {erro && (
        <p role="alert" className="aviso falha">
          {erro}
        </p>
      )}
    </form>
  );
}

function Prioridade({ ponto }: { ponto: Ponto }) {
  const repo = useRepositorio();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <section aria-labelledby="ponto-faixa-titulo" className="pontos-bloco">
      <h2 id="ponto-faixa-titulo">Prioridade</h2>
      <p className="dica">Quanto este ponto costuma cair. Não muda sozinha com o seu andamento.</p>
      <div className="campo">
        <label htmlFor="ponto-faixa">Faixa</label>
        <select
          id="ponto-faixa"
          value={ponto.faixa ?? ''}
          onChange={(e) => {
            setErro(null);
            const v = e.target.value as Faixa | '';
            mudarFaixa(repo, ponto.id, v === '' ? undefined : v).catch((x: unknown) => {
              setErro(mensagem(x));
            });
          }}
        >
          <option value="">Sem faixa</option>
          {FAIXAS.map((f) => (
            <option key={f} value={f}>
              {ROTULO_FAIXA[f]}
            </option>
          ))}
        </select>
      </div>
      {ponto.logPrioridade && ponto.logPrioridade.length > 0 && (
        <details>
          <summary>Histórico da faixa</summary>
          <ul className="lista-simples">
            {ponto.logPrioridade.map((l) => (
              <li key={l.em}>
                {l.em.slice(0, 10)}: {l.antes.faixa ? ROTULO_FAIXA[l.antes.faixa] : 'sem faixa'}{' '}
                para {l.depois.faixa ? ROTULO_FAIXA[l.depois.faixa] : 'sem faixa'} (
                {l.origem === 'importacao' ? 'catálogo ou planilha' : 'você'})
              </li>
            ))}
          </ul>
        </details>
      )}
      {erro && (
        <p role="alert" className="aviso falha">
          {erro}
        </p>
      )}
    </section>
  );
}

function Adiar({ ponto, hoje }: { ponto: Ponto; hoje: string }) {
  const repo = useRepositorio();
  const [data, setData] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const adiado = ponto.adiadoAte !== undefined && ponto.adiadoAte > hoje;
  return (
    <section aria-labelledby="ponto-adiar-titulo" className="pontos-bloco">
      <h2 id="ponto-adiar-titulo">Deixar para depois</h2>
      {adiado ? (
        <>
          <p>Adiado até {ponto.adiadoAte}. Não vai ser sugerido antes disso.</p>
          <button
            type="button"
            onClick={() => {
              retomarPonto(repo, ponto.id).catch((x: unknown) => {
                setErro(mensagem(x));
              });
            }}
          >
            Voltar agora
          </button>
        </>
      ) : (
        <form
          className="pontos-form"
          onSubmit={(e) => {
            e.preventDefault();
            setErro(null);
            adiarPonto(repo, ponto.id, data).catch((x: unknown) => {
              setErro(mensagem(x));
            });
          }}
        >
          <div className="campo">
            <label htmlFor="ponto-adiar">Adiar até</label>
            <input
              id="ponto-adiar"
              type="date"
              min={hoje}
              value={data}
              onChange={(e) => {
                setData(e.target.value);
              }}
            />
          </div>
          <button type="submit" disabled={data === '' || data <= hoje}>
            Adiar
          </button>
        </form>
      )}
      {erro && (
        <p role="alert" className="aviso falha">
          {erro}
        </p>
      )}
    </section>
  );
}

function Excluir({ ponto }: { ponto: Ponto }) {
  const repo = useRepositorio();
  const navegar = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  return confirmando ? (
    <div role="group" aria-label="Confirmar exclusão" className="pontos-confirmar">
      <p>Tira o ponto da lista. Erros, cartões e sessões dele continuam guardados.</p>
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
          excluirPonto(repo, ponto.id).then(
            () => {
              void navegar('/plano/pontos');
            },
            () => {
              setConfirmando(false);
            },
          );
        }}
      >
        Sim, excluir
      </button>
    </div>
  ) : (
    <button
      type="button"
      className="discreto"
      onClick={() => {
        setConfirmando(true);
      }}
    >
      Excluir ponto
    </button>
  );
}

export function DetalheDoPonto() {
  const { id } = useParams();
  const { dados } = useDados(carregarPontos);
  if (!dados) return <Esqueleto />;
  const ponto = dados.pontos.find((p) => p.id === id);
  if (!ponto) {
    return (
      <Vazio titulo="Ponto não encontrado" acao={<Link to="/plano/pontos">Ver os pontos</Link>} />
    );
  }
  const a = dados.atividade.get(ponto.id) ?? SEM_ATIVIDADE;
  const status = statusDoPonto(ponto, a, dados.hoje);
  return (
    <>
      <h1>{ponto.titulo.length > 120 ? `${ponto.titulo.slice(0, 117)}…` : ponto.titulo}</h1>
      <p>
        <Link to="/plano/pontos">Todos os pontos</Link>
      </p>
      <section aria-labelledby="ponto-andamento-titulo" className="pontos-bloco">
        <h2 id="ponto-andamento-titulo">Andamento</h2>
        <p>
          <Selo>{ROTULO_STATUS[status]}</Selo>
        </p>
        <p className="dica">{descreverAtividade(a)}. Só conta o que você registrou no app.</p>
        <Link
          className="botao principal"
          to={rotaDeInicio({
            tipo: 'escolha_propria',
            razao: 'Ponto do seu plano',
            alvo: { tipo: 'ponto', id: ponto.id, rotulo: ponto.titulo.slice(0, 200) },
          })}
        >
          Começar uma sessão neste ponto
        </Link>
      </section>
      <Prioridade ponto={ponto} />
      <Formulario key={ponto.id} ponto={ponto} dados={dados} />
      <Adiar ponto={ponto} hoje={dados.hoje} />
      <Excluir ponto={ponto} />
    </>
  );
}
