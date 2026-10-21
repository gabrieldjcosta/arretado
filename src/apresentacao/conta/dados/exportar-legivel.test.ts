import { unzipSync, strFromU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { csv, montarZipLegivel } from './exportar-legivel';

describe('exportar-legivel', () => {
  it('escapa aspas e usa BOM', () => {
    expect(csv([['a"b', 'c,d']])).toBe('﻿"a""b","c,d"\r\n');
  });

  it('monta zip com markdown por disciplina e csv', () => {
    const base = { criadoEm: '2026-10-20T10:00:00.000Z' };
    const zip = unzipSync(
      montarZipLegivel({
        resumos: [{ ...base, titulo: 'Lei X', conteudo: 'Corpo', disciplinaId: 'd1' }] as never,
        notas: [],
        frases: [{ ...base, texto: 'Frase', origemTipo: 'manual' }] as never,
        cartoes: [{ frente: 'P?', verso: null, erroId: 'e1' }] as never,
        erros: [{ id: 'e1', fraseCorreta: 'Certa', ...base }] as never,
        disciplinas: { d1: 'Penal' },
      }),
    );
    expect(Object.keys(zip).sort()).toEqual([
      'LEIA-ME.txt',
      'cartoes.csv',
      'erros.csv',
      'frases.csv',
      'resumos/penal.md',
    ]);
    expect(strFromU8(zip['resumos/penal.md']!)).toContain('## Lei X');
    expect(strFromU8(zip['cartoes.csv']!)).toContain('"P?","Certa"');
  });
});
