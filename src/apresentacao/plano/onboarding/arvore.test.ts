import { describe, expect, it } from 'vitest';
import type {
  DisciplinaDoEdital,
  EditalDoCatalogo,
  ItemDoEdital,
} from '../../../dominios/catalogo';
import { montarArvore } from './arvore';

const item = (assunto: string, numero: string | null = null): ItemDoEdital => ({
  numero,
  assunto,
  faixa: null,
  obsFaixa: null,
  recorrencia: null,
  fonteUrl: 'https://exemplo.test/',
});

const disciplina = (
  nomeNoEdital: string,
  ordem: number,
  itens: ItemDoEdital[],
): DisciplinaDoEdital => ({ nomeNoEdital, ordem, itens });

const edital: EditalDoCatalogo = {
  id: 'e1',
  orgao: 'MPGO',
  uf: null,
  banca: null,
  ano: 2023,
  cargo: null,
  fase: null,
  situacao: 'completo',
  fonteUrl: 'https://exemplo.test/',
  rotulo: 'edital MPGO de 2023',
  disciplinas: [
    disciplina('Direito Penal', 1, [
      item('Crimes contra a pessoa', '1'),
      item('Crimes contra o patrimônio'),
    ]),
    disciplina('Direito Civil', 2, [item('Prescrição')]),
  ],
};

describe('Onboarding: árvore de matérias e assuntos (B2)', () => {
  it('monta as matérias do edital na ordem dele, com assunto identificado e código quando há', () => {
    const todas = montarArvore(edital, { disciplinas: [], assuntos: [] });
    expect(todas.map((d) => d.nome)).toEqual(['Direito Penal', 'Direito Civil']);
    const penal = todas[0]!;
    expect(penal.seu).toBe(false);
    expect(penal.chave).toBe('direito penal');
    expect(penal.assuntos.map((a) => [a.id, a.texto, a.codigo, a.seu])).toEqual([
      ['direito penal#0', 'Crimes contra a pessoa', '1', undefined],
      ['direito penal#1', 'Crimes contra o patrimônio', undefined, undefined],
    ]);
  });

  it('junta as matérias e os assuntos acrescentados pela pessoa, nas matérias certas', () => {
    const todas = montarArvore(edital, {
      disciplinas: ['Direito Aeroespacial'],
      assuntos: [
        { disciplina: 'Direito Penal', titulo: 'Crimes de informática' },
        { disciplina: 'DIREITO AEROESPACIAL', titulo: 'Inelegibilidades' },
      ],
    });
    const penal = todas.find((d) => d.nome === 'Direito Penal')!;
    expect(penal.assuntos.map((a) => a.seu)).toEqual([undefined, undefined, true]);
    expect(penal.assuntos[2]!.id).toBe('seu#direito penal#crimes de informatica');
    const aeroespacial = todas.find((d) => d.nome === 'Direito Aeroespacial')!;
    expect(aeroespacial.seu).toBe(true);
    expect(aeroespacial.assuntos.map((a) => a.texto)).toEqual(['Inelegibilidades']);
  });
});
