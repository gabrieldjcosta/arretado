// Adaptador Markdown (spec §8): o Markdown convertido de PDF vira blocos para o estruturador
// (`~~tachado~~` → trecho tachado, que o estruturador trata como redação anterior) ou seções
// pelos títulos `#` (documentos sem artigos).
import type { Bloco, Trecho } from '../../src/core/seguranca/sanitizador';

/** `**negrito**`, `*itálico*`, `_itálico_` perdem a marca; `~~x~~` vira trecho tachado; links ficam só no texto. */
export function trechosDaLinha(linha: string): Trecho[] {
  const semMarcas = linha
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?![*\w])/g, '$1$2')
    .replace(/(^|[^\w])_([^_\s][^_]*)_(?![\w])/g, '$1$2');
  const trechos: Trecho[] = [];
  let resto = semMarcas;
  while (resto.length > 0) {
    const ini = resto.indexOf('~~');
    const fim = ini < 0 ? -1 : resto.indexOf('~~', ini + 2);
    if (ini < 0 || fim < 0) {
      trechos.push({ texto: resto });
      break;
    }
    if (ini > 0) trechos.push({ texto: resto.slice(0, ini) });
    const tachado = resto.slice(ini + 2, fim);
    if (tachado.length > 0) trechos.push({ texto: tachado, tachado: true });
    resto = resto.slice(fim + 2);
  }
  return trechos.length > 0 ? trechos : [{ texto: '' }];
}

const limpar = (linha: string): string =>
  linha
    .replace(/^\s{0,3}>\s?/, '')
    .replace(/^\s*[-*+]\s+(?=\S)/, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Uma linha de texto por bloco (como o texto colado); títulos `#` perdem o marcador. Tabelas e linhas vazias saem. */
export function markdownParaBlocos(markdown: string): Bloco[] {
  const blocos: Bloco[] = [];
  for (const crua of markdown.split(/\r\n|[\r\n\u2028\u2029]/)) {
    if (/^\s*\|?[\s:|-]+\|?\s*$/.test(crua) && crua.includes('-')) continue; // separador de tabela
    const linha = limpar(crua.replace(/^\s{0,3}#{1,6}\s+/, ''));
    if (linha.length === 0) continue;
    blocos.push({ trechos: trechosDaLinha(linha) });
  }
  return blocos;
}

export interface SecaoDoMarkdown {
  /** Nível do título `#` (1 a 6); 0 = texto antes do primeiro título. */
  nivel: number;
  titulo: string;
  /** Parágrafos da seção, em ordem. */
  corpo: Trecho[][];
}

/** Seções pelos títulos `#`; o texto antes do primeiro título vira a seção de nível 0 (se houver). */
export function markdownParaSecoes(markdown: string): SecaoDoMarkdown[] {
  const secoes: SecaoDoMarkdown[] = [];
  let atual: SecaoDoMarkdown = { nivel: 0, titulo: '', corpo: [] };
  const fechar = () => {
    if (atual.nivel > 0 || atual.corpo.length > 0) secoes.push(atual);
  };
  for (const crua of markdown.split(/\r\n|[\r\n\u2028\u2029]/)) {
    const t = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(crua);
    if (t) {
      fechar();
      atual = {
        nivel: (t[1] as string).length,
        titulo: limpar(t[2] as string).replace(/[*_~]/g, ''),
        corpo: [],
      };
      continue;
    }
    if (/^\s*\|?[\s:|-]+\|?\s*$/.test(crua) && crua.includes('-')) continue;
    const linha = limpar(crua);
    if (linha.length > 0) atual.corpo.push(trechosDaLinha(linha));
  }
  fechar();
  return secoes;
}
