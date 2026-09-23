import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { SECOES, VERSAO_ORIENTACOES } from './conteudo';

export function Orientacoes() {
  const { secao } = useParams();

  useEffect(() => {
    if (!secao) return;
    const alvo = document.getElementById(`orientacao-${secao}`);
    alvo?.scrollIntoView({ block: 'start' });
    alvo?.focus();
  }, [secao]);

  return (
    <article>
      <h1>Orientações</h1>
      <nav aria-label="Seções das Orientações">
        <ul>
          {SECOES.map((s) => (
            <li key={s.id}>
              <Link to={`/orientacoes/${s.id}`}>{s.titulo}</Link>
            </li>
          ))}
        </ul>
      </nav>
      {SECOES.map((s) => (
        <section key={s.id} id={`orientacao-${s.id}`} tabIndex={-1} aria-labelledby={`t-${s.id}`}>
          <h2 id={`t-${s.id}`}>{s.titulo}</h2>
          {s.paragrafos.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}
      <p className="dica">Orientações, versão {VERSAO_ORIENTACOES}.</p>
    </article>
  );
}
