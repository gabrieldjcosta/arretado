import { useState } from 'react';
import { OUTROS } from '../../dominios/acervo/vinculos';
import { Dialogo } from '../componentes/Dialogo';

/**
 * Escolha de disciplinas de uma norma do acervo (várias; "Outros" = sem disciplina). Oferece as
 * disciplinas do usuário, as sugeridas pelo acervo e as já escolhidas.
 */
export function EscolherDisciplinas({
  titulo,
  opcoes,
  escolhidas,
  aoConfirmar,
  aoFechar,
  ocupado = false,
  falha,
}: {
  titulo: string;
  opcoes: readonly string[];
  escolhidas: readonly string[];
  aoConfirmar: (nomes: string[]) => void;
  aoFechar: () => void;
  ocupado?: boolean;
  falha?: string | null;
}) {
  const [marcadas, setMarcadas] = useState(() => new Set(escolhidas));
  const todas = [...new Set([...opcoes, ...escolhidas])].filter((n) => n !== OUTROS);
  function alternar(nome: string) {
    setMarcadas((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(nome)) novo.add(nome);
      return novo;
    });
  }
  return (
    <Dialogo aberto aoFechar={aoFechar} titulo={`Disciplina: ${titulo}`}>
      <p className="dica">Marque uma ou mais. Sem nenhuma, a norma fica em “Outros”.</p>
      <ul className="lista-simples">
        {[...todas, OUTROS].map((nome) => (
          <li key={nome}>
            <label className="item-acervo">
              <input
                type="checkbox"
                checked={nome === OUTROS ? marcadas.size === 0 : marcadas.has(nome)}
                onChange={() => {
                  if (nome === OUTROS) setMarcadas(new Set());
                  else alternar(nome);
                }}
              />
              <span>{nome}</span>
            </label>
          </li>
        ))}
      </ul>
      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
      <div className="linha-acoes">
        <button
          type="button"
          className="principal"
          disabled={ocupado}
          onClick={() => {
            aoConfirmar([...marcadas]);
          }}
        >
          Confirmar
        </button>
        <button type="button" disabled={ocupado} onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </Dialogo>
  );
}
