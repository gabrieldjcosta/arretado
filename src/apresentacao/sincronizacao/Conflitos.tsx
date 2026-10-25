// Conta › Conflitos (F4-B, B4; plano §5): as duas versões lado a lado, campos diferentes em
// destaque, e três escolhas: Ficar com a daqui / Ficar com a de lá / Escolher campo a campo.
// A escolha vira uma entrada normal do log (resolver.ts); o registro local fica como está até ela.
import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import type { Conflito } from '../../core/persistencia';
import {
  camposDiferentes,
  listarConflitos,
  ResolucaoPendenteDeEnvio,
  resolverConflito,
  type Escolha,
} from '../../core/sincronizacao';
import { ROTULO_COLECAO } from '../conta/dados/rotulos';
import { useDados, useRepositorio } from '../dados/contexto';
import { formatarQuando } from '../recall/rotulos';
import { useSincronizacao } from './contexto';
import './estilos-sincronizacao.css';

/** Campos que a pessoa não escolhe: identidade e carimbos do sistema. */
const OCULTOS = new Set(['id', 'usuarioId', 'criadoEm', 'atualizadoEm', 'tsLogico', 'origem']);

function valorEmTexto(v: unknown): string {
  if (v === undefined) return '(sem valor)';
  if (v === null) return '(vazio)';
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v);
}

type Lado = 'daqui' | 'de-la';

function Versao({
  titulo,
  registro,
  diferentes,
}: {
  titulo: string;
  registro: Record<string, unknown> | null;
  diferentes: readonly string[];
}) {
  if (!registro) {
    return (
      <div className="versao-conflito">
        <h4>{titulo}</h4>
        <p className="dica">Apagado.</p>
      </div>
    );
  }
  const campos = Object.keys(registro).filter((k) => !OCULTOS.has(k));
  return (
    <div className="versao-conflito">
      <h4>{titulo}</h4>
      <dl>
        {campos.map((k) => (
          <div key={k} className={diferentes.includes(k) ? 'campo-diferente' : undefined}>
            <dt>{k}</dt>
            <dd>
              {diferentes.includes(k) ? (
                <mark>{valorEmTexto(registro[k])}</mark>
              ) : (
                valorEmTexto(registro[k])
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ItemDeConflito({
  conflito,
  nomeDoAparelho,
  aoResolver,
}: {
  conflito: Conflito;
  nomeDoAparelho: string;
  aoResolver: (escolha: Escolha) => Promise<void>;
}) {
  const [modo, setModo] = useState<'escolha' | 'campos' | 'gravando'>('escolha');
  const [porCampo, setPorCampo] = useState<Record<string, Lado>>({});
  const [falha, setFalha] = useState<'pendente' | 'outra' | null>(null);
  const diferentes = camposDiferentes(conflito.minha, conflito.deles).filter(
    (k) => !OCULTOS.has(k),
  );

  const resolver = async (escolha: Escolha) => {
    setModo('gravando');
    setFalha(null);
    try {
      await aoResolver(escolha);
    } catch (e: unknown) {
      setFalha(e instanceof ResolucaoPendenteDeEnvio ? 'pendente' : 'outra');
      setModo('escolha');
    }
  };

  const idTitulo = `conflito-${conflito.id}`;
  return (
    <li className="cartao-bloco conflito" aria-labelledby={idTitulo}>
      <h3 id={idTitulo}>
        {ROTULO_COLECAO[conflito.colecao]}{' '}
        <span className="dica">
          · mudado em {nomeDoAparelho} em {formatarQuando(conflito.criadoEm)}
        </span>
      </h3>
      {conflito.deles === null && conflito.minha !== null && (
        <p>Foi apagado no outro Aparelho; você mudou aqui.</p>
      )}
      {conflito.minha === null && conflito.deles !== null && (
        <p>Você apagou aqui; o outro Aparelho mudou.</p>
      )}
      <div className="lado-a-lado">
        <Versao titulo="A daqui" registro={conflito.minha} diferentes={diferentes} />
        <Versao
          titulo={`A de lá (${nomeDoAparelho})`}
          registro={conflito.deles}
          diferentes={diferentes}
        />
      </div>

      {modo === 'campos' && (
        <fieldset className="campo-a-campo">
          <legend>Para cada campo, qual versão fica?</legend>
          {diferentes.map((k) => (
            <div key={k} className="escolha-de-campo">
              <span className="nome-do-campo">{k}</span>
              {(['daqui', 'de-la'] as const).map((lado) => (
                <label key={lado} className="opcao">
                  <input
                    type="radio"
                    name={`${conflito.id}-${k}`}
                    checked={(porCampo[k] ?? 'de-la') === lado}
                    onChange={() => {
                      setPorCampo((p) => ({ ...p, [k]: lado }));
                    }}
                  />
                  {lado === 'daqui' ? 'A daqui' : 'A de lá'}
                </label>
              ))}
            </div>
          ))}
        </fieldset>
      )}

      {falha === 'pendente' && (
        <p className="aviso" role="alert">
          Há mudanças deste registro ainda não enviadas. Sincronize antes de escolher (Conta ›
          Sincronização › Sincronizar agora).
        </p>
      )}
      {falha === 'outra' && (
        <p className="aviso" role="alert">
          Problema ao gravar a escolha. Nada mudou; tente de novo.
        </p>
      )}

      <div className="linha-acoes">
        {modo === 'campos' ? (
          <>
            <button
              type="button"
              className="botao"
              onClick={() => {
                void resolver({
                  tipo: 'campos',
                  daqui: diferentes.filter((k) => porCampo[k] === 'daqui'),
                });
              }}
            >
              Usar esta combinação
            </button>
            <button
              type="button"
              className="botao discreto"
              onClick={() => {
                setModo('escolha');
              }}
            >
              Voltar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="botao"
              disabled={modo === 'gravando'}
              onClick={() => {
                void resolver({ tipo: 'daqui' });
              }}
            >
              Ficar com a daqui
            </button>
            <button
              type="button"
              className="botao"
              disabled={modo === 'gravando'}
              onClick={() => {
                void resolver({ tipo: 'de-la' });
              }}
            >
              Ficar com a de lá
            </button>
            {conflito.minha !== null && conflito.deles !== null && diferentes.length > 1 && (
              <button
                type="button"
                className="botao discreto"
                disabled={modo === 'gravando'}
                onClick={() => {
                  setModo('campos');
                }}
              >
                Escolher campo a campo
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export function Conflitos() {
  const repo = useRepositorio();
  const sync = useSincronizacao();
  const conflitos = useDados(useCallback((r) => listarConflitos(r.db), []));
  const aparelhos = useDados(useCallback((r) => r.colecao('aparelhos').todosDoUsuario(), []));
  const nomeDe = (id: string) =>
    aparelhos.dados?.find((a) => a.id === id)?.nome ?? 'outro Aparelho';

  const resolver = async (id: string, escolha: Escolha) => {
    await resolverConflito(
      repo,
      { usuarioId: repo.ctx.usuarioId, aparelhoId: repo.ctx.aparelhoId },
      id,
      escolha,
    );
    sync?.sincronizarAgora();
  };

  const lista = conflitos.dados;
  return (
    <>
      <h1>Conflitos</h1>
      <p className="dica">
        Um Conflito aparece quando o mesmo registro mudou em dois Aparelhos sem um ver o outro. Nada
        é sobrescrito até você escolher. <Link to="/conta/sincronizacao">Sincronização</Link>
      </p>
      {lista === undefined ? (
        <p className="dica" role="status">
          Carregando…
        </p>
      ) : lista.length === 0 ? (
        <p role="status">Nenhum Conflito. Seus Aparelhos concordam.</p>
      ) : (
        <ul className="lista-simples lista-de-conflitos">
          {lista.map((c) => (
            <ItemDeConflito
              key={c.id}
              conflito={c}
              nomeDoAparelho={nomeDe(c.aparelhoDeles)}
              aoResolver={(escolha) => resolver(c.id, escolha)}
            />
          ))}
        </ul>
      )}
    </>
  );
}
