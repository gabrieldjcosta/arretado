import { useCallback } from 'react';
import type { PendenciaDeReleitura } from '../../core/modelo';
import {
  marcacoesPendentes,
  pendenciasAbertas,
  resolverPendencia,
} from '../../dominios/acervo/pendencias';
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
              <li key={m.id}>“{m.ancora.texto}”</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
