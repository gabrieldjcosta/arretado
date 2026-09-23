// "Apagar tudo" (Conta › Dados; direito do titular, D18): apaga o banco principal e os espaços.
import { apagarBanco, type Repositorio } from '../persistencia';

export async function apagarTudo(repo: Repositorio): Promise<void> {
  const espacos = await repo.colecao('espacos').todosDoUsuario();
  const nome = repo.db.name;
  repo.fechar();
  for (const e of espacos) await apagarBanco(e.nomeBanco);
  await apagarBanco(nome);
}
