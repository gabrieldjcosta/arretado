// Que tela do quadro do Fio está à vista: o mockup guarda isso em `atual`. As telas (TelaM) a registram ao
// montar; o aviso (toast) e a troca de tela leem daqui.

/** As três abas, na ordem em que a nav as mostra: a direção do deslize vem da posição. */
export const ABAS = ['inicio', 'mapa', 'varal'] as const;

/** As telas que mostram a nav embaixo (o aviso com "Desfazer" sobe acima dela). */
export const COM_NAV: ReadonlySet<string> = new Set(['inicio', 'mapa', 'varal', 'folheto']);

let atual: string | null = null;

export const telaAtual = (): string | null => atual;

export function definirTela(nome: string | null): void {
  atual = nome;
}
