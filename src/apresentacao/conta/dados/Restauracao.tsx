import { useState } from 'react';
import type { LogDeImportacao, Snapshot } from '../../../core/modelo';
import { desfazerImportacao, ImportacaoInvalida, restaurarSnapshot } from '../../../core/pacote';
import type { Repositorio } from '../../../core/persistencia';
import { Dialogo } from '../../componentes/Dialogo';
import { Esqueleto } from '../../componentes/estados';
import { useDados, useRepositorio } from '../../dados/contexto';
import { recarregarComAviso } from './recarga';
import { formatarInstante, formatarTamanho, MODOS } from './rotulos';

const MOTIVO: Record<Snapshot['motivo'], string> = {
  importacao: 'antes de uma importação',
  migracao: 'antes de atualizar o app',
  manual: 'criado por você',
  rollback: 'antes de desfazer',
};

async function carregar(repo: Repositorio) {
  const [logs, snapshots] = await Promise.all([
    repo.colecao('logsImportacao').listarPagina({ indice: 'em', ordem: 'desc', limite: 20 }),
    repo.colecao('snapshots').listarPagina({ indice: 'criadoEm', ordem: 'desc', limite: 20 }),
  ]);
  return { logs: logs.itens, snapshots: snapshots.itens };
}

function nomeModo(modo: LogDeImportacao['modo']): string {
  return MODOS.find((m) => m.modo === modo)?.nome ?? 'Simulação';
}

function totais(log: LogDeImportacao): string {
  const t = Object.values(log.contagens).reduce(
    (s, c) => ({
      criados: s.criados + c.criados,
      atualizados: s.atualizados + c.atualizados,
      excluidos: s.excluidos + c.excluidos,
    }),
    { criados: 0, atualizados: 0, excluidos: 0 },
  );
  return `${String(t.criados)} criados, ${String(t.atualizados)} atualizados, ${String(t.excluidos)} excluídos`;
}

type Acao = { tipo: 'desfazer'; log: LogDeImportacao } | { tipo: 'restaurar'; snapshot: Snapshot };

/** Importações (com desfazer) e pontos de restauração (Parte 2 §12.4). */
export function Restauracao() {
  const repo = useRepositorio();
  const { dados } = useDados(carregar);
  const [acao, setAcao] = useState<Acao | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'falha'; texto: string } | null>(null);

  const executar = async () => {
    if (!acao) return;
    setOcupado(true);
    setMensagem(null);
    try {
      const r =
        acao.tipo === 'desfazer'
          ? await desfazerImportacao(repo, acao.log.id)
          : await restaurarSnapshot(repo, acao.snapshot.id);
      if (r.identidadeMudou) {
        recarregarComAviso('Dados restaurados ao ponto escolhido.');
        return;
      }
      setMensagem({ tipo: 'ok', texto: 'Dados restaurados ao ponto escolhido.' });
      setAcao(null);
    } catch (excecao) {
      setMensagem({
        tipo: 'falha',
        texto:
          excecao instanceof ImportacaoInvalida
            ? excecao.message
            : 'Não foi possível restaurar. Nada foi alterado.',
      });
      setAcao(null);
    } finally {
      setOcupado(false);
    }
  };

  if (!dados) return <Esqueleto />;
  const snapshotsExistentes = new Set(dados.snapshots.map((s) => s.id));

  return (
    <section className="cartao-bloco" aria-labelledby="t-restauracao">
      <h2 id="t-restauracao">Importações e pontos de restauração</h2>
      {mensagem && (
        <p
          role={mensagem.tipo === 'ok' ? 'status' : 'alert'}
          className={mensagem.tipo === 'ok' ? 'sucesso' : 'aviso'}
        >
          {mensagem.texto}
        </p>
      )}
      <h3>Importações</h3>
      {dados.logs.length === 0 ? (
        <p className="dica">Nenhuma importação ainda.</p>
      ) : (
        <ul className="lista-simples">
          {dados.logs.map((log) => (
            <li key={log.id}>
              <span>
                {formatarInstante(log.em)} — {log.descricao ?? nomeModo(log.modo)}
                <br />
                <span className="dica">
                  {log.resultado === 'desfeita' ? 'Desfeita' : totais(log)}
                </span>
              </span>
              {log.resultado === 'concluida' &&
                log.snapshotId &&
                snapshotsExistentes.has(log.snapshotId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setAcao({ tipo: 'desfazer', log });
                    }}
                  >
                    Desfazer
                  </button>
                )}
            </li>
          ))}
        </ul>
      )}
      <h3>Pontos de restauração</h3>
      {dados.snapshots.length === 0 ? (
        <p className="dica">Criados automaticamente antes de cada importação.</p>
      ) : (
        <ul className="lista-simples">
          {dados.snapshots.map((s) => (
            <li key={s.id}>
              <span>
                {formatarInstante(s.criadoEm)} — {MOTIVO[s.motivo]}
                <br />
                <span className="dica">{formatarTamanho(s.tamanho)}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setAcao({ tipo: 'restaurar', snapshot: s });
                }}
              >
                Restaurar
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialogo
        aberto={acao !== null}
        aoFechar={() => {
          if (!ocupado) setAcao(null);
        }}
        titulo={acao?.tipo === 'desfazer' ? 'Desfazer importação?' : 'Restaurar este ponto?'}
      >
        <p>
          Os dados voltam a ser exatamente como estavam{' '}
          {acao?.tipo === 'desfazer'
            ? 'antes dessa importação'
            : acao
              ? `em ${formatarInstante(acao.snapshot.criadoEm)}`
              : ''}
          . O estado atual é guardado antes, e você pode voltar a ele.
        </p>
        <div className="linha-acoes">
          <button
            type="button"
            className="principal"
            disabled={ocupado}
            onClick={() => void executar()}
          >
            {ocupado ? 'Restaurando…' : 'Restaurar'}
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => {
              setAcao(null);
            }}
          >
            Cancelar
          </button>
        </div>
      </Dialogo>
    </section>
  );
}
