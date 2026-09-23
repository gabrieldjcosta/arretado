import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { Cartao, Erro, RespostaRevisao } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import {
  filaDoDia,
  revisar,
  suspenderCartao,
  vencemAmanha,
  versoEfetivo,
} from '../../dominios/recall/servico';
import { Esqueleto, Falha, Vazio } from '../componentes/estados';
import { useRepositorio } from '../dados/contexto';
import { ROTULO_RESPOSTA } from './rotulos';

/** Acima disso, oferece "revisar 20 agora" para a fila não assustar (Parte 2 §10.1). */
const FILA_GRANDE = 40;
const LOTE_CURTO = 20;

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'escolher'; fila: Cartao[] }
  | { tipo: 'revisando'; fila: Cartao[]; indice: number; virado: boolean }
  | { tipo: 'fim'; amanha: number }
  | { tipo: 'falha' };

async function carregarVerso(repo: Repositorio, cartao: Cartao): Promise<string> {
  if (cartao.verso !== null) return cartao.verso;
  const erro: Erro | undefined = cartao.erroId
    ? await repo.colecao('erros').obter(cartao.erroId, { incluirExcluidos: true })
    : undefined;
  return versoEfetivo(cartao, erro);
}

/** Drill: frente, virar, Errei / Difícil / Fácil. Sem caixa nem intervalo à vista (Parte 2 §9.2). */
export function Drill() {
  const repo = useRepositorio();
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  // Verso guardado com o id do cartão: nunca mostra o verso do cartão anterior.
  const [verso, setVerso] = useState<{ id: string; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const inicio = useRef(0);
  const botaoVirar = useRef<HTMLButtonElement>(null);

  const terminar = useCallback(async () => {
    try {
      setEstado({ tipo: 'fim', amanha: await vencemAmanha(repo) });
    } catch {
      setEstado({ tipo: 'falha' });
    }
  }, [repo]);

  useEffect(() => {
    let ativo = true;
    filaDoDia(repo).then(
      (fila) => {
        if (!ativo) return;
        if (fila.length === 0) void terminar();
        else if (fila.length > FILA_GRANDE) setEstado({ tipo: 'escolher', fila });
        else setEstado({ tipo: 'revisando', fila, indice: 0, virado: false });
      },
      () => {
        if (ativo) setEstado({ tipo: 'falha' });
      },
    );
    return () => {
      ativo = false;
    };
  }, [repo, terminar]);

  const atual = estado.tipo === 'revisando' ? estado.fila[estado.indice] : undefined;

  useEffect(() => {
    if (!atual) return;
    inicio.current = performance.now();
    botaoVirar.current?.focus();
    let ativo = true;
    carregarVerso(repo, atual).then(
      (v) => {
        if (ativo) setVerso({ id: atual.id, texto: v });
      },
      () => {
        if (ativo) setVerso({ id: atual.id, texto: '' });
      },
    );
    return () => {
      ativo = false;
    };
  }, [repo, atual]);

  const virar = useCallback(() => {
    setEstado((e) => (e.tipo === 'revisando' ? { ...e, virado: true } : e));
  }, []);

  const avancar = useCallback(() => {
    if (estado.tipo !== 'revisando') return;
    if (estado.indice + 1 >= estado.fila.length) void terminar();
    else setEstado({ ...estado, indice: estado.indice + 1, virado: false });
  }, [estado, terminar]);

  const responder = useCallback(
    async (resposta: RespostaRevisao) => {
      if (!atual || ocupado) return;
      setOcupado(true);
      setFalha(null);
      try {
        await revisar(repo, atual.id, resposta, { duracaoMs: performance.now() - inicio.current });
        avancar();
      } catch {
        setFalha('Não foi possível registrar a revisão. Tente de novo; nada foi perdido.');
      } finally {
        setOcupado(false);
      }
    },
    [atual, ocupado, repo, avancar],
  );

  // Atalhos: espaço/Enter vira; 1, 2, 3 respondem (Parte 2 §11).
  useEffect(() => {
    if (estado.tipo !== 'revisando') return;
    const tecla = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      // Com o foco em outro controle (menu, editar, suspender), a tecla é dele.
      const alvo = e.target as HTMLElement | null;
      const controle = alvo?.closest('a, button, summary, input, textarea, select');
      if (controle && controle !== botaoVirar.current) return;
      if (!estado.virado && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        virar();
      } else if (estado.virado && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        const resposta = (['errei', 'dificil', 'facil'] as const)[Number(e.key) - 1];
        if (resposta) void responder(resposta);
      }
    };
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
    };
  }, [estado, virar, responder]);

  if (estado.tipo === 'carregando') return <Esqueleto linhas={4} />;

  if (estado.tipo === 'falha') {
    return (
      <>
        <h1>Revisar</h1>
        <Falha
          oQue="Não foi possível carregar a fila de revisão."
          oQueFazer="Recarregue a página. Se continuar, use o ! para relatar o problema."
        />
      </>
    );
  }

  if (estado.tipo === 'escolher') {
    return (
      <>
        <h1>Revisar</h1>
        <p>Há {estado.fila.length} cartões vencidos.</p>
        <div className="linha-acoes">
          <button
            type="button"
            className="principal"
            onClick={() => {
              setEstado({
                tipo: 'revisando',
                fila: estado.fila.slice(0, LOTE_CURTO),
                indice: 0,
                virado: false,
              });
            }}
          >
            Revisar {LOTE_CURTO} agora
          </button>
          <button
            type="button"
            onClick={() => {
              setEstado({ tipo: 'revisando', fila: estado.fila, indice: 0, virado: false });
            }}
          >
            Revisar todos
          </button>
        </div>
      </>
    );
  }

  if (estado.tipo === 'fim') {
    return (
      <>
        <h1>Revisar</h1>
        <Vazio
          titulo="Feito."
          acao={
            <Link to="/recall" className="botao principal">
              Voltar ao Recall
            </Link>
          }
        >
          <p>Amanhã: {estado.amanha === 1 ? '1 cartão' : `${String(estado.amanha)} cartões`}.</p>
        </Vazio>
      </>
    );
  }

  if (!atual) return null;
  return (
    <>
      <h1 className="visualmente-oculto">Revisar</h1>
      <p className="dica" aria-live="polite">
        {estado.indice + 1} de {estado.fila.length}
      </p>
      <article className="cartao-bloco cartao-drill" aria-label="Cartão">
        <p className="texto-leitura">{atual.frente}</p>
        {estado.virado && (
          <>
            <hr />
            <p className="texto-leitura" aria-live="polite">
              {verso?.id !== atual.id ? (
                <span className="dica">Carregando…</span>
              ) : verso.texto ? (
                verso.texto
              ) : (
                <span className="dica">(sem verso — edite o cartão para completar)</span>
              )}
            </p>
          </>
        )}
      </article>
      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
      {!estado.virado ? (
        <div className="linha-acoes">
          <button ref={botaoVirar} type="button" className="principal grande" onClick={virar}>
            Mostrar resposta
          </button>
        </div>
      ) : (
        <div className="linha-acoes respostas" role="group" aria-label="Como foi?">
          {(['errei', 'dificil', 'facil'] as const).map((r, i) => (
            <button
              key={r}
              type="button"
              className="grande"
              disabled={ocupado}
              aria-keyshortcuts={String(i + 1)}
              onClick={() => void responder(r)}
            >
              {ROTULO_RESPOSTA[r]}
            </button>
          ))}
        </div>
      )}
      <details className="menu-drill">
        <summary className="botao discreto">Mais opções</summary>
        <div className="linha-acoes">
          <button
            type="button"
            onClick={() => {
              suspenderCartao(repo, atual.id).then(avancar, () => {
                setFalha('Não foi possível suspender o cartão. Nada foi alterado.');
              });
            }}
          >
            Suspender este cartão
          </button>
          <Link to={`/recall/cartoes/${atual.id}`} className="botao">
            Editar
          </Link>
          {atual.erroId && (
            <Link to={`/recall/erros/${atual.erroId}`} className="botao">
              Abrir erro de origem
            </Link>
          )}
        </div>
      </details>
    </>
  );
}
