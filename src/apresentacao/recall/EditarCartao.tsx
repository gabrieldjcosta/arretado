import { useCallback, useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Cartao, Erro } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { criarCartaoManual, editarCartao, versoEfetivo } from '../../dominios/recall/servico';
import { Esqueleto, Vazio } from '../componentes/estados';
import { useDados, useRepositorio } from '../dados/contexto';

/** Novo cartão manual ou edição (frente e verso). */
export function EditarCartao() {
  const { id = 'novo' } = useParams();
  const carregar = useCallback(
    async (repo: Repositorio) => {
      if (id === 'novo') return { cartao: null, erro: undefined };
      const cartao = (await repo.colecao('cartoes').obter(id)) ?? null;
      const erro = cartao?.erroId ? await repo.colecao('erros').obter(cartao.erroId) : undefined;
      return { cartao, erro };
    },
    [id],
  );
  const { dados } = useDados(carregar);
  if (!dados) return <Esqueleto />;
  if (id !== 'novo' && !dados.cartao) {
    return <Vazio titulo="Cartão não encontrado" acao={<Link to="/recall/cartoes">Voltar</Link>} />;
  }
  return <FormularioCartao key={id} cartao={dados.cartao} erro={dados.erro} />;
}

function FormularioCartao({ cartao, erro }: { cartao: Cartao | null; erro: Erro | undefined }) {
  const repo = useRepositorio();
  const navegar = useNavigate();
  const [frente, setFrente] = useState(cartao?.frente ?? '');
  const verso0 = cartao ? versoEfetivo(cartao, erro) : '';
  const [verso, setVerso] = useState(verso0);
  const [falha, setFalha] = useState<string | null>(null);

  const salvar = async (e: SubmitEvent) => {
    e.preventDefault();
    try {
      if (cartao) {
        await editarCartao(repo, cartao.id, {
          frente,
          // Só separa o verso da frase correta se ele de fato mudou.
          ...(verso !== verso0 ? { verso } : {}),
        });
      } else {
        await criarCartaoManual(repo, { frente, verso });
      }
      void navegar('/recall/cartoes');
    } catch {
      setFalha('Não foi possível salvar o cartão. Nada foi perdido.');
    }
  };

  return (
    <>
      <h1>{cartao ? 'Editar cartão' : 'Novo cartão'}</h1>
      <form onSubmit={(e) => void salvar(e)}>
        <div className="campo">
          <label htmlFor="cartao-frente">Frente (pergunta)</label>
          <textarea
            id="cartao-frente"
            rows={3}
            value={frente}
            onChange={(e) => {
              setFrente(e.target.value);
            }}
          />
        </div>
        <div className="campo">
          <label htmlFor="cartao-verso">Verso (resposta)</label>
          <textarea
            id="cartao-verso"
            rows={3}
            value={verso}
            onChange={(e) => {
              setVerso(e.target.value);
            }}
          />
          {cartao?.verso === null && (
            <p className="dica">
              Hoje o verso é a frase correta do erro. Se você mudar aqui, ele passa a ser só deste
              cartão.
            </p>
          )}
        </div>
        {falha && (
          <p role="alert" className="aviso falha">
            {falha}
          </p>
        )}
        <div className="linha-acoes">
          <button type="submit" className="principal" disabled={!frente.trim()}>
            Salvar
          </button>
          <Link to="/recall/cartoes" className="botao">
            Cancelar
          </Link>
          {erro && (
            <Link to={`/recall/erros/${erro.id}`} className="botao discreto">
              Abrir erro de origem
            </Link>
          )}
        </div>
      </form>
    </>
  );
}
