// A troca de tela do Fio não pode deixar o quadro vazio. Cada tela monta o seu `useFio` do zero, e sem isto o
// passo ficava sem nada (só "Abrindo o passo…" para o leitor de tela) até a leitura do app voltar: uns 250 ms em
// que a tela que sai já tinha esmaecido e a que entra ainda não existia. O mockup aprovado cruza as duas sem vão.
// Aqui fica a última leitura de cada nome, por repositório: a tela nova parte dela (a mesma que a anterior
// mostrava) e a leitura nova a substitui quando chega, como o `useDados` já faz numa recarga.
import { useEffect } from 'react';
import type { Repositorio } from '../../../core/persistencia';
import { useDados, useRepositorio } from '../../dados/contexto';

const ultimas = new WeakMap<Repositorio, Map<string, unknown>>();

/**
 * `useDados` que, numa tela que acaba de montar, parte da última leitura do mesmo `nome` em vez de começar vazio.
 * `carregar` deve ser estável, como em `useDados`.
 */
export function useDadosDoFio<T>(
  nome: string,
  carregar: (repo: Repositorio) => Promise<T>,
): { dados: T | undefined; falha: unknown } {
  const repo = useRepositorio();
  const { dados, falha } = useDados(carregar);
  useEffect(() => {
    if (dados === undefined) return;
    let lidas = ultimas.get(repo);
    if (!lidas) {
      lidas = new Map();
      ultimas.set(repo, lidas);
    }
    lidas.set(nome, dados);
  }, [repo, nome, dados]);
  return { dados: dados ?? (ultimas.get(repo)?.get(nome) as T | undefined), falha };
}
