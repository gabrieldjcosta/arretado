import { describe, expect, it } from 'vitest';
import { alteracoesDoPerfil, PERFIS, preverPerfil } from './perfis';

describe('perfis de estudo', () => {
  it('tem os três perfis, sem rótulo clínico', () => {
    expect(PERFIS.map((p) => p.id)).toEqual(['calmo', 'guiado', 'leitura']);
  });

  it('prévia lista só o que muda, do valor de hoje para o novo', () => {
    const mudancas = preverPerfil({ tamanhoFonte: 18, reguaDeLeitura: true }, 'leitura');
    const campos = mudancas.map((m) => m.campo);
    expect(campos).toContain('tamanhoFonte');
    expect(campos).not.toContain('reguaDeLeitura');
    expect(mudancas.find((m) => m.campo === 'tamanhoFonte')).toMatchObject({
      de: '18 px',
      para: '20 px',
    });
  });

  it('prévia vazia quando nada muda', () => {
    expect(preverPerfil({}, 'guiado').map((m) => m.campo)).toEqual(['temporizadorPadraoMin']);
    expect(preverPerfil({ temporizadorPadraoMin: 25 }, 'guiado')).toEqual([]);
  });

  it('aplicar guarda o perfil anterior; reaplicar o mesmo não o apaga', () => {
    expect(alteracoesDoPerfil({}, 'calmo')).not.toHaveProperty('perfilAnterior');
    expect(alteracoesDoPerfil({ perfilDeEstudo: 'calmo' }, 'leitura')).toMatchObject({
      perfilDeEstudo: 'leitura',
      perfilAnterior: 'calmo',
    });
    expect(alteracoesDoPerfil({ perfilDeEstudo: 'leitura' }, 'leitura')).not.toHaveProperty(
      'perfilAnterior',
    );
  });

  it('os destaques abrem ligados (D-D17): o Calmo os desliga, o Guiado e a Leitura não mexem no padrão', () => {
    const destaques = 'destacarCondicionantesEPrazos';
    expect(preverPerfil({}, 'calmo')).toContainEqual({
      campo: destaques,
      rotulo: 'Destacar prazos, condições e penas',
      de: 'Ligado',
      para: 'Desligado',
    });
    expect(preverPerfil({}, 'guiado').map((m) => m.campo)).not.toContain(destaques);
    expect(preverPerfil({}, 'leitura').map((m) => m.campo)).not.toContain(destaques);
    // Quem desligou os destaques os religa ao escolher a Leitura (e o Guiado).
    expect(preverPerfil({ destacarCondicionantesEPrazos: false }, 'leitura')).toContainEqual(
      expect.objectContaining({ campo: destaques, de: 'Desligado', para: 'Ligado' }),
    );
    expect(alteracoesDoPerfil({}, 'guiado')).toHaveProperty(destaques, true);
  });

  it('calmo e leitura limpam o temporizador (undefined remove o campo)', () => {
    expect(alteracoesDoPerfil({}, 'calmo')).toHaveProperty('temporizadorPadraoMin', undefined);
    expect(alteracoesDoPerfil({}, 'guiado').temporizadorPadraoMin).toBe(25);
  });
});
