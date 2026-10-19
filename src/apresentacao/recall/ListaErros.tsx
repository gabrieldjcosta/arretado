import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { Erro } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { completude } from '../../dominios/recall/causa';
import { listarErros, type FiltroErros } from '../../dominios/recall/servico';
import { Esqueleto, Vazio } from '../componentes/estados';
import { Icone } from '../componentes/Icone';
import { useDados } from '../dados/contexto';
import { ROTULO_RESULTADO, ROTULO_STATUS } from './rotulos';

const RESULTADOS: readonly string[] = ['errou', 'acertou_inseguro'];
const STATUS: readonly string[] = Object.keys(ROTULO_STATUS);

/** Filtro a partir do endereço; valores desconhecidos são ignorados. */
function filtroDe(p: URLSearchParams): FiltroErros {
  const resultado = p.get('resultado') ?? '';
  const status = p.get('status') ?? '';
  return {
    ...(RESULTADOS.includes(resultado) ? { resultado: resultado as Erro['resultado'] } : {}),
    ...(STATUS.includes(status) ? { status: status as Erro['status'] } : {}),
    ...(p.get('completar') === '1' ? { soACompletar: true } : {}),
  };
}

/**
 * Erros por recência, com filtros guardados no endereço (voltar preserva o filtro). "Erros" deixou de
 * ser aba do Fixar (D-D5); a lista vive em `/recall/erros` e se chega a ela pela aba Frases.
 */
function ListaErros() {
  const [params, setParams] = useSearchParams();
  const filtro = filtroDe(params);
  const chave = params.toString();
  const [paginas, setPaginas] = useState<{ chave: string; quantas: number }>({ chave, quantas: 1 });
  const quantas = paginas.chave === chave ? paginas.quantas : 1;

  const carregar = useCallback(
    async (repo: Repositorio) => {
      const f = filtroDe(new URLSearchParams(chave));
      const itens: Erro[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < quantas; i++) {
        const p = await listarErros(repo, f, cursor, 50);
        itens.push(...p.itens);
        cursor = p.proximoCursor;
        if (!cursor) break;
      }
      return { itens, haMais: cursor !== null };
    },
    [chave, quantas],
  );
  const { dados } = useDados(carregar);

  const mudarFiltro = (nome: string, valor: string) => {
    const novo = new URLSearchParams(params);
    if (valor) novo.set(nome, valor);
    else novo.delete(nome);
    setParams(novo, { replace: true });
  };

  const temFiltro = Object.keys(filtro).length > 0;

  return (
    <section aria-label="Erros">
      <details open={temFiltro}>
        <summary className="botao botao-texto na-margem">Filtros</summary>
        <div className="filtros">
          <div className="campo">
            <label htmlFor="filtro-resultado">Resultado</label>
            <select
              id="filtro-resultado"
              value={filtro.resultado ?? ''}
              onChange={(e) => {
                mudarFiltro('resultado', e.target.value);
              }}
            >
              <option value="">Todos</option>
              <option value="errou">{ROTULO_RESULTADO.errou}</option>
              <option value="acertou_inseguro">{ROTULO_RESULTADO.acertou_inseguro}</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="filtro-status">Situação</label>
            <select
              id="filtro-status"
              value={filtro.status ?? ''}
              onChange={(e) => {
                mudarFiltro('status', e.target.value);
              }}
            >
              <option value="">Todas</option>
              {(Object.keys(ROTULO_STATUS) as Erro['status'][]).map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS[s]}
                </option>
              ))}
            </select>
          </div>
          <label className="opcao">
            <input
              type="checkbox"
              checked={filtro.soACompletar === true}
              onChange={(e) => {
                mudarFiltro('completar', e.target.checked ? '1' : '');
              }}
            />
            Só os que faltam completar
          </label>
        </div>
      </details>

      {!dados ? (
        <Esqueleto />
      ) : dados.itens.length === 0 ? (
        temFiltro ? (
          <Vazio titulo="Nenhum erro com esses filtros" />
        ) : (
          <Vazio
            titulo="Nenhum erro registrado"
            acao={
              <Link to="/recall/registrar" className="botao principal">
                Registrar erro
              </Link>
            }
          >
            <p>Registre um erro ou acerto inseguro em menos de 30 segundos.</p>
          </Vazio>
        )
      ) : (
        <>
          <ul className="lista-simples">
            {dados.itens.map((e) => (
              <li key={e.id}>
                <Link to={`/recall/erros/${e.id}`} className="item-lista">
                  <span className="estado-texto">
                    <Icone nome={e.resultado === 'errou' ? 'fechar' : 'ajuda'} />
                    {ROTULO_RESULTADO[e.resultado]}
                  </span>
                  <span>{e.fraseCorreta ?? e.oQueFoi}</span>
                  {completude(e) === 'rapido' && <span className="marcador">completar</span>}
                </Link>
              </li>
            ))}
          </ul>
          {dados.haMais && (
            <div className="linha-acoes">
              <button
                type="button"
                onClick={() => {
                  setPaginas({ chave, quantas: quantas + 1 });
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

/** A página dos Erros: o título, o caminho de volta às Frases e a lista com os filtros. */
export function ErrosComFiltros() {
  return (
    <>
      <h1>Erros</h1>
      <p className="voltar-da-lista">
        <Link to="/recall/frases" className="botao botao-texto na-margem">
          Voltar às frases
        </Link>
      </p>
      <ListaErros />
    </>
  );
}
