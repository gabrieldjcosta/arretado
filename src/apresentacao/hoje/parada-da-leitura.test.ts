import { quandoDeParar, rotuloDaParada } from './parada-da-leitura';

describe('Hoje › linha de parada (P3)', () => {
  describe('rotuloDaParada', () => {
    it('a norma e o Dispositivo exatos, como se cita', () => {
      expect(rotuloDaParada('LEP', 'Art. 112, § 2º')).toBe('LEP, art. 112, § 2º');
      expect(rotuloDaParada('CF', 'Art. 5º, LXXIV')).toBe('CF, art. 5º, LXXIV');
    });

    it('fora de artigo, o rótulo fica como está', () => {
      expect(rotuloDaParada('CP', 'TÍTULO I')).toBe('CP, TÍTULO I');
    });

    it('sem posição guardada, só a norma', () => {
      expect(rotuloDaParada('LEP', undefined)).toBe('LEP');
      expect(rotuloDaParada('LEP', '')).toBe('LEP');
    });
  });

  describe('quandoDeParar', () => {
    // 18/10/2026, 12h00 em Brasília (UTC-3).
    const agora = new Date('2026-10-18T15:00:00.000Z');

    it('hoje, na hora de Brasília', () => {
      expect(quandoDeParar('2026-10-18T13:10:00.000Z', agora)).toBe('hoje, 10h10');
    });

    it('ontem', () => {
      // 17/10, 22h10 em Brasília.
      expect(quandoDeParar('2026-10-18T01:10:00.000Z', agora)).toBe('ontem, 22h10');
    });

    it('antes de ontem: o dia e o mês, sem contar dias fora', () => {
      // 12/10, 07h05 em Brasília.
      expect(quandoDeParar('2026-10-12T10:05:00.000Z', agora)).toBe('dia 12/10, 07h05');
    });

    it('um instante à frente do relógio não vira "dias atrás"', () => {
      expect(quandoDeParar('2026-10-18T18:00:00.000Z', agora)).toBe('hoje, 15h00');
    });

    it('o dia civil é o de Brasília, não o do UTC', () => {
      // 19/10 01h30 UTC = 18/10 22h30 em Brasília; "agora" é 19/10 02h00 UTC = 18/10 23h00.
      expect(quandoDeParar('2026-10-19T01:30:00.000Z', new Date('2026-10-19T02:00:00.000Z'))).toBe(
        'hoje, 22h30',
      );
    });
  });
});
