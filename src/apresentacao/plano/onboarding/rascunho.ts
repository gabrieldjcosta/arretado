// Rascunho do onboarding do plano: guardado no aparelho a cada tela (só ids e chaves, nada de
// identificação), para fechar o app no meio e voltar de onde parou. Sem localStorage, segue sem salvar.
const CHAVE = 'arretado:onboarding-plano:v1';

export type Passo = 'carreira' | 'edital' | 'disciplinas' | 'revisar';

export interface Rascunho {
  passo: Passo;
  carreira?: string;
  edital?: string;
  /** Disciplinas que a pessoa desmarcou (chave de nome). Padrão: todas marcadas. */
  desmarcadas: string[];
  /** Assuntos desmarcados (`chaveDoItem`). Padrão: todos marcados. */
  dispensados: string[];
}

export const RASCUNHO_VAZIO: Rascunho = { passo: 'carreira', desmarcadas: [], dispensados: [] };

const PASSOS: readonly Passo[] = ['carreira', 'edital', 'disciplinas', 'revisar'];

const texto = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const lista = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

export function lerRascunho(): Rascunho {
  try {
    const bruto: unknown = JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null');
    if (typeof bruto !== 'object' || bruto === null) return RASCUNHO_VAZIO;
    const o = bruto as Record<string, unknown>;
    const passo = PASSOS.find((p) => p === o.passo) ?? 'carreira';
    const carreira = texto(o.carreira);
    const edital = texto(o.edital);
    return {
      passo,
      ...(carreira ? { carreira } : {}),
      ...(edital ? { edital } : {}),
      desmarcadas: lista(o.desmarcadas),
      dispensados: lista(o.dispensados),
    };
  } catch {
    return RASCUNHO_VAZIO;
  }
}

export function gravarRascunho(r: Rascunho): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(r));
  } catch {
    /* sem armazenamento: o fluxo segue, só não retoma */
  }
}

export function limparRascunho(): void {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    /* idem */
  }
}
