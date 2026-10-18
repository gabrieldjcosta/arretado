import { describe, expect, it } from 'vitest';
import type { PacoteLido } from '../../../core/pacote';
import type { LinhaPonto } from '../../../integracoes/pontos/csv';
import { planoCriado } from './plano-criado';

/** Pacote com só o que `planoCriado` lê: os registros por coleção (o resto não entra na escolha). */
const pacoteCom = (pontos: unknown[], disciplinas: unknown[]): PacoteLido =>
  ({
    registros: new Map([
      ['pontos', pontos],
      ['disciplinas', disciplinas],
    ]),
  }) as unknown as PacoteLido;

const linhas = (titulos: readonly string[]): LinhaPonto[] =>
  titulos.map((titulo) => ({ disciplina: 'Direito Penal', titulo }));

describe('Onboarding: "Comece por aqui" depois de criar o plano (B2)', () => {
  it('escolhe o primeiro ponto de faixa altíssima que veio das linhas, com a matéria dele', () => {
    const pacote = pacoteCom(
      [
        { id: 'p1', titulo: 'Prescrição', disciplinaId: 'd1', faixa: 'alta' },
        { id: 'p2', titulo: 'Tipicidade', disciplinaId: 'd2', faixa: 'altissima' },
        { id: 'p3', titulo: 'Concurso de pessoas', disciplinaId: 'd1', faixa: 'altissima' },
      ],
      [
        { id: 'd1', nome: 'Direito Civil' },
        { id: 'd2', nome: 'Direito Penal' },
      ],
    );
    // "Tipicidade" é altíssima, mas ficou fora das linhas escolhidas: não serve.
    expect(planoCriado(pacote, linhas(['Prescrição', 'Concurso de pessoas']))).toEqual({
      ponto: { id: 'p3', titulo: 'Concurso de pessoas', disciplinaId: 'd1', faixa: 'altissima' },
      materia: 'Direito Civil',
    });
  });

  it('sem altíssima nas linhas, cai no primeiro ponto do plano', () => {
    const pacote = pacoteCom(
      [
        { id: 'p1', titulo: 'Prescrição', disciplinaId: 'd1', faixa: 'alta' },
        { id: 'p2', titulo: 'Tipicidade', disciplinaId: 'd2' },
      ],
      [{ id: 'd2', nome: 'Direito Penal' }],
    );
    expect(planoCriado(pacote, linhas(['Prescrição']))).toEqual({
      ponto: { id: 'p1', titulo: 'Prescrição', disciplinaId: 'd1', faixa: 'alta' },
      materia: undefined,
    });
  });

  it('ponto sem matéria conhecida mostra o ponto, sem matéria', () => {
    const pacote = pacoteCom([{ id: 'p1', titulo: 'Prescrição', disciplinaId: 'd9' }], [
      { id: 'd1', nome: 'Direito Civil' },
    ]);
    expect(planoCriado(pacote, linhas(['Prescrição']))).toEqual({
      ponto: { id: 'p1', titulo: 'Prescrição', disciplinaId: 'd9' },
    });
    expect('materia' in planoCriado(pacote, linhas(['Prescrição']))).toBe(false);
  });

  it('plano sem pontos não escolhe nada e não quebra', () => {
    expect(planoCriado(pacoteCom([], [{ id: 'd1', nome: 'Direito Civil' }]), linhas([]))).toEqual(
      {},
    );
  });
});