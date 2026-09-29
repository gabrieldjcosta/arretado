// Norma sintética para a carga da leitura (F2, 9.4), do jeito que o sanitizador entrega a página:
// títulos e capítulos (com o nome), e artigos de 7 nós (artigo, rubrica, 3 incisos e 2 parágrafos),
// com notas de vigência e a redação anterior tachada (até a 8.6, a linha tachada vai para o
// descarte, com o aviso `redacao_anterior_nao_tratada`; depois, para as redações anteriores).
import type { Bloco } from '../core/seguranca/sanitizador';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });

const ROMANOS: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

function romano(n: number): string {
  let resto = n;
  let saida = '';
  for (const [valor, letras] of ROMANOS) {
    while (resto >= valor) {
      saida += letras;
      resto -= valor;
    }
  }
  return saida;
}

const ordinal = (n: number) => (n < 10 ? `${String(n)}º` : `${String(n)}.`);

/** Blocos de uma lei com pelo menos `dispositivos` nós na árvore (artigos de 7 nós; 10 por capítulo). */
export function blocosDeNormaSintetica(dispositivos: number): Bloco[] {
  const blocos: Bloco[] = [
    linha('Presidência da República'),
    linha('LEI Nº 99.999, DE 1º DE JANEIRO DE 2026.'),
    linha('Dispõe sobre a carga sintética da leitura.'),
    linha(
      'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:',
    ),
  ];
  let nos = 1; // preâmbulo
  let artigo = 0;
  for (let titulo = 1; nos < dispositivos; titulo++) {
    blocos.push(linha(`TÍTULO ${romano(titulo)}`), linha(`DO TÍTULO ${String(titulo)}`));
    nos += 2;
    for (let capitulo = 1; capitulo <= 5 && nos < dispositivos; capitulo++) {
      blocos.push(linha(`CAPÍTULO ${romano(capitulo)}`), linha(`DO CAPÍTULO ${String(capitulo)}`));
      nos += 2;
      for (let k = 0; k < 10 && nos < dispositivos; k++) {
        artigo += 1;
        const n = ordinal(artigo);
        blocos.push(
          linha(`Rubrica do artigo ${String(artigo)}`),
          {
            trechos: [
              { texto: `Art. ${n} Texto antigo do artigo ${String(artigo)}.`, tachado: true },
            ],
          },
          {
            trechos: [
              {
                texto: `Art. ${n} O prazo do artigo ${String(artigo)} é de 30 (trinta) dias, salvo: `,
              },
              {
                texto: '(Redação dada pela Lei nº 12.345, de 2010)',
                link: 'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12345.htm',
              },
            ],
          },
          linha('I - no primeiro caso;'),
          linha('II - no segundo caso;'),
          linha('III - no terceiro caso.'),
          linha(
            `§ 1º O primeiro parágrafo do artigo ${String(artigo)}. (Incluído pela Lei nº 12.345, de 2010)`,
          ),
          linha(`§ 2º O segundo parágrafo do artigo ${String(artigo)}.`),
        );
        nos += 7;
      }
    }
  }
  blocos.push(linha('Brasília, 1º de janeiro de 2026; 205º da Independência e 138º da República.'));
  return blocos;
}
