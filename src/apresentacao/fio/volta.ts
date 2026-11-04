// A florzinha do cacto: depois de uns dias fora, o cacto da marca aparece florido. Sem texto e sem
// cobrança (nada de "você sumiu"): é só um agrado de quem estava esperando. Fica florido até a página
// recarregar. Só guarda o dia da última visita, no aparelho.
const CHAVE = 'arretado:ultima-visita:v1';
const DIAS_FORA = 3;
const DIA_EM_MS = 86_400_000;

/** Dia local como AAAA-MM-DD. */
const dia = (d: Date): string =>
  `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const emDias = (d: string): number => {
  const [a, m, di] = d.split('-').map(Number);
  return Math.round(Date.UTC(a ?? 0, (m ?? 1) - 1, di ?? 1) / DIA_EM_MS);
};

export function passouTempoFora(ultima: string | null, hoje: string): boolean {
  if (!ultima || !/^\d{4}-\d{2}-\d{2}$/.test(ultima)) return false;
  return emDias(hoje) - emDias(ultima) >= DIAS_FORA;
}

let decidido: boolean | undefined;

/** Lê a última visita uma vez por carga da página e grava a de hoje. */
export function voltouDeLonge(agora: Date = new Date()): boolean {
  if (decidido !== undefined) return decidido;
  const hoje = dia(agora);
  let florido = false;
  try {
    const ultima = window.localStorage.getItem(CHAVE);
    florido = passouTempoFora(ultima, hoje);
    window.localStorage.setItem(CHAVE, hoje);
  } catch {
    /* sem armazenamento: sem flor */
  }
  decidido = florido;
  return florido;
}

/** Só para os testes: esquece a decisão da carga. */
export function esquecerVolta(): void {
  decidido = undefined;
}
