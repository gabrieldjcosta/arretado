// Extrai as súmulas do TJSP do PDF oficial (SumulasTJSP.pdf, Serviço de Gestão de Legislação).
// Uso: node scripts/acervo/coletores/tjsp.mjs <texto.txt (pdftotext -enc UTF-8 -layout)> <saida.json> <data-de-atualização>
import { readFileSync, writeFileSync } from 'node:fs';

const [entrada, saida, atualizadoEm] = process.argv.slice(2);
const PDF =
  'https://www.tjsp.jus.br/Download/Portal/Biblioteca/Biblioteca/Legislacao/SumulasTJSP.pdf';
const RUIDO =
  /^(PODER JUDICIÁRIO|TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO|Diretoria de Gestão do Conhecimento Judiciário|Serviço de Gestão de Legislação|- \d+ -|\(Atualizada em [^)]*\))$/u;
const linhas = readFileSync(entrada, 'utf8')
  .split(/\r?\n/u)
  .map((l) => l.replace(/\f/gu, '').trim())
  .filter((l) => !RUIDO.test(l));
const texto = linhas.join('\n');
const partes = texto.split(/^Súmula (\d+)\s*[:–-]\s*/mu);
const sumulas = [];
for (let i = 1; i < partes.length; i += 2) {
  const numero = Number(partes[i]);
  const corpo = partes[i + 1]
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/gu, ' ')
    .trim();
  const revogada = /^REVOGADA/iu.test(corpo);
  if (revogada) {
    // A lista oficial mantém só "REVOGADA" e a sessão que revogou: o enunciado não consta mais. O texto abaixo
    // é aviso nosso, não do tribunal; a origem é a da lista oficial.
    const sessao = /\(([^)]*)\)/u.exec(corpo)?.[1];
    sumulas.push({
      numero,
      enunciado: 'Súmula revogada; a lista oficial do tribunal já não traz o enunciado.',
      situacao: 'cancelada',
      ...(sessao ? { origem: `Revogada: ${sessao}` } : {}),
      link: PDF,
    });
    continue;
  }
  sumulas.push({ numero, enunciado: corpo, situacao: 'vigente', link: PDF });
}
sumulas.sort((a, b) => a.numero - b.numero);
writeFileSync(
  saida,
  JSON.stringify(
    { tribunal: 'Tribunal de Justiça de São Paulo', vinculante: false, sumulas },
    null,
    2,
  ) + '\n',
);
console.log(`gravado ${saida}: ${sumulas.length} (lista oficial atualizada em ${atualizadoEm})`);
