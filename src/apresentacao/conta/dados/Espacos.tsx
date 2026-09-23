import { useState } from 'react';
import type { Espaco } from '../../../core/modelo';
import {
  ImportacaoInvalida,
  mesclarEspaco,
  planejarMesclagem,
  removerEspaco,
  type PacoteLido,
  type Previa,
} from '../../../core/pacote';
import type { Repositorio } from '../../../core/persistencia';
import { Dialogo } from '../../componentes/Dialogo';
import { useDados, useRepositorio } from '../../dados/contexto';
import { PreviaImportacao, type Resolucoes } from './PreviaImportacao';
import { formatarInstante } from './rotulos';

async function carregar(repo: Repositorio) {
  return (
    await repo.colecao('espacos').listarPagina({
      indice: 'usuarioId',
      de: repo.ctx.usuarioId,
      ate: repo.ctx.usuarioId,
      limite: 50,
    })
  ).itens;
}

/** Espaços separados (modo 7): conferir e mesclar, ou remover. */
export function Espacos() {
  const repo = useRepositorio();
  const { dados } = useDados(carregar);
  const [mesclando, setMesclando] = useState<{
    espaco: Espaco;
    pacote: PacoteLido;
    previa: Previa;
  } | null>(null);
  const [removendo, setRemovendo] = useState<Espaco | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'falha'; texto: string } | null>(null);

  const executar = async (fn: () => Promise<void>) => {
    setOcupado(true);
    setMensagem(null);
    try {
      await fn();
    } catch (excecao) {
      setMensagem({
        tipo: 'falha',
        texto:
          excecao instanceof ImportacaoInvalida
            ? excecao.message
            : 'Não foi possível concluir. Nada foi alterado.',
      });
    } finally {
      setOcupado(false);
    }
  };

  // Some quando não há espaço, mas não antes de mostrar a confirmação da última remoção.
  if (!dados || (dados.length === 0 && !mensagem)) return null;

  return (
    <section className="cartao-bloco" aria-labelledby="t-espacos">
      <h2 id="t-espacos">Espaços separados</h2>
      {mensagem && (
        <p
          role={mensagem.tipo === 'ok' ? 'status' : 'alert'}
          className={mensagem.tipo === 'ok' ? 'sucesso' : 'aviso'}
        >
          {mensagem.texto}
        </p>
      )}
      {mesclando ? (
        <>
          <p>
            Mesclar <strong>{mesclando.espaco.nome}</strong> com os seus dados:
          </p>
          <PreviaImportacao
            previa={mesclando.previa}
            confirmando={ocupado}
            rotuloConfirmar="Mesclar"
            aoVoltar={() => {
              setMesclando(null);
            }}
            aoConfirmar={(resolucoes: Resolucoes) => {
              void executar(async () => {
                await mesclarEspaco(repo, mesclando.pacote, mesclando.previa, resolucoes);
                setMesclando(null);
                setMensagem({
                  tipo: 'ok',
                  texto: 'Espaço mesclado. Se precisar, desfaça em "Importações".',
                });
              });
            }}
          />
        </>
      ) : (
        <ul className="lista-simples">
          {dados.map((e) => (
            <li key={e.id}>
              <span>
                {e.nome}
                <br />
                <span className="dica">Importado em {formatarInstante(e.criadoEm)}</span>
              </span>
              <span className="linha-acoes">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => {
                    void executar(async () => {
                      const { pacote, previa } = await planejarMesclagem(repo, e.id);
                      setMesclando({ espaco: e, pacote, previa });
                    });
                  }}
                >
                  Ver mesclagem
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => {
                    setRemovendo(e);
                  }}
                >
                  Remover
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Dialogo
        aberto={removendo !== null}
        aoFechar={() => {
          setRemovendo(null);
        }}
        titulo="Remover espaço separado?"
      >
        <p>O conteúdo do espaço {removendo?.nome} será apagado. Seus dados não são afetados.</p>
        <div className="linha-acoes">
          <button
            type="button"
            className="perigoso"
            disabled={ocupado}
            onClick={() => {
              const alvo = removendo;
              if (!alvo) return;
              void executar(async () => {
                await removerEspaco(repo, alvo.id);
                setRemovendo(null);
                setMensagem({ tipo: 'ok', texto: 'Espaço removido.' });
              });
            }}
          >
            Remover
          </button>
          <button
            type="button"
            onClick={() => {
              setRemovendo(null);
            }}
          >
            Cancelar
          </button>
        </div>
      </Dialogo>
    </section>
  );
}
