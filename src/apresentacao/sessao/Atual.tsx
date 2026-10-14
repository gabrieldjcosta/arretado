// A Sessão aberta: pausar sem falha, voltar, ou ir fechar (A2).
import { useState } from 'react';
import { Link } from 'react-router';
import type { Sessao } from '../../core/modelo';
import { pausarSessao, retomarSessao } from '../../dominios/sessao/servico';
import { Esqueleto, Falha, Vazio } from '../componentes/estados';
import { useDados, useRepositorio } from '../dados/contexto';
import { horaDeInicio, sessaoAberta } from './carregadores';
import './estilos-sessao.css';

export function Atual() {
  const { dados: sessao, falha } = useDados(sessaoAberta);
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
      <Vazio
        titulo="Nenhuma Sessão aberta"
        acao={<Link to="/sessao/iniciar">Começar uma Sessão</Link>}
      >
        <p>Quando quiser estudar, comece uma Sessão em um toque.</p>
      </Vazio>
    );
  }
  return <SessaoEmAndamento sessao={sessao} />;
}

function SessaoEmAndamento({ sessao }: { sessao: Sessao }) {
  const repo = useRepositorio();
  const [erro, setErro] = useState(false);
  const pausada = sessao.estado === 'pausada';
  const mudar = (acao: typeof pausarSessao) => {
    setErro(false);
    acao(repo, sessao.id).catch(() => {
      setErro(true);
    });
  };
  return (
    <>
      <h1>Sessão</h1>
      <section className="cartao-bloco" aria-label="Sessão em andamento">
        <p className="sessao-resumo">{sessao.alvo?.rotulo ?? 'Sessão livre'}</p>
        {sessao.fronteira && <p className="sessao-detalhe">Até onde: {sessao.fronteira}</p>}
        <p className="sessao-detalhe">Começou às {horaDeInicio(sessao.inicio)}.</p>
        {pausada ? (
          <p className="sessao-pausada" role="status">
            Pausada. Sem pressa: volte quando quiser.
          </p>
        ) : (
          sessao.alvo?.tipo === 'revisao' && (
            <p>
              <Link to="/recall/revisar">Abrir a revisão</Link>
            </p>
          )
        )}
        <div className="linha-acoes">
          {pausada ? (
            <button
              type="button"
              className="principal"
              onClick={() => {
                mudar(retomarSessao);
              }}
            >
              Voltar à Sessão
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                mudar(pausarSessao);
              }}
            >
              Pausar
            </button>
          )}
          <Link to="/sessao/fechar" className="botao">
            Encerrar
          </Link>
        </div>
        {erro && <Falha oQue="Não foi possível salvar." oQueFazer="Tente de novo." />}
      </section>
    </>
  );
}
