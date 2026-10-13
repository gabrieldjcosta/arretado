import { useCallback, useState } from 'react';
import type { PendenciaDeReleitura } from '../../core/modelo';
import {
  marcacoesPendentes,
  pendenciasAbertas,
  resolverPendencia,
} from '../../dominios/acervo/pendencias';
import { removerMarcacao } from '../../dominios/legislacao/marcacoes';
import { useDados, useRepositorio } from '../dados/contexto';

const QUE_FICOU: Record<PendenciaDeReleitura['tipo'], string> = {
  estrela: 'Estrela',
  erro: 'Erro',
  vinculo: 'Vínculo com disciplina',
  lido_ate: 'Lido até',
  posicao: 'Onde você parou',
};

/**
 * Depois de atualizar a norma (6a) ou de corrigir o texto (11.7): o que perdeu o lugar e os grifos
 * e notas sem o trecho no texto de agora.
 */
export function PendenciasDaNorma({ normaId }: { normaId: string }) {
  const repo = useRepositorio();
  const carregar = useCallback(
    async (r: typeof repo) => ({
      pendencias: await pendenciasAbertas(r, normaId),
      grifos: await marcacoesPendentes(r, normaId),
    }),
    [normaId],
  );
  const { dados, recarregar } = useDados(carregar);
  // A marcação pendente não aparece no texto: sem esta saída, o aviso nunca sairia da tela.
  const [tirando, setTirando] = useState<string>();
  const [falha, setFalha] = useState(false);
  if (!dados || (dados.pendencias.length === 0 && dados.grifos.length === 0)) return null;
  return (
    <section className="aviso" aria-label="Para reler">
      <h2>Para reler</h2>
      <p>O texto desta norma mudou. O que ficou sem lugar no texto de agora:</p>
      {dados.pendencias.length > 0 && (
        <ul className="lista-simples">
          {dados.pendencias.map((p) => (
            <li key={p.id}>
              {QUE_FICOU[p.tipo]}: {p.rotulo ?? p.enderecoAntigo} saiu da norma.{' '}
              <button
                type="button"
                onClick={() => {
                  void resolverPendencia(repo, p.id).then(recarregar);
                }}
              >
                Já reli
              </button>
            </li>
          ))}
        </ul>
      )}
      {dados.grifos.length > 0 && (
        <>
          <p>Grifos e notas sem o trecho no texto de agora:</p>
          <ul className="lista-simples">
            {dados.grifos.map((m) => (
              <li key={m.id}>
                “{m.ancora.texto}”{m.nota !== undefined && <> Nota: {m.nota}</>}{' '}
                {tirando === m.id ? (
                  <>
                    <button
                      type="button"
                      className="perigoso"
                      onClick={() => {
                        setFalha(false);
                        removerMarcacao(repo, m.id).then(
                          () => {
                            setTirando(undefined);
                            recarregar();
                          },
                          () => {
                            setFalha(true);
                          },
                        );
                      }}
                    >
                      Tirar mesmo
                    </button>{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setTirando(undefined);
                      }}
                    >
                      Manter
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    aria-label={`Tirar “${m.ancora.texto}”`}
                    onClick={() => {
                      setTirando(m.id);
                    }}
                  >
                    Tirar
                  </button>
                )}
              </li>
            ))}
          </ul>
          {falha && (
            <p role="alert" className="aviso falha">
              Não foi possível tirar. Tente de novo.
            </p>
          )}
        </>
      )}
    </section>
  );
}
