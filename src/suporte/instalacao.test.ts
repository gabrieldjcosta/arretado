import { estadoDaInstalacao } from './instalacao';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/126 Mobile';

describe('estadoDaInstalacao', () => {
  it('já instalada: não oferece nada', () => {
    expect(estadoDaInstalacao({ userAgent: ANDROID, modoApp: true }, true)).toBe('instalado');
  });
  it('com convite do navegador: oferece o botão', () => {
    expect(estadoDaInstalacao({ userAgent: ANDROID }, true)).toBe('convite');
  });
  it('iOS sem convite: mostra o passo a passo', () => {
    expect(estadoDaInstalacao({ userAgent: IPHONE }, false)).toBe('passo-a-passo-ios');
  });
  it('sem convite e fora do iOS: não mostra nada', () => {
    expect(estadoDaInstalacao({ userAgent: ANDROID }, false)).toBe('indisponivel');
  });
});
