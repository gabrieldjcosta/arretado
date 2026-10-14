// Resumos (F3-C, C1): Nota do tipo `resumo`. Texto puro: o corpo nunca vira HTML (a tela o mostra
// como texto), então colar HTML de outra fonte é inofensivo. Só o corpo é obrigatório (D25).
import { dataCivil, somarDias } from '../../core/datas';
import type { Frase, Nota } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';

export const CORPO_MAXIMO_DO_RESUMO = 50_000;

export interface EntradaDoResumo {
  corpo: string;
  titulo?: string;
  disciplinaId?: string;
}

/** O título quando a pessoa não escreveu um: a primeira linha do corpo, encurtada. */
export function tituloDoResumo(corpo: string, titulo?: string): string {
  const t = titulo?.trim();
  if (t) return t.slice(0, 500);
  const linha = corpo.trim().split('\n', 1)[0] ?? '';
  return linha.length > 80 ? `${linha.slice(0, 79)}…` : linha;
}

function normalizado(entrada: EntradaDoResumo) {
  const corpo = entrada.corpo.trim();
  if (!corpo) throw new Error('Escreva o resumo.');
  if (corpo.length > CORPO_MAXIMO_DO_RESUMO) throw new Error('O resumo passou do tamanho máximo.');
  return { corpo, titulo: tituloDoResumo(corpo, entrada.titulo) };
}

export async function criarResumo(repo: Repositorio, entrada: EntradaDoResumo): Promise<Nota> {
  const { corpo, titulo } = normalizado(entrada);
  const nota = await repo.colecao('notas').criar({
    titulo,
    tipo: 'resumo',
    conteudo: corpo,
    ...(entrada.disciplinaId ? { disciplinaId: entrada.disciplinaId } : {}),
  });
  return nota;
}

export async function editarResumo(
  repo: Repositorio,
  id: string,
  entrada: EntradaDoResumo,
): Promise<Nota> {
  const { corpo, titulo } = normalizado(entrada);
  return repo.colecao('notas').atualizar(id, { titulo, conteudo: corpo });
}

export async function excluirResumo(repo: Repositorio, id: string): Promise<void> {
  await repo.colecao('notas').excluir(id);
}

/** Resumos, os mais recentes primeiro. */
export async function listarResumos(repo: Repositorio): Promise<Nota[]> {
  const todas = (await repo.colecao('notas').listarPagina({ limite: 500 })).itens;
  return todas
    .filter((n) => n.tipo === 'resumo')
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
}

export async function lerResumo(repo: Repositorio, id: string): Promise<Nota | undefined> {
  const nota = await repo.colecao('notas').obter(id);
  return nota?.tipo === 'resumo' ? nota : undefined;
}

/** "Enviar às frases": a Frase de origem `trecho` com o link de volta ao intervalo do resumo. */
export async function criarFraseDeResumo(
  repo: Repositorio,
  entrada: {
    texto: string;
    notaId: string;
    citado: string;
    inicio: number;
    fim: number;
    disciplinaId?: string;
  },
): Promise<Frase> {
  const texto = entrada.texto.trim();
  if (!texto) throw new Error('Escreva a frase.');
  const frase = await repo.colecao('frases').criar({
    texto,
    origemTipo: 'trecho',
    ...(entrada.disciplinaId ? { disciplinaId: entrada.disciplinaId } : {}),
    trechoDeNota: {
      notaId: entrada.notaId,
      texto: entrada.citado.slice(0, 5_000),
      inicio: entrada.inicio,
      fim: entrada.fim,
    },
    estado: 'ativa',
    proximaRevisao: somarDias(dataCivil(repo.ctx.agora()), 1),
  });
  repo.eventos.emitir('frase.criada', { fraseId: frase.id });
  return frase;
}
