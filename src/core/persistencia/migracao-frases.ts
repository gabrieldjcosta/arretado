// Esquema v6 (Frases 1, D25, T22): cada erro antigo com frase correta ganha a sua Frase. Roda depois
// de abrir o banco (e depois de importar um pacote), pelas coleções: valida, grava no log e usa o
// relógio lógico, o que o upgrade do IndexedDB não faria. Idempotente: erro que já tem Frase não
// excluída é pulado, então rodar de novo não duplica nada. Erro restaurado por importação cuja
// Frase fora excluída junto com ele ganha Frase nova (nenhum erro vivo fica sem a sua).
import { dataCivil } from '../datas';
import type { Erro } from '../modelo';
import type { Repositorio } from './repositorio';

/** Marca, em `meta`, que a migração já rodou neste banco (não roda a cada abertura). */
export const CHAVE_MIGRACAO_FRASES = 'migracao.frasesDosErros';

/** Cria as Frases que faltam; devolve quantas criou. */
export async function migrarFrasesDosErros(repo: Repositorio): Promise<number> {
  return repo.transacao(async () => {
    const erros = await repo.db
      .tabela('erros')
      .where('usuarioId')
      .equals(repo.ctx.usuarioId)
      .toArray();
    const faltam: Erro[] = [];
    for (const e of erros) {
      if (e.excluidoEm !== null || !e.fraseCorreta?.trim()) continue;
      const daFrase = repo.db.tabela('frases').where('erroId').equals(e.id);
      if ((await daFrase.filter((f) => f.excluidoEm === null).count()) > 0) continue;
      faltam.push(e);
    }
    // Ids em ordem de criação dos erros: a lista por recência fica na ordem de antes.
    faltam.sort((a, b) => (a.criadoEm < b.criadoEm ? -1 : a.criadoEm > b.criadoEm ? 1 : 0));
    const hoje = dataCivil(repo.ctx.agora());
    await repo.colecao('frases').criarLote(
      faltam.map((e) => ({
        dados: {
          texto: (e.fraseCorreta ?? '').trim(),
          origemTipo: 'erro' as const,
          erroId: e.id,
          ...(e.disciplinaId ? { disciplinaId: e.disciplinaId } : {}),
          ...(e.pontoId ? { pontoId: e.pontoId } : {}),
          estado: e.status === 'descartado' ? ('arquivada' as const) : ('ativa' as const),
          proximaRevisao: hoje,
        },
      })),
      { origem: 'sistema' },
    );
    await repo.db.meta.put({ chave: CHAVE_MIGRACAO_FRASES, valor: true });
    return faltam.length;
  });
}
