// Temporizador opcional (A3a): só informa. Não bloqueia, não toca alarme, não encerra a Sessão e o
// tempo não é medida de aprendizado. Conta só o tempo ativo (pausa congela).
import { useEffect, useState } from 'react';
import type { Sessao } from '../../../core/modelo';
import { definirTemporizador, segundosRestantes } from '../../../dominios/sessao/estacionamento';
import { useRepositorio } from '../../dados/contexto';
import './estilos-alavancas.css';

const OPCOES = [15, 25, 45, 60];

export function Temporizador({ sessao }: { sessao: Sessao }) {
  const repo = useRepositorio();
  const [agora, setAgora] = useState(() => repo.ctx.agora().toISOString());
  const [erro, setErro] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setAgora(repo.ctx.agora().toISOString());
    }, 15_000);
    return () => {
      clearInterval(id);
    };
  }, [repo]);
  const escolher = (min: number | undefined) => {
    setErro(false);
    definirTemporizador(repo, sessao.id, min).then(
      () => {
        setAgora(repo.ctx.agora().toISOString());
      },
      () => {
        setErro(true);
      },
    );
  };
  const restante = segundosRestantes(sessao, agora);
  return (
    <section className="alavanca temporizador" aria-labelledby="temporizador-titulo">
      <h2 id="temporizador-titulo">Temporizador (opcional)</h2>
      {restante === undefined ? (
        <div className="linha-acoes">
          {OPCOES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                escolher(m);
              }}
            >
              {m} min
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="temporizador-tempo">
            {restante > 0
              ? `Faltam cerca de ${Math.ceil(restante / 60)} min dos ${sessao.temporizadorMin} min.`
              : `Os ${sessao.temporizadorMin} min que você escolheu passaram.`}
          </p>
          {restante <= 0 && (
            <p role="status" className="dica">
              Siga, pause ou encerre quando quiser. Nada é cobrado.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              escolher(undefined);
            }}
          >
            Tirar o temporizador
          </button>
        </>
      )}
      {erro && <p className="dica">Não foi possível salvar. Tente de novo.</p>}
    </section>
  );
}
