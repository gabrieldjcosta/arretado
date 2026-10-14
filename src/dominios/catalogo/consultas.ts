// Consultas puras sobre o catálogo carregado. Sem estado, sem I/O.
import type {
  CarreiraDoCatalogo,
  DisciplinaConsolidada,
  DisciplinaDoEdital,
  EditalDoCatalogo,
  EntradaDaCarreira,
  FaixaDoCatalogo,
  IndiceDoCatalogo,
} from './esquemas';

export type CarreiraDisponivel = Extract<EntradaDaCarreira, { disponivel: true }>;

export function carreirasDisponiveis(indice: IndiceDoCatalogo): CarreiraDisponivel[] {
  return indice.carreiras.filter((c): c is CarreiraDisponivel => c.disponivel);
}

/** Carreiras ainda sem dados: a interface mostra como "em breve" e cai no caminho "sem edital". */
export function carreirasPendentes(indice: IndiceDoCatalogo): string[] {
  return indice.carreiras.filter((c) => !c.disponivel).map((c) => c.nome);
}

/** Editais que o app pode oferecer: com rótulo e ao menos uma disciplina, mais recentes primeiro. */
export function editaisOferecidos(carreira: CarreiraDoCatalogo): EditalDoCatalogo[] {
  return carreira.editais
    .filter((e) => e.rotulo !== null && e.situacao !== 'NÃO LOCALIZADO' && e.disciplinas.length > 0)
    .sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0) || a.id.localeCompare(b.id));
}

const PESO_FAIXA: Record<FaixaDoCatalogo, number> = { Altíssima: 4, Alta: 3, Média: 2, Baixa: 1 };

/** Disciplinas da carreira, as mais cobradas primeiro (faixa sugerida, depois presença, depois nome). */
export function disciplinasSugeridas(carreira: CarreiraDoCatalogo): DisciplinaConsolidada[] {
  return [...carreira.disciplinas].sort(
    (a, b) =>
      (b.faixaSugerida ? PESO_FAIXA[b.faixaSugerida] : 0) -
        (a.faixaSugerida ? PESO_FAIXA[a.faixaSugerida] : 0) ||
      b.presenteEm - a.presenteEm ||
      a.nome.localeCompare(b.nome, 'pt-BR'),
  );
}

/** Texto honesto da base da sugestão de faixa; vazio quando o catálogo não tem base. */
export function explicarFaixa(d: DisciplinaConsolidada): string {
  if (!d.faixaSugerida || !d.faixaBase) return '';
  return d.faixaOrigem === 'derivada'
    ? `Sugestão pela amostra de editais: ${d.faixaBase}.`
    : `Segundo o edital: ${d.faixaBase}.`;
}

/** Disciplina do edital que corresponde a uma disciplina consolidada (nome ou variante). */
export function disciplinaNoEdital(
  edital: EditalDoCatalogo,
  consolidada: DisciplinaConsolidada,
): DisciplinaDoEdital | undefined {
  const chaves = new Set([consolidada.nome, ...consolidada.variantes].map(chaveDeNome));
  return edital.disciplinas.find((d) =>
    [d.nome, d.nomeNoEdital].some((n) => n !== undefined && chaves.has(chaveDeNome(n))),
  );
}

export function chaveDeNome(nome: string): string {
  return nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Disciplinas de um edital na ordem dele, com o nome consolidado quando há. */
export function disciplinasDoEdital(
  edital: EditalDoCatalogo,
): { disciplina: DisciplinaDoEdital; nome: string }[] {
  return [...edital.disciplinas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((disciplina) => ({ disciplina, nome: disciplina.nome ?? disciplina.nomeNoEdital }));
}

/** "baseado no edital X de AAAA" para a tela; o catálogo já traz o rótulo pronto. */
export function rotuloDoEdital(edital: EditalDoCatalogo): string {
  return edital.rotulo ?? `edital ${edital.orgao}`;
}
