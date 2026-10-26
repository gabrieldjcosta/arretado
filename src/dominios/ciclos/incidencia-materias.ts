// Peso do Ciclo pela incidência por matéria do recorte (banca × cargo). A tabela é servida como o
// Mapa da norma (`/incidencia/<recorte>/materias.json`). Matéria do plano que a tabela não cita
// recebe a parcela média das citadas, para pesar 1 em vez de sumir.
import { z } from 'zod';

const Chave = z.string().regex(/^[a-z0-9 ]{3,120}$/);

export const TabelaDeMaterias = z.strictObject({
  versao: z.literal(1),
  recorte: z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/),
  /** Trechos (sem acento, minúsculos) que o edital do plano precisa trazer: banca e cargo. */
  banca: Chave,
  cargo: Chave,
  materias: z
    .array(
      z.strictObject({
        nome: z.string().min(1).max(120),
        /** Fatia das questões do recorte (0 a 1). */
        parcela: z.number().gt(0).max(1),
        /** Nomes de matéria de edital, sem acento e em minúsculas, que contam para esta linha. */
        chaves: z.array(Chave).min(1).max(20),
      }),
    )
    .max(200),
});
export type TabelaDeMaterias = z.infer<typeof TabelaDeMaterias>;

export const semAcento = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** O edital do plano é o do recorte: a banca e o cargo trazem os trechos da tabela. */
export function tabelaServeAoEdital(
  tabela: TabelaDeMaterias,
  edital: { banca: string; cargo?: string | undefined },
): boolean {
  return (
    semAcento(edital.banca).includes(tabela.banca) &&
    semAcento(edital.cargo ?? '').includes(tabela.cargo)
  );
}

export interface IncidenciaDaMateria {
  incidencia: number;
  /** Sem linha na tabela: a parcela é a média das que têm. */
  mediaDasOutras: boolean;
}

/**
 * A parcela de cada matéria do plano. Vazio quando nenhuma casa com a tabela (o Ciclo segue pelo
 * edital). Duas matérias do plano na mesma linha dividem a parcela dela.
 */
export function incidenciaDasMaterias(
  tabela: TabelaDeMaterias,
  materias: readonly { disciplinaId: string; nome: string }[],
): Map<string, IncidenciaDaMateria> {
  const linhaPorChave = new Map<string, number>();
  for (const [i, l] of tabela.materias.entries()) {
    for (const c of l.chaves) linhaPorChave.set(c, i);
  }
  const linhaDe = materias.map((m) => linhaPorChave.get(semAcento(m.nome)));
  const compartilham = new Map<number, number>();
  for (const l of linhaDe) if (l !== undefined) compartilham.set(l, (compartilham.get(l) ?? 0) + 1);

  const saida = new Map<string, IncidenciaDaMateria>();
  if (compartilham.size === 0) return saida;
  const parcelas = materias.map((_, i) => {
    const l = linhaDe[i];
    const linha = l === undefined ? undefined : tabela.materias[l];
    return l === undefined || !linha ? undefined : linha.parcela / (compartilham.get(l) ?? 1);
  });
  const achadas = parcelas.filter((p): p is number => p !== undefined);
  const media = achadas.reduce((s, p) => s + p, 0) / achadas.length;
  materias.forEach((m, i) => {
    const p = parcelas[i];
    saida.set(m.disciplinaId, { incidencia: p ?? media, mediaDasOutras: p === undefined });
  });
  return saida;
}
