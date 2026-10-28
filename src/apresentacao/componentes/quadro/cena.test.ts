import {
  flor,
  legendaDaParte,
  mover,
  PARTES,
  parteDoDia,
  REGIAO_DO_NEON,
  REPOUSO,
  temNeon,
  VIEWBOX,
} from './cena';

describe('as 16 partes do quadro do cacto', () => {
  it('são 16, com ids únicos, e cada traço começa por um `M`', () => {
    expect(PARTES).toHaveLength(16);
    expect(new Set(PARTES.map((p) => p.id)).size).toBe(16);
    for (const parte of PARTES) {
      expect(parte.fios.length).toBeGreaterThan(0);
      for (const fio of parte.fios) {
        expect(fio.d).toMatch(/^M/);
        if (fio.lavis) expect(fio.lavis.area).toMatch(/^M/);
      }
    }
  });

  it('o cacto vem primeiro: chão, tronco e os dois braços', () => {
    expect(PARTES.slice(0, 4).map((p) => p.id)).toEqual([
      'chao',
      'tronco',
      'braco-esquerdo',
      'braco-direito',
    ]);
  });

  it('o néon (D-D10) é só do núcleo do cacto: o tronco e os dois braços', () => {
    const comNeon = PARTES.flatMap((p) => p.fios.filter(temNeon).map(() => p.id));
    expect(comNeon).toEqual(['tronco', 'braco-esquerdo', 'braco-direito']);
  });

  it('a região do filtro do néon cobre o núcleo do cacto, o brilho e o desfoque, dentro do quadro', () => {
    const [, , largura = 0, altura = 0] = VIEWBOX.split(' ').map(Number);
    const { x, y, largura: w, altura: h } = REGIAO_DO_NEON;
    // O núcleo vai de x = 100 a 200 e de y = 57 a 156; o brilho tem 34 de largura (17) e o desvio é 6 (18).
    expect(x).toBeLessThanOrEqual(100 - 17 - 3 * 6);
    expect(x + w).toBeGreaterThanOrEqual(200 + 17 + 3 * 6);
    expect(y).toBeLessThanOrEqual(57 - 17 - 3 * 6);
    expect(y + h).toBeGreaterThanOrEqual(Math.min(altura, 156 + 17 + 3 * 6));
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x + w).toBeLessThanOrEqual(largura);
  });

  it('o olho é um traço de comprimento zero (um `M` sozinho não desenha nada)', () => {
    const olhos = PARTES.flatMap((p) => p.fios).flatMap((f) => (f.olho ? [f.olho] : []));
    expect(olhos).toHaveLength(2);
    for (const olho of olhos) expect(olho.d).toMatch(/^M[\d. -]+h0$/);
  });

  it('só os fios fechados levam aguada, e só as flores levam miolo', () => {
    const fios = PARTES.flatMap((p) => p.fios);
    expect(fios.filter((f) => f.miolo)).toHaveLength(3);
    expect(fios.filter((f) => f.miolo).every((f) => f.lavis?.tipo === 'cal')).toBe(true);
    expect(fios.filter((f) => f.lavis).length).toBeGreaterThan(5);
  });

  it('só o núcleo de tinta leva ponta, e ela é o fim do traço, dentro do quadro', () => {
    const [, , largura = 0, altura = 0] = VIEWBOX.split(' ').map(Number);
    const fios = PARTES.flatMap((p) => p.fios);
    expect(fios.filter((f) => f.cor === 'nucleo')).toHaveLength(3);
    const comPonta = fios.filter((f) => f.ponta);
    expect(comPonta.map((f) => f.cor)).toEqual(['nucleo', 'nucleo', 'nucleo']);
    for (const { d, ponta } of comPonta) {
      const [x = 0, y = 0] = ponta ?? [];
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(largura);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(altura);
      expect(d.endsWith(`V${String(y)}`)).toBe(true);
    }
  });

  it('a caneta é largada dentro do quadro, inteira e sob o chão do desenho', () => {
    const [, , largura = 0, altura = 0] = VIEWBOX.split(' ').map(Number);
    const { x, y, escala, graus } = REPOUSO;
    const giro = (graus * Math.PI) / 180;
    // Os cantos da caixa do vidro, em relação à ponta, com a caneta de pé: 46 para cada lado (os braços)
    // e 246 de altura (o topo do tronco). Girados e escalados, têm de ficar no quadro.
    for (const [dx, dy] of [
      [-46, -246],
      [46, -246],
      [-46, 0],
      [46, 0],
    ] as const) {
      const px = x + escala * (dx * Math.cos(giro) - dy * Math.sin(giro));
      const py = y + escala * (dx * Math.sin(giro) + dy * Math.cos(giro));
      expect(px).toBeGreaterThan(0);
      expect(px).toBeLessThan(largura);
      expect(py).toBeGreaterThan(160); // o chão passa entre 153 e 159
      expect(py).toBeLessThan(altura);
    }
  });
});

describe('parteDoDia: o total de Dias fechados, nunca uma sequência', () => {
  it('o primeiro Dia desenha o chão e o 16º a borboleta', () => {
    expect(parteDoDia(1)).toMatchObject({ indice: 0, parte: { id: 'chao' } });
    expect(parteDoDia(2)).toMatchObject({ indice: 1, parte: { id: 'tronco' } });
    expect(parteDoDia(16)).toMatchObject({ indice: 15, parte: { id: 'borboleta' } });
  });

  it('depois da última parte, o Dia seguinte abre uma folha nova', () => {
    expect(parteDoDia(17)).toMatchObject({ indice: 0, parte: { id: 'chao' } });
    expect(parteDoDia(33).indice).toBe(0);
    expect(parteDoDia(40).indice).toBe(7);
  });

  it('número inválido não quebra: cai no primeiro Dia', () => {
    for (const n of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(parteDoDia(n).indice).toBe(0);
    }
    expect(parteDoDia(2.9).indice).toBe(1);
  });
});

describe('legendaDaParte', () => {
  it('diz o que a caneta desenhou hoje, sem número nem meta', () => {
    expect(legendaDaParte(parteDoDia(1).parte)).toBe('Hoje a caneta desenhou o chão.');
    for (const parte of PARTES) {
      expect(legendaDaParte(parte)).toMatch(/^Hoje a caneta desenhou (o|a|os|as) [^\d]+\.$/);
    }
  });
});

describe('mover', () => {
  it('as coordenadas absolutas levam a translação e a escala; as relativas, só a escala', () => {
    expect(mover('M10 20L30 40', 100, 200, 2)).toBe('M120 240L160 280');
    expect(mover('M0 0l5 5', 10, 10, 2)).toBe('M10 10l10 10');
  });

  it('H, V, arcos e Z', () => {
    expect(mover('M0 0H10V20', 5, 5, 1)).toBe('M5 5H15V25');
    expect(mover('M0 0A5 5 0 0 1 10 0', 1, 1, 2)).toBe('M1 1A10 10 0 0 1 21 1');
    expect(mover('M0 0L1 1Z', 0, 0, 1)).toBe('M0 0L1 1Z');
  });

  it('o ponto do olho continua um traço de comprimento zero', () => {
    expect(mover('M85 29h0', 22, 128.8, 0.68)).toBe('M79.8 148.5h0');
  });
});

describe('flor', () => {
  it('cinco pétalas, cada uma um traço que sai do centro e volta a ele', () => {
    const d = flor(150, 28, 11);
    expect(d.match(/M/g)).toHaveLength(5);
    expect(d.startsWith('M150 28')).toBe(true);
  });
});
