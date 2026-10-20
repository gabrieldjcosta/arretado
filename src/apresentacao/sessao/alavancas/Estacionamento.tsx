// Estacionamento de distração: um campo, sem sair do estudo (A3a). Guardar não muda de tela, não
// tira o foco do campo e não cobra nada depois.
import { useRef, useState } from 'react';
import type { Sessao } from '../../../core/modelo';
import { estacionar, notasPendentes } from '../../../dominios/sessao/estacionamento';
import { useRepositorio } from '../../dados/contexto';
import './estilos-alavancas.css';

export function Estacionamento({ sessao }: { sessao: Sessao }) {
  const repo = useRepositorio();
  const campo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState('');
  const pendentes = notasPendentes(sessao);
  const guardar = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    estacionar(repo, sessao.id, texto).then(
      () => {
        setTexto('');
        setAviso('Guardado para depois.');
        campo.current?.focus();
      },
      () => {
        setAviso('Não foi possível guardar. Tente de novo.');
      },
    );
  };
  return (
    <section className="alavanca estacionamento" aria-labelledby="estacionamento-titulo">
      <h2 id="estacionamento-titulo">Estacionamento</h2>
      <form onSubmit={guardar} className="estacionamento-form">
        <div className="campo">
          <label htmlFor="estacionamento-texto">Deixar para depois</label>
          <input
            ref={campo}
            id="estacionamento-texto"
            type="text"
            maxLength={500}
            autoComplete="off"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setAviso('');
            }}
            aria-describedby="estacionamento-dica"
          />
          <p id="estacionamento-dica" className="dica">
            Anote a distração em uma linha e siga. Nada aqui é cobrado. Fica no Hoje, em Para
            lembrar.
          </p>
        </div>
        <button type="submit">Guardar</button>
      </form>
      <p role="status" className="dica">
        {aviso}
      </p>
      {pendentes.length > 0 && (
        <ul className="estacionamento-lista" aria-label="Guardado nesta Sessão">
          {pendentes.map((n) => (
            <li key={n.em}>{n.texto}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
