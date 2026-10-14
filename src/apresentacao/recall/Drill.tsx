import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import mascoteSorrindo from '../imagens/mascote-sorrindo.svg';
import { cotaDiaria, obterPreferencias } from '../../core/preferencias';
import type { Cartao, Erro, RespostaRevisao } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import {
  contarFrasesVencidas,
  contarVencidos,
  filaDoDia,
  revisar,
  suspenderCartao,
  vencemAmanha,
  versoEfetivo,
} from '../../dominios/recall/servico';
import { BarraFina } from '../componentes/BarraFina';
import { Esqueleto, Falha, Vazio } from '../componentes/estados';
import { LinhaDepois } from '../componentes/LinhaDepois';
import { useRepositorio } from '../dados/contexto';
import { ROTULO_RESPOSTA } from './rotulos';

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'revisando'; fila: Cartao[]; indice: number; virado: boolean }
  | { tipo: 'fim'; amanha: number; restantes: number; proximoLote: number; frases: number }
  | { tipo: 'falha' };

async function carregarVerso(repo: Repositorio, cartao: Cartao): Promise<string> {
  if (cartao.verso !== null) return cartao.verso;
  const erro: Erro | undefined = cartao.erroId
    ? await repo.colecao('erros').obter(cartao.erroId, { incluirExcluidos: true })
    : undefined;
  return versoEfetivo(cartao, erro);
}

/**
 * Drill: frente, virar, De novo / Difícil / Fácil. Sem caixa nem intervalo à vista (Parte 2 §9.2).
 * Revisa até a cota por vez (fatia 3); o resto da fila espera, sem ser cortado nem reordenado, e o
 * fim oferece "Revisar mais N".
 */
export function Drill() {
  const repo = useRepositorio();
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  // Verso guardado com o id do cartão: nunca mostra o verso do cartão anterior.
  const [verso, setVerso] = useState<{ id: string; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const inicio = useRef(0);
  const botaoVirar = useRef<HTMLButtonElement>(null);

  const cota = useRef(0);

  const terminar = useCallback(async () => {
    try {
      const [amanha, restantes, frases] = await Promise.all([
        vencemAmanha(repo),
        contarVencidos(repo),
        contarFrasesVencidas(repo),
      ]);
      setEstado({
        tipo: 'fim',
        amanha,
        restantes,
        proximoLote: Math.min(cota.current, restantes),
        frases,
      });
    } catch {
      setEstado({ tipo: 'falha' });
    }
  }, [repo]);

  /** Carrega o próximo lote: os mais atrasados primeiro, até a cota. */
  const iniciarLote = useCallback(
    (ativo: () => boolean = () => true) => {
      Promise.all([filaDoDia(repo), obterPreferencias(repo)]).then(
        ([fila, preferencias]) => {
          if (!ativo()) return;
          cota.current = cotaDiaria(preferencias);
          if (fila.length === 0) void terminar();
          else {
            setEstado({
              tipo: 'revisando',
              fila: fila.slice(0, cota.current),
              indice: 0,
              virado: false,
            });
          }
        },
        () => {
          if (ativo()) setEstado({ tipo: 'falha' });
        },
      );
    },
    [repo, terminar],
  );

  useEffect(() => {
    let vivo = true;
    iniciarLote(() => vivo);
    return () => {
      vivo = false;
    };
  }, [iniciarLote]);

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

  if (estado.tipo === 'fim') {
    return (
      <>
        <h1>Revisar</h1>
        <img className="vazio-mascote" src={mascoteSorrindo} alt="" width={96} />
        <Vazio
          titulo="Feito."
          acao={
            estado.frases > 0 ? (
              <>
                <Link to="/recall/frases/revisar" className="botao principal">
                  Seguir para as frases ({estado.frases})
                </Link>
                <Link to="/recall" className="botao discreto">
                  Voltar ao Recall
                </Link>
              </>
            ) : (
              <Link to="/recall" className="botao principal">
                Voltar ao Recall
              </Link>
            )
          }
        >
          {estado.restantes > 0 && (
            <>
              <p>
                {estado.restantes === 1
                  ? 'Resta 1 cartão'
                  : `Restam ${String(estado.restantes)} cartões`}{' '}
                para hoje. Os outros esperam; nada é apagado.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEstado({ tipo: 'carregando' });
                  iniciarLote();
                }}
              >
                Revisar mais {estado.proximoLote}
              </button>
            </>
          )}
          <p>Amanhã: {estado.amanha === 1 ? '1 cartão' : `${String(estado.amanha)} cartões`}.</p>
        </Vazio>
      </>
    );
  }

  if (!atual) return null;
  const restam = estado.fila.length - estado.indice - 1;
  const ICONE = { errei: '↻', dificil: '~', facil: '✓' } as const;
  return (
    <>
      <h1 className="visualmente-oculto">Revisar</h1>
      <div className="topo-drill">
        <Link to="/recall" className="botao discreto">
          Sair
        </Link>
        <BarraFina valor={estado.indice + 1} max={estado.fila.length} rotulo="Cartão" />
      </div>
      <article className="cartao-bloco cartao-drill" aria-label="Cartão">
        <p className="drill-frente texto-leitura">{atual.frente}</p>
        {estado.virado && (
          <div className="frase-correta" aria-live="polite">
            <p className="frase-correta-titulo">
              {atual.tipo === 'lacuna'
                ? 'Frase completa'
                : atual.erroId
                  ? 'Frase correta'
                  : 'Resposta'}
            </p>
            <p className="texto-leitura">
              {verso?.id !== atual.id ? (
                <span className="dica">Carregando…</span>
              ) : verso.texto ? (
                verso.texto
              ) : (
                <span className="dica">(sem verso — edite o cartão para completar)</span>
              )}
            </p>
          </div>
        )}
      </article>
      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
      {!estado.virado ? (
        <div className="linha-acoes acoes-drill">
          <button ref={botaoVirar} type="button" className="principal grande" onClick={virar}>
            Mostrar resposta
          </button>
        </div>
      ) : (
        <div className="linha-acoes acoes-drill respostas" role="group" aria-label="Como foi?">
          {(['errei', 'dificil', 'facil'] as const).map((r, i) => (
            <button
              key={r}
              type="button"
              className={`grande resposta-${r}`}
              disabled={ocupado}
              aria-keyshortcuts={String(i + 1)}
              onClick={() => void responder(r)}
            >
              <span aria-hidden="true">{ICONE[r]} </span>
              {ROTULO_RESPOSTA[r]}
            </button>
          ))}
        </div>
      )}
      <LinhaDepois>
        {restam > 0
          ? `${restam === 1 ? 'mais 1 cartão' : `mais ${String(restam)} cartões`} nesta rodada`
          : 'o fim desta rodada'}
      </LinhaDepois>
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
