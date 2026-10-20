import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { Cartao, EstadoCartao } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import {
  arquivarCartao,
  listarCartoes,
  reativarCartao,
  suspenderCartao,
} from '../../dominios/recall/servico';
import { Esqueleto, Vazio } from '../componentes/estados';
import { Icone } from '../componentes/Icone';
import { useDados, useRepositorio } from '../dados/contexto';
import { hoje } from '../../dominios/recall/servico';
import { formatarData, ROTULO_ESTADO } from './rotulos';

const ESTADOS: EstadoCartao[] = ['ativo', 'suspenso', 'arquivado'];

/** Aba Cartões: ativos, suspensos (fora da fila, sem perder a caixa) e arquivados. */
export function ListaCartoes() {
  const repo = useRepositorio();
  const [params, setParams] = useSearchParams();
  const pedido = params.get('estado') ?? '';
  const estado: EstadoCartao = (ESTADOS as string[]).includes(pedido)
    ? (pedido as EstadoCartao)
    : 'ativo';
  const [paginas, setPaginas] = useState({ estado, quantas: 1 });
  const quantas = paginas.estado === estado ? paginas.quantas : 1;
  const carregar = useCallback(
    async (r: Repositorio) => {
      const itens: Cartao[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < quantas; i++) {
        const p = await listarCartoes(r, estado, cursor, 100);
        itens.push(...p.itens);
        cursor = p.proximoCursor;
        if (!cursor) break;
      }
      return { itens, haMais: cursor !== null };
    },
    [estado, quantas],
  );
  const { dados } = useDados(carregar);
  const hojeCivil = hoje(repo);

  return (
    <section aria-label="Cartões">
      <div className="linha-acoes" role="group" aria-label="Mostrar">
        {ESTADOS.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={estado === e}
            className={estado === e ? 'chip principal' : 'chip'}
            onClick={() => {
              setParams(e === 'ativo' ? {} : { estado: e }, { replace: true });
            }}
          >
            {ROTULO_ESTADO[e]}
          </button>
        ))}
        <Link to="/recall/cartoes/novo" className="botao">
          Novo cartão
        </Link>
      </div>
      {!dados ? (
        <Esqueleto />
      ) : dados.itens.length === 0 ? (
        <Vazio titulo={`Nenhum cartão ${ROTULO_ESTADO[estado].toLowerCase().replace(/s$/, '')}`}>
          {estado === 'ativo' && (
            <p>Cartões nascem de erros (ou em "Novo cartão"), nunca sozinhos.</p>
          )}
        </Vazio>
      ) : (
        <>
          <ul className="lista-simples">
            {dados.itens.map((c) => (
              <li key={c.id}>
                <span>
                  <Link to={`/recall/cartoes/${c.id}`} className="cartao-frente">
                    {c.frente || '(sem frente)'}
                  </Link>
                  <br />
                  {c.estado === 'ativo' && c.proximaRevisao <= hojeCivil && (
                    <span className="estado-texto estado-vencido">
                      <Icone nome="relogio" />
                      Para revisar
                    </span>
                  )}{' '}
                  <span className="dica">
                    {c.estado === 'ativo'
                      ? `Próxima revisão: ${formatarData(c.proximaRevisao)}`
                      : (c.motivoSuspensao ?? '')}
                  </span>
                </span>
                <span className="linha-acoes">
                  {c.estado === 'ativo' ? (
                    <button type="button" onClick={() => void suspenderCartao(repo, c.id)}>
                      Suspender
                    </button>
                  ) : (
                    <button type="button" onClick={() => void reativarCartao(repo, c.id)}>
                      Reativar
                    </button>
                  )}
                  {c.estado !== 'arquivado' && (
                    <button type="button" onClick={() => void arquivarCartao(repo, c.id)}>
                      Arquivar
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {dados.haMais && (
            <div className="linha-acoes">
              <button
                type="button"
                onClick={() => {
                  setPaginas({ estado, quantas: quantas + 1 });
                }}
              >
                Carregar mais
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
