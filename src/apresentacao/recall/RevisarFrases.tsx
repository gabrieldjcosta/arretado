import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import mascoteSorrindo from '../imagens/mascote-sorrindo.svg';
import { cotaDiaria, obterPreferencias } from '../../core/preferencias';
import type { Frase, RespostaFrase } from '../../core/modelo';
import { contarFrasesVencidas, filaDeFrases, revisarFrase } from '../../dominios/recall/servico';
import { BarraFina } from '../componentes/BarraFina';
import { Esqueleto, Falha, Vazio } from '../componentes/estados';
import { LinhaDepois } from '../componentes/LinhaDepois';
import { useRepositorio } from '../dados/contexto';

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'revisando'; fila: Frase[]; indice: number }
  | { tipo: 'fim'; restantes: number; proximoLote: number }
  | { tipo: 'falha' };

const RESPOSTAS = [
  { resposta: 'li', rotulo: 'Fácil', icone: '✓', classe: 'resposta-facil' },
  { resposta: 'de_novo', rotulo: 'De novo', icone: '↻', classe: 'resposta-dificil' },
] as const satisfies readonly {
  resposta: RespostaFrase;
  rotulo: string;
  icone: string;
  classe: string;
}[];

/**
 * Revisar frases (Frases 2): a frase no centro da tela, sem esconder nada. "Fácil" espaça a próxima
 * leitura; "De novo" traz a frase de volta amanhã. Cota própria, a mesma do dia (preferências).
 */
export function RevisarFrases() {
  const repo = useRepositorio();
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const inicio = useRef(0);
  const cota = useRef(0);

  const terminar = useCallback(async () => {
    try {
      const restantes = await contarFrasesVencidas(repo);
      setEstado({ tipo: 'fim', restantes, proximoLote: Math.min(cota.current, restantes) });
    } catch {
      setEstado({ tipo: 'falha' });
    }
  }, [repo]);

  const iniciarLote = useCallback(
    (ativo: () => boolean = () => true) => {
      Promise.all([filaDeFrases(repo), obterPreferencias(repo)]).then(
        ([fila, preferencias]) => {
          if (!ativo()) return;
          cota.current = cotaDiaria(preferencias);
          if (fila.length === 0) void terminar();
          else setEstado({ tipo: 'revisando', fila: fila.slice(0, cota.current), indice: 0 });
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
    if (atual) inicio.current = performance.now();
  }, [atual]);

  const responder = useCallback(
    async (resposta: RespostaFrase) => {
      if (estado.tipo !== 'revisando' || !atual || ocupado) return;
      setOcupado(true);
      setFalha(null);
      try {
        await revisarFrase(repo, atual.id, resposta, {
          duracaoMs: performance.now() - inicio.current,
        });
        if (estado.indice + 1 >= estado.fila.length) await terminar();
        else setEstado({ ...estado, indice: estado.indice + 1 });
      } catch {
        setFalha('Não foi possível registrar a revisão. Tente de novo; nada foi perdido.');
      } finally {
        setOcupado(false);
      }
    },
    [atual, estado, ocupado, repo, terminar],
  );

  // Atalhos: 1 = Fácil, 2 = De novo.
  useEffect(() => {
    if (estado.tipo !== 'revisando') return;
    const tecla = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest('a, button, summary, input, textarea, select')) return;
      const r = RESPOSTAS[Number(e.key) - 1];
      if (r) {
        e.preventDefault();
        void responder(r.resposta);
      }
    };
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
    };
  }, [estado.tipo, responder]);

  if (estado.tipo === 'carregando') return <Esqueleto linhas={4} />;

  if (estado.tipo === 'falha') {
    return (
      <>
        <h1>Revisar frases</h1>
        <Falha
          oQue="Não foi possível carregar as frases."
          oQueFazer="Recarregue a página. Se continuar, use o ! para relatar o problema."
        />
      </>
    );
  }

  if (estado.tipo === 'fim') {
    return (
      <>
        <h1>Revisar frases</h1>
        <img className="vazio-mascote" src={mascoteSorrindo} alt="" width={96} />
        <Vazio
          titulo="Feito."
          acao={
            <Link to="/recall/frases" className="botao principal">
              Voltar às frases
            </Link>
          }
        >
          {estado.restantes > 0 && (
            <>
              <p>
                {estado.restantes === 1
                  ? 'Resta 1 frase'
                  : `Restam ${String(estado.restantes)} frases`}{' '}
                para hoje. As outras esperam; nada é apagado.
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
        </Vazio>
      </>
    );
  }

  if (!atual) return null;
  const restam = estado.fila.length - estado.indice - 1;
  return (
    <>
      <h1 className="visualmente-oculto">Revisar frases</h1>
      <div className="topo-drill">
        <Link to="/recall/frases" className="botao discreto">
          Sair
        </Link>
        <BarraFina valor={estado.indice + 1} max={estado.fila.length} rotulo="Frase" />
      </div>
      <article className="cartao-bloco cartao-drill" aria-label="Frase">
        <p className="drill-frente texto-leitura">{atual.texto}</p>
      </article>
      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
      <div className="linha-acoes acoes-drill respostas" role="group" aria-label="Como foi?">
        {RESPOSTAS.map((r, i) => (
          <button
            key={r.resposta}
            type="button"
            className={`grande ${r.classe}`}
            disabled={ocupado}
            aria-keyshortcuts={String(i + 1)}
            onClick={() => void responder(r.resposta)}
          >
            <span aria-hidden="true">{r.icone} </span>
            {r.rotulo}
          </button>
        ))}
      </div>
      <LinhaDepois>
        {restam > 0
          ? `${restam === 1 ? 'mais 1 frase' : `mais ${String(restam)} frases`} nesta rodada`
          : 'o fim desta rodada'}
      </LinhaDepois>
      <details className="menu-drill">
        <summary className="botao discreto">Mais opções</summary>
        <div className="linha-acoes">
          <Link to={`/recall/frases/${atual.id}/cartao`} className="botao">
            Esconder um trecho (criar cartão)
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
