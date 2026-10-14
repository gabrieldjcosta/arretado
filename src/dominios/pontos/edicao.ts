// Edição de disciplinas e pontos (F3-B, pacote B3). Tudo manual, tudo reversível por exclusão lógica;
// mudança de faixa entra no `logPrioridade` com origem "manual" (Parte 2 §10.2).
import type { DataCivil, Disciplina, Faixa, Ponto } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';

const limpar = (texto: string) => texto.trim().replace(/\s+/g, ' ');

export class EdicaoInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'EdicaoInvalida';
  }
}

function exigir(texto: string, o_que: string): string {
  const t = limpar(texto);
  if (!t) throw new EdicaoInvalida(`${o_que} não pode ficar vazio.`);
  if (t.length > 500) throw new EdicaoInvalida(`${o_que} passa de 500 caracteres.`);
  return t;
}

export async function criarDisciplina(repo: Repositorio, nome: string): Promise<Disciplina> {
  const texto = exigir(nome, 'O nome da matéria');
  const existentes = await repo.colecao('disciplinas').todosDoUsuario();
  const ordem = existentes.reduce((m, d) => Math.max(m, d.ordem ?? 0), 0) + 1;
  return repo.colecao('disciplinas').criar({ nome: texto, ordem });
}

export async function renomearDisciplina(
  repo: Repositorio,
  id: string,
  nome: string,
): Promise<Disciplina> {
  return repo.colecao('disciplinas').atualizar(id, { nome: exigir(nome, 'O nome da matéria') });
}

/** Exclui a matéria e os pontos dela (exclusão lógica). Devolve quantos pontos saíram junto. */
export async function excluirDisciplina(repo: Repositorio, id: string): Promise<number> {
  const pontos = (await repo.colecao('pontos').todosDoUsuario()).filter(
    (p) => p.disciplinaId === id,
  );
  for (const p of pontos) await repo.colecao('pontos').excluir(p.id);
  await repo.colecao('disciplinas').excluir(id);
  return pontos.length;
}

export interface DadosDoPonto {
  titulo: string;
  codigo?: string;
  disciplinaId?: string;
}

export async function criarPonto(
  repo: Repositorio,
  disciplinaId: string,
  titulo: string,
  codigo?: string,
): Promise<Ponto> {
  const texto = exigir(titulo, 'O título do ponto');
  const doGrupo = (await repo.colecao('pontos').todosDoUsuario()).filter(
    (p) => p.disciplinaId === disciplinaId,
  );
  const prioridade = doGrupo.reduce((m, p) => Math.max(m, p.prioridade ?? 0), 0) + 1;
  const cod = codigo ? limpar(codigo).slice(0, 50) : '';
  return repo.colecao('pontos').criar({
    titulo: texto,
    disciplinaId,
    prioridade,
    ...(cod ? { codigo: cod } : {}),
  });
}

/** Título, código e matéria. Ponto importado deixa de ser só leitura quando a pessoa o edita. */
export async function editarPonto(
  repo: Repositorio,
  id: string,
  dados: DadosDoPonto,
): Promise<Ponto> {
  const codigo = dados.codigo ? limpar(dados.codigo).slice(0, 50) : '';
  return repo.colecao('pontos').atualizar(id, {
    titulo: exigir(dados.titulo, 'O título do ponto'),
    codigo: codigo || undefined,
    ...(dados.disciplinaId ? { disciplinaId: dados.disciplinaId } : {}),
    somenteLeitura: false,
  });
}

/** Troca a faixa (ou tira, com `undefined`) e registra no log de prioridade. */
export async function mudarFaixa(
  repo: Repositorio,
  id: string,
  faixa: Faixa | undefined,
  motivo?: string,
): Promise<Ponto> {
  const atual = await repo.colecao('pontos').obter(id);
  if (!atual) throw new EdicaoInvalida('Ponto não encontrado.');
  if (atual.faixa === faixa) return atual;
  const m = motivo ? limpar(motivo).slice(0, 500) : '';
  const entrada = {
    em: repo.ctx.agora().toISOString(),
    antes: atual.faixa ? { faixa: atual.faixa } : {},
    depois: faixa ? { faixa } : {},
    origem: 'manual' as const,
    ...(m ? { motivo: m } : {}),
  };
  return repo.colecao('pontos').atualizar(id, {
    faixa,
    logPrioridade: [...(atual.logPrioridade ?? []), entrada],
  });
}

/** Adia o ponto até uma data (único status manual); a Próxima ação não o sugere antes. */
export async function adiarPonto(
  repo: Repositorio,
  id: string,
  ate: DataCivil,
  motivo?: string,
): Promise<Ponto> {
  const m = motivo ? limpar(motivo).slice(0, 500) : '';
  return repo.colecao('pontos').atualizar(id, {
    adiadoAte: ate,
    motivoAdiamento: m || undefined,
  });
}

export async function retomarPonto(repo: Repositorio, id: string): Promise<Ponto> {
  return repo.colecao('pontos').atualizar(id, {
    adiadoAte: undefined,
    motivoAdiamento: undefined,
  });
}

export async function excluirPonto(repo: Repositorio, id: string): Promise<void> {
  await repo.colecao('pontos').excluir(id);
}
