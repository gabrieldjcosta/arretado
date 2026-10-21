import { zipSync } from 'fflate';
import { paraBytes } from '../../../core/pacote/bytes';
import type { Cartao, Erro, Frase, Nota } from '../../../core/modelo';

type Disciplinas = Record<string, string>;

export interface EntradaLegivel {
  resumos: Nota[];
  notas: Nota[];
  frases: Frase[];
  cartoes: Cartao[];
  erros: Erro[];
  disciplinas: Disciplinas;
}

/** CSV para Excel/Anki: UTF-8 com BOM, separador vírgula, aspas dobradas. */
export function csv(linhas: string[][]): string {
  const cel = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return '﻿' + linhas.map((l) => l.map(cel).join(',')).join('\r\n') + '\r\n';
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'sem-titulo';

/** Notas (resumos, esquemas, anotações) em Markdown: um arquivo por disciplina. */
export function notasEmMarkdown(notas: Nota[], disciplinas: Disciplinas): Record<string, string> {
  const grupos = new Map<string, Nota[]>();
  for (const n of notas) {
    const nome = (n.disciplinaId && disciplinas[n.disciplinaId]) || 'Sem disciplina';
    grupos.set(nome, [...(grupos.get(nome) ?? []), n]);
  }
  const saida: Record<string, string> = {};
  for (const [nome, lista] of grupos) {
    const corpo = lista.map((n) => `## ${n.titulo}\n\n${n.conteudo.trim()}`).join('\n\n---\n\n');
    saida[`${slug(nome)}.md`] = `# ${nome}\n\n${corpo}\n`;
  }
  return saida;
}

export const LEIA_ME = `Exportação legível do Arretado

Arquivos para usar fora do app. Não servem para restaurar: para isso, use o backup (.arretado).

resumos/   Um arquivo .md por disciplina. Abre no Word, Notion, Obsidian ou em qualquer editor de texto.
notas/     Esquemas e anotações, no mesmo formato.
frases.csv   Frases corretas: disciplina, frase, origem, data.
cartoes.csv  Cartões: frente, verso. Importa direto no Anki (Arquivo > Importar, separador vírgula, frente e verso nas colunas 1 e 2).
erros.csv    Erros registrados: disciplina, banca, prova, ano, resposta dada, resposta correta, frase correta, causa, data.

Os CSV abrem no Excel e no Google Planilhas.
`;

export function montarZipLegivel(e: EntradaLegivel): Uint8Array {
  const d = (id?: string) => (id && e.disciplinas[id]) || '';
  const dia = (iso: string) => iso.slice(0, 10);
  const frasePorErro = new Map(e.erros.map((x) => [x.id, x.fraseCorreta ?? '']));
  const arquivos: Record<string, Uint8Array> = {
    'LEIA-ME.txt': paraBytes(LEIA_ME),
    'frases.csv': paraBytes(
      csv([
        ['disciplina', 'frase', 'origem', 'criada em'],
        ...e.frases.map((f) => [d(f.disciplinaId), f.texto, f.origemTipo, dia(f.criadoEm)]),
      ]),
    ),
    'cartoes.csv': paraBytes(
      csv([
        ['frente', 'verso'],
        ...e.cartoes.map((c) => [
          c.frente,
          c.verso ?? (c.erroId ? (frasePorErro.get(c.erroId) ?? '') : ''),
        ]),
      ]),
    ),
    'erros.csv': paraBytes(
      csv([
        [
          'disciplina',
          'banca',
          'prova',
          'ano',
          'resposta dada',
          'resposta correta',
          'frase correta',
          'causa',
          'registrado em',
        ],
        ...e.erros.map((x) => [
          d(x.disciplinaId),
          x.fonte?.banca ?? '',
          x.fonte?.prova ?? '',
          x.fonte?.ano?.toString() ?? '',
          x.respostaDada ?? '',
          x.respostaCorreta ?? '',
          x.fraseCorreta ?? '',
          x.causa ?? '',
          dia(x.criadoEm),
        ]),
      ]),
    ),
  };
  for (const [nome, md] of Object.entries(notasEmMarkdown(e.resumos, e.disciplinas))) {
    arquivos[`resumos/${nome}`] = paraBytes(md);
  }
  for (const [nome, md] of Object.entries(notasEmMarkdown(e.notas, e.disciplinas))) {
    arquivos[`notas/${nome}`] = paraBytes(md);
  }
  return zipSync(arquivos);
}
