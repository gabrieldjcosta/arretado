import { Link } from 'react-router';
import { SECOES } from '../orientacoes/conteudo';

export function Privacidade() {
  const secao = SECOES.find((s) => s.id === 'privacidade');
  const dados = SECOES.find((s) => s.id === 'seus-dados');
  return (
    <>
      <h1>Privacidade e segurança</h1>
      {[dados, secao].map(
        (s) =>
          s && (
            <section key={s.id}>
              <h2>{s.titulo}</h2>
              {s.paragrafos.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ),
      )}
      <div className="linha-acoes">
        <Link to="/conta/dados" className="botao">
          Exportar ou apagar meus dados
        </Link>
      </div>
    </>
  );
}
