import { dispensarPorDias, lembreteDeBackup } from './lembrete-de-backup';

const agora = new Date('2026-10-14T12:00:00Z');
const base = { ultimoBackup: null, haDados: true, agora, dispensadoAte: null };

describe('lembreteDeBackup', () => {
  it('sem dados, nunca lembra', () => {
    expect(lembreteDeBackup({ ...base, haDados: false })).toEqual({ mostrar: false });
  });
  it('nunca fez backup e há dados: lembra sem número de dias', () => {
    expect(lembreteDeBackup(base)).toEqual({ mostrar: true, dias: null });
  });
  it('backup recente não lembra; a partir de 7 dias lembra', () => {
    expect(lembreteDeBackup({ ...base, ultimoBackup: '2026-10-09T12:00:00Z' })).toEqual({
      mostrar: false,
    });
    expect(lembreteDeBackup({ ...base, ultimoBackup: '2026-10-05T12:00:00Z' })).toEqual({
      mostrar: true,
      dias: 9,
    });
  });
  it('dispensado vale por 7 dias e depois volta', () => {
    const ate = dispensarPorDias(agora);
    expect(lembreteDeBackup({ ...base, dispensadoAte: ate })).toEqual({ mostrar: false });
    const depois = new Date(agora.getTime() + 8 * 86_400_000);
    expect(lembreteDeBackup({ ...base, dispensadoAte: ate, agora: depois }).mostrar).toBe(true);
  });
});
