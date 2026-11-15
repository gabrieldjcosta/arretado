import { beforeEach, describe, expect, it, vi } from 'vitest';

const cancel = vi.fn(() => Promise.resolve());
const schedule = vi.fn(() => Promise.resolve());
let permissao = 'granted';
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: () => Promise.resolve({ display: permissao }),
    cancel,
    schedule,
  },
}));

import { desligarLembrete, horaValida, lerLembrete, ligarLembrete } from './lembrete';

beforeEach(() => {
  localStorage.clear();
  cancel.mockClear();
  schedule.mockClear();
  permissao = 'granted';
});

describe('lembrete diário da casca', () => {
  it('começa desligado às 20:00', () => {
    expect(lerLembrete()).toEqual({ ligado: false, hora: '20:00' });
  });

  it('valida a hora', () => {
    expect(horaValida('07:05')).toBe(true);
    expect(horaValida('24:00')).toBe(false);
    expect(horaValida('7:5')).toBe(false);
  });

  it('agenda todo dia na hora escolhida e lembra a escolha', async () => {
    expect(await ligarLembrete('06:45')).toBe(true);
    expect(schedule).toHaveBeenCalledWith({
      notifications: [
        expect.objectContaining({
          schedule: { on: { hour: 6, minute: 45 }, allowWhileIdle: true },
        }),
      ],
    });
    expect(lerLembrete()).toEqual({ ligado: true, hora: '06:45' });
  });

  it('sem permissão não agenda nem liga', async () => {
    permissao = 'denied';
    expect(await ligarLembrete('20:00')).toBe(false);
    expect(schedule).not.toHaveBeenCalled();
    expect(lerLembrete().ligado).toBe(false);
  });

  it('desligar cancela e mantém a hora', async () => {
    await ligarLembrete('09:30');
    await desligarLembrete();
    expect(cancel).toHaveBeenCalled();
    expect(lerLembrete()).toEqual({ ligado: false, hora: '09:30' });
  });
});
