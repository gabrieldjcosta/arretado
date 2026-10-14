// Começar em um toque (A2). Tudo é opcional; a Próxima ação (A1) pode chegar com o alvo na URL:
// /sessao/iniciar?tipo=revisao&id=<uuid>&rotulo=…&origem=revisao_vencida&razao=…&tarefa=<uuid>
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { AlvoDeAcao, OrigemDaAcao } from '../../core/modelo';
import { iniciarSessao } from '../../dominios/sessao/servico';
import { Esqueleto, Falha } from '../componentes/estados';
import { useDados, useRepositorio } from '../dados/contexto';
import { sessaoAberta } from './carregadores';
import './estilos-sessao.css';

function lerEntrada(p: URLSearchParams) {
  const bruto = (c: string) => p.get(c) ?? undefined;
  const alvo = AlvoDeAcao.safeParse({
    tipo: bruto('tipo'),
    id: bruto('id'),
    rotulo: bruto('rotulo'),
  });
  const origem = OrigemDaAcao.safeParse({ tipo: bruto('origem'), razao: bruto('razao') });
  return {
    alvo: alvo.success ? alvo.data : undefined,
    origemDaAcao: origem.success ? origem.data : undefined,
    tarefaId: bruto('tarefa'),
  };
}

export function Iniciar() {
  const repo = useRepositorio();
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const { dados: aberta, falha } = useDados(sessaoAberta);
  const [rotulo, setRotulo] = useState('');
  const [fronteira, setFronteira] = useState('');
  const [erro, setErro] = useState(false);
  const dada = lerEntrada(params);

  if (falha) {
    return (
      <Falha
        oQue="Não foi possível abrir a Sessão."
        oQueFazer="Recarregue a página e tente de novo."
      />
    );
  }
  if (aberta === undefined) return <Esqueleto />;
  if (aberta) return <Navigate to="/sessao/atual" replace />;

  const comecar = () => {
    setErro(false);
    const alvo =
      dada.alvo ?? (rotulo.trim() ? { tipo: 'livre' as const, rotulo: rotulo.trim() } : undefined);
    iniciarSessao(repo, {
      ...(alvo ? { alvo } : {}),
      ...(dada.origemDaAcao ? { origemDaAcao: dada.origemDaAcao } : {}),
      ...(dada.tarefaId ? { tarefaId: dada.tarefaId } : {}),
      ...(fronteira.trim() ? { fronteira } : {}),
    }).then(
      () => {
        void navegar('/sessao/atual');
      },
      () => {
        setErro(true);
      },
    );
  };

  return (
    <>
      <h1>Começar uma Sessão</h1>
      <section className="cartao-bloco">
        {dada.alvo?.rotulo ? (
          <p className="sessao-resumo">{dada.alvo.rotulo}</p>
        ) : (
          <p className="sessao-resumo">Sessão livre: estude o que quiser.</p>
        )}
        {dada.origemDaAcao?.razao && <p className="sessao-detalhe">{dada.origemDaAcao.razao}</p>}
        <details>
          <summary>Dizer o que e até onde (opcional)</summary>
          {!dada.alvo && (
            <div className="campo">
              <label htmlFor="sessao-rotulo">O que vai estudar?</label>
              <input
                id="sessao-rotulo"
                type="text"
                maxLength={500}
                value={rotulo}
                onChange={(e) => {
                  setRotulo(e.target.value);
                }}
              />
            </div>
          )}
          <div className="campo">
            <label htmlFor="sessao-fronteira">Até onde?</label>
            <input
              id="sessao-fronteira"
              type="text"
              maxLength={500}
              value={fronteira}
              onChange={(e) => {
                setFronteira(e.target.value);
              }}
              aria-describedby="sessao-fronteira-dica"
            />
            <p id="sessao-fronteira-dica" className="dica">
              Por exemplo: “até o art. 15”. Pode deixar em branco.
            </p>
          </div>
        </details>
        <div className="linha-acoes">
          <button type="button" className="principal" onClick={comecar}>
            Começar
          </button>
        </div>
        {erro && <Falha oQue="Não foi possível começar." oQueFazer="Tente de novo em instantes." />}
      </section>
    </>
  );
}
