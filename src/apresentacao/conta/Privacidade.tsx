import { Link } from 'react-router';
import { POLITICA_V3, SECOES, type Secao } from '../orientacoes/conteudo';

const Bloco = ({ secao }: { secao: Secao }) => (
  <section aria-labelledby={`p-${secao.id}`}>
    <h2 id={`p-${secao.id}`}>{secao.titulo}</h2>
    {secao.paragrafos.map((p) => (
      <p key={p}>{p}</p>
    ))}
  </section>
);

export function Privacidade() {
  const anteriores = SECOES.filter((s) => s.id === 'seus-dados' || s.id === 'privacidade');
  return (
    <>
      <h1>Política de privacidade (versão 3)</h1>
      <p className="dica">
        Vale quando você usa uma conta. Sem conta, continua valendo a versão 2, logo abaixo.
      </p>
      {POLITICA_V3.map((s) => (
        <Bloco key={s.id} secao={s} />
      ))}
      <details>
        <summary className="botao botao-texto na-margem">
          Versão anterior (política v2, para quem usa sem conta)
        </summary>
        {anteriores.map((s) => (
          <Bloco key={s.id} secao={s} />
        ))}
      </details>
      <div className="linha-acoes">
        <Link to="/conta/dados" className="botao">
          Exportar ou apagar meus dados
        </Link>
      </div>
    </>
  );
}
