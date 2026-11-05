// As últimas buscas da lista de normas, lembradas neste aparelho (`localStorage`). Só o texto digitado, sem conta
// e sem sincronização (não sai do aparelho). Sem armazenamento (janela privada, jsdom), vale só nesta aba.

const CHAVE = 'arretado:normas:ultimas-buscas:v1';
/** Quantas buscas ficam lembradas. */
export const MAXIMO_DE_BUSCAS = 4;
const MAXIMO_DE_LETRAS = 80;

let memoria: string[] | undefined;

function ler(): string[] {
  if (memoria) return memoria;
  let lidas: string[] = [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    const valor: unknown = bruto ? JSON.parse(bruto) : [];
    if (Array.isArray(valor)) {
      lidas = valor.filter((v): v is string => typeof v === 'string').slice(0, MAXIMO_DE_BUSCAS);
    }
  } catch {
    lidas = [];
  }
  memoria = lidas;
  return memoria;
}

function gravar(buscas: string[]): void {
  memoria = buscas;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(buscas));
  } catch {
    /* sem armazenamento: vale só nesta aba */
  }
}

/** As últimas buscas, da mais nova para a mais velha. */
export function ultimasBuscas(): readonly string[] {
  return ler();
}

/** Lembra uma busca: sem espaço sobrando, sem repetir (sem diferenciar caixa) e a mais nova primeiro. */
export function lembrarBusca(texto: string): readonly string[] {
  const limpo = texto.trim().replace(/\s+/g, ' ').slice(0, MAXIMO_DE_LETRAS);
  if (limpo.length < 2) return ler();
  const chave = limpo.toLocaleLowerCase('pt-BR');
  const novas = [limpo, ...ler().filter((b) => b.toLocaleLowerCase('pt-BR') !== chave)].slice(
    0,
    MAXIMO_DE_BUSCAS,
  );
  gravar(novas);
  return novas;
}

/** Esquece todas as buscas. */
export function esquecerBuscas(): readonly string[] {
  gravar([]);
  return [];
}

/** Para os testes: esquece a memória e o que estava gravado. */
export function reiniciarUltimasBuscas(): void {
  memoria = undefined;
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    /* nada a limpar */
  }
}
