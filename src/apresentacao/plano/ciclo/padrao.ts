// Ciclo padrão (F5): quem tem Trilha e nunca teve Ciclo ganha um "Equilibrado, blocos de 25 min",
// para o Agora do Hoje seguir a Trilha sem assistente. Dá para mudar ou arquivar depois em Ciclo.
import { useEffect } from 'react';
import type { Repositorio } from '../../../core/persistencia';
import { criarCiclo, pesosDoModelo } from '../../../dominios/ciclos';
import { useRepositorio } from '../../dados/contexto';
import { carregarCiclo } from './carregar';

export const MINUTOS_DO_CICLO_PADRAO = 25;

let andamento: Promise<boolean> | undefined;

/** Cria o Ciclo padrão se houver Trilha e nenhum Ciclo (nem arquivado). Devolve se criou. */
export function garantirCicloPadrao(repo: Repositorio): Promise<boolean> {
  // Hoje e Trilha podem abrir juntos: uma criação por vez, para não nascerem dois.
  andamento ??= criarSeFaltar(repo).finally(() => {
    andamento = undefined;
  });
  return andamento;
}

async function criarSeFaltar(repo: Repositorio): Promise<boolean> {
  if ((await repo.colecao('ciclos').todosDoUsuario()).length > 0) return false;
  if ((await repo.colecao('pontos').contar()) === 0) return false;
  const { materias } = await carregarCiclo(repo);
  const { pesos } = pesosDoModelo('equilibrado', materias);
  if (pesos.length === 0) return false;
  await criarCiclo(repo, {
    nome: 'Equilibrado',
    modelo: 'equilibrado',
    pesos,
    minutos: MINUTOS_DO_CICLO_PADRAO,
  });
  return true;
}

/** Ao abrir uma tela que depende do Ciclo: garante o padrão sem avisar nem travar a tela. */
export function useCicloPadrao(): void {
  const repo = useRepositorio();
  useEffect(() => {
    garantirCicloPadrao(repo).catch(() => undefined);
  }, [repo]);
}
