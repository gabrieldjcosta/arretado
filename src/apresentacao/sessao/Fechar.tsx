// Encerrar com o próximo passo pré-preenchido e opcional (A2).
import { useState } from 'react';
import { Link } from 'react-router';
import type { Sessao } from '../../core/modelo';
import { encerrarSessao, sugerirProximoPasso } from '../../dominios/sessao/servico';
import { Esqueleto, Falha, Vazio } from '../componentes/estados';
import { useDados, useRepositorio } from '../dados/contexto';
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
      <Vazio titulo="Nenhuma Sessão aberta" acao={<Link to="/">Ir para o Hoje</Link>}>
        <p>Não há o que encerrar.</p>
      </Vazio>
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
  const encerrar = () => {
    setErro(false);
    encerrarSessao(repo, sessao.id, { proximoPasso: passo }).then(aoEncerrar, () => {
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
    </>
  );
}

function Encerrada({ sessao }: { sessao: Sessao }) {
  return (
    <Vazio titulo="Sessão encerrada" acao={<Link to="/">Ir para o Hoje</Link>}>
      {sessao.proximoPasso ? (
        <p>Próximo passo guardado: {sessao.proximoPasso}</p>
      ) : (
        <p>Bom descanso. Você decide o que vem depois.</p>
      )}
    </Vazio>
  );
}
