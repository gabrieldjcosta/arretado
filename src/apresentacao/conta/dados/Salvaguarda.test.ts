import { textoDoBackup } from './textos-backup';

const AGORA = Date.parse('2026-10-14T12:00:00Z');

describe('Conta › Dados › resumo do backup', () => {
  it('diz que não há backup quando nunca houve', () => {
    expect(textoDoBackup(null, AGORA)).toMatch(/Ainda não há backup/);
  });
  it('conta hoje, ontem e dias', () => {
    expect(textoDoBackup('2026-10-14T08:00:00Z', AGORA)).toBe('Último backup: hoje.');
    expect(textoDoBackup('2026-10-13T08:00:00Z', AGORA)).toBe('Último backup: ontem.');
    expect(textoDoBackup('2026-10-05T08:00:00Z', AGORA)).toBe('Último backup: há 9 dias.');
  });
});
