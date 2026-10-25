// Medição local do piloto Ache o erro (AP-06): duas semanas de uso real, só no aparelho (nada sai
// dele e nada entra no esquema; a tela guarda no localStorage). Registra cada resposta por tipo de
// troca e volta ao mesmo dispositivo sete dias depois, para medir a retenção. Puro.
import type { TipoDeTroca } from './trocas';

export const DIAS_DO_PILOTO = 14;
export const DIAS_ATE_REVISITA = 7;
const DIA_MS = 86_400_000;

export type TipoMedido = TipoDeTroca | 'sem_troca';

export interface RegistroDaMedicao {
  /** Instante ISO da resposta. */
  em: string;
  dispositivoId: string;
  tipo: TipoMedido;
  resposta: 'tocou' | 'certa' | 'nao_sei';
  acertou: boolean;
  certeza?: 1 | 2 | 3;
  /** Segunda passagem pelo dispositivo, sete dias depois da primeira. */
  revisita: boolean;
}

export interface Medicao {
  /** Quando o piloto começou neste aparelho (ISO). */
  inicio: string;
  registros: RegistroDaMedicao[];
}

export const medicaoVazia = (agora: Date): Medicao => ({
  inicio: agora.toISOString(),
  registros: [],
});

/** Lê o que veio do armazenamento; qualquer coisa fora do formato vira medição nova. */
export function lerMedicao(bruto: unknown, agora: Date): Medicao {
  if (
    typeof bruto === 'object' &&
    bruto !== null &&
    'inicio' in bruto &&
    typeof bruto.inicio === 'string' &&
    'registros' in bruto &&
    Array.isArray(bruto.registros)
  ) {
    return { inicio: bruto.inicio, registros: bruto.registros as RegistroDaMedicao[] };
  }
  return medicaoVazia(agora);
}

export function anotar(medicao: Medicao, registro: RegistroDaMedicao): Medicao {
  return { ...medicao, registros: [...medicao.registros, registro] };
}

/**
 * Os dispositivos que vencem a revisita: a primeira resposta tem sete dias ou mais e ainda não
 * houve segunda passagem. Os mais antigos primeiro.
 */
export function paraRevisitar(medicao: Medicao, agora: Date): string[] {
  const primeira = new Map<string, number>();
  const revisitados = new Set<string>();
  for (const r of medicao.registros) {
    if (r.revisita) revisitados.add(r.dispositivoId);
    else if (!primeira.has(r.dispositivoId)) primeira.set(r.dispositivoId, Date.parse(r.em));
  }
  const limite = agora.getTime() - DIAS_ATE_REVISITA * DIA_MS;
  return [...primeira]
    .filter(([id, em]) => !revisitados.has(id) && em <= limite)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);
}

export interface Contagem {
  total: number;
  acertos: number;
}

export interface ResumoDaMedicao {
  /** Dias desde o início do piloto (o primeiro dia é 1). */
  dia: number;
  porTipo: Partial<Record<TipoMedido, Contagem>>;
  primeiras: Contagem;
  revisitas: Contagem;
}

const somar = (c: Contagem | undefined, acertou: boolean): Contagem => ({
  total: (c?.total ?? 0) + 1,
  acertos: (c?.acertos ?? 0) + (acertou ? 1 : 0),
});

export function resumo(medicao: Medicao, agora: Date): ResumoDaMedicao {
  const r: ResumoDaMedicao = {
    dia: Math.max(1, Math.floor((agora.getTime() - Date.parse(medicao.inicio)) / DIA_MS) + 1),
    porTipo: {},
    primeiras: { total: 0, acertos: 0 },
    revisitas: { total: 0, acertos: 0 },
  };
  for (const reg of medicao.registros) {
    r.porTipo[reg.tipo] = somar(r.porTipo[reg.tipo], reg.acertou);
    if (reg.revisita) r.revisitas = somar(r.revisitas, reg.acertou);
    else r.primeiras = somar(r.primeiras, reg.acertou);
  }
  return r;
}

/** "7 de 10" ou "—" sem dado. */
export function fracao(c: Contagem): string {
  return c.total === 0 ? '—' : `${String(c.acertos)} de ${String(c.total)}`;
}
