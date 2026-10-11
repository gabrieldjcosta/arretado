// Extrai as súmulas do STJ do PDF oficial "Enunciados das Súmulas do STJ" (gerado pelo SCON).
// Uso: node scripts/acervo/coletores/stj.mjs <texto.txt (pdftotext -enc UTF-8 -layout)> <saida.json>
import { readFileSync, writeFileSync } from 'node:fs';

const [entrada, saida] = process.argv.slice(2);
const LINK = 'https://scon.stj.jus.br/SCON/sumstj/';
const linhas = readFileSync(entrada, 'utf8')
  .replace(/\f/gu, '\n')
  .split(/\r?\n/u)
  .map((l) => l.trim())
  .filter((l) => !/^scon\.stj\.jus\.br\/SCON\/sumstj\/\s*\d*$/u.test(l));
const blocos = linhas.join('\n').split(/^q SÚMULA (\d+)\s*(\([^)]*\))?\s*VEJA MAIS\s*$/mu);
const sumulas = [];
for (let i = 1; i < blocos.length; i += 3) {
  const numero = Number(blocos[i]);
  const marca = blocos[i + 1] ?? '';
  const corpo = blocos[i + 2]
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/gu, ' ');
  // O enunciado vai até a citação "(SÚMULA N, ÓRGÃO, ...)" ou, nas mais novas, "(ÓRGÃO, julgado em ...)".
  const corte =
    new RegExp(String.raw`\s\(SÚMULA ${String(numero)},`, 'u').exec(corpo) ??
    /\s\([A-ZÇÃÕÉ ]+, julgad[oa] em [^)]*\)/u.exec(corpo);
  const enunciado = (corte ? corpo.slice(0, corte.index) : corpo).trim();
  const resto = corte ? corpo.slice(corte.index).trim() : '';
  const citacao = /^\(([^)]*)\)/u.exec(resto)?.[1]?.replace(/^SÚMULA \d+, /u, '');
  const cancelada = /CANCELADA|REVOGADA/u.test(marca);
  const fim = /(CANCELADA|REVOGADA): .*?na sessão[^,]*? de (\d{2}\/\d{2}\/\d{4})/u.exec(resto);
  const origem = [
    citacao,
    cancelada && fim
      ? `${fim[1] === 'CANCELADA' ? 'Cancelada' : 'Revogada'} em ${fim[2]}`
      : undefined,
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 200);
  if (!enunciado) throw new Error(`súmula ${String(numero)} sem enunciado`);
  sumulas.push({
    numero,
    enunciado,
    situacao: cancelada ? 'cancelada' : 'vigente',
    ...(origem ? { origem } : {}),
    link: LINK,
  });
}
sumulas.sort((a, b) => a.numero - b.numero);
writeFileSync(
  saida,
  JSON.stringify(
    { tribunal: 'Superior Tribunal de Justiça', vinculante: false, sumulas },
    null,
    2,
  ) + '\n',
);
console.log(`gravado ${saida}: ${sumulas.length}`);
