import { describe, expect, it } from 'vitest';
import type { Dispositivo } from '../../core/modelo';
import { artigosAteOFimDaSecao, minutosAteOFimDaSecao } from './continuar';
import type { NoDaLeitura } from './leitor';

const no = (tipo: Dispositivo['tipo'], nivel: number): NoDaLeitura =>
  ({ dispositivo: { tipo }, nivel }) as NoDaLeitura;

// Título I › Capítulo I › art, art, par · Capítulo II › art, art, art · Título II › art
const nos = [
  no('titulo', 0),
  no('capitulo', 1),
  no('artigo', 2),
  no('paragrafo', 3),
  no('artigo', 2),
  no('capitulo', 1),
  no('artigo', 2),
  no('artigo', 2),
  no('artigo', 2),
  no('titulo', 0),
  no('artigo', 1),
];

describe('estimativa do "Continuar leitura" (fatia 4)', () => {
  it('conta os artigos do ponto até o fim da divisão mais próxima', () => {
    expect(artigosAteOFimDaSecao(nos, 2)).toBe(2);
    expect(artigosAteOFimDaSecao(nos, 4)).toBe(1);
    expect(artigosAteOFimDaSecao(nos, 6)).toBe(3);
    expect(artigosAteOFimDaSecao(nos, 7)).toBe(2);
  });

  it('com o ponto na própria divisão, conta a divisão inteira; a seguinte não entra', () => {
    expect(artigosAteOFimDaSecao(nos, 5)).toBe(3);
    // Título II: o capítulo anterior não vaza para ele.
    expect(artigosAteOFimDaSecao(nos, 9)).toBe(1);
  });

  it('sem divisão acima, vai até o fim da norma', () => {
    const solto = [no('artigo', 0), no('artigo', 0), no('artigo', 0)];
    expect(artigosAteOFimDaSecao(solto, 1)).toBe(2);
  });

  it('índice fora da árvore não conta nada, e os minutos nunca ficam abaixo de 1', () => {
    expect(artigosAteOFimDaSecao(nos, 99)).toBe(0);
    expect(artigosAteOFimDaSecao(nos, -1)).toBe(0);
    expect(minutosAteOFimDaSecao(nos, 99)).toBe(1);
    expect(minutosAteOFimDaSecao(nos, 6)).toBe(3);
  });
});
