// Encerrar com o próximo passo pré-preenchido e opcional (A2).
import { useState } from 'react';
import { Link } from 'react-router';
import type { Sessao } from '../../core/modelo';
import { encerrarSessao, sugerirProximoPasso } from '../../dominios/sessao/servico';
import { Esqueleto, Falha, Vazio } from '../componentes/estados';
import { useDados, useRepositorio } from '../dados/contexto';
import { NotasDoEstacionamento } from './alavancas/NotasDoEstacionamento';
import { sessaoAberta } from './carregadores';
import './estilos-sessao.css';

export function Fechar() {
  const repo = useRepositorio();
  const { dados: sessao, falha } = useDados(sessaoAberta);
  const [encerrada, setEncerrada] = useState<Sessao>();
  if (encerrada) return <Encerrada sessao={encerrada} />;
  if (falha) {
    return (
      <Falha
        oQue="Não foi possível abrir a Sessão."
        oQueFazer="Recarregue a página e tente de novo."
      />
    );
  }
  if (sessao === undefined) return <Esqueleto />;
  if (sessao === null) {
    return (
      <>
        <h1>Encerrar a Sessão</h1>
        <Vazio
          titulo="Nenhuma Sessão aberta"
          acao={
            <Link to="/" className="botao principal">
              Ir para o Hoje
            </Link>
          }
        >
          <p>Não há o que encerrar.</p>
        </Vazio>
      </>
    );
  }
  return <FormularioDeFechamento sessao={sessao} aoEncerrar={setEncerrada} repo={repo} />;
}

function FormularioDeFechamento({
  sessao,
  aoEncerrar,
  repo,
}: {
  sessao: Sessao;
  aoEncerrar: (s: Sessao) => void;
  repo: ReturnType<typeof useRepositorio>;
}) {
  const [passo, setPasso] = useState(() => sugerirProximoPasso(sessao));
  const [erro, setErro] = useState(false);
  const [feitas, setFeitas] = useState(sessao.questoesFeitas ? String(sessao.questoesFeitas) : '');
  const [acertos, setAcertos] = useState(
    sessao.questoesFeitas ? String(sessao.questoesAcertadas ?? 0) : '',
  );
  const encerrar = () => {
    setErro(false);
    encerrarSessao(repo, sessao.id, {
      proximoPasso: passo,
      questoesFeitas: Number(feitas) || 0,
      questoesAcertadas: Number(acertos) || 0,
    }).then(aoEncerrar, () => {
      setErro(true);
    });
  };
  return (
    <>
      <h1>Encerrar a Sessão</h1>
      <section className="cartao-bloco">
        <div className="campo">
          <label htmlFor="sessao-passo">Próximo passo (opcional)</label>
          <textarea
            id="sessao-passo"
            rows={2}
            maxLength={500}
            value={passo}
            onChange={(e) => {
              setPasso(e.target.value);
            }}
            aria-describedby="sessao-passo-dica"
          />
          <p id="sessao-passo-dica" className="dica">
            Um passo pequeno para a próxima vez. Pode apagar e deixar em branco.
          </p>
        </div>
        <details>
          <summary className="botao botao-texto na-margem">Fez questões? (opcional)</summary>
          <div className="campo">
            <label htmlFor="sessao-feitas">Questões feitas</label>
            <input
              id="sessao-feitas"
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              value={feitas}
              onChange={(e) => {
                setFeitas(e.target.value);
              }}
            />
          </div>
          <div className="campo">
            <label htmlFor="sessao-acertos">Quantas acertou</label>
            <input
              id="sessao-acertos"
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              value={acertos}
              onChange={(e) => {
                setAcertos(e.target.value);
              }}
            />
          </div>
          <p className="dica">Ajuda o ciclo a sugerir mais vezes a matéria em que você erra.</p>
        </details>
        <div className="linha-acoes">
          <button type="button" className="principal" onClick={encerrar}>
            Encerrar
          </button>
          <Link to="/sessao/atual" className="botao">
            Voltar à Sessão
          </Link>
        </div>
        {erro && <Falha oQue="Não foi possível encerrar." oQueFazer="Tente de novo." />}
      </section>
      <NotasDoEstacionamento sessao={sessao} />
    </>
  );
}

function Encerrada({ sessao }: { sessao: Sessao }) {
  return (
    <>
      <h1>Encerrar a Sessão</h1>
      <Vazio
        titulo="Sessão encerrada"
        acao={
          <Link to="/" className="botao principal">
            Ir para o Hoje
          </Link>
        }
      >
        {sessao.proximoPasso ? (
          <p>Próximo passo guardado: {sessao.proximoPasso}</p>
        ) : (
          <p>Bom descanso. Você decide o que vem depois.</p>
        )}
      </Vazio>
    </>
  );
}
