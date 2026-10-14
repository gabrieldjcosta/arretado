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

  it('calmo e leitura limpam o temporizador (undefined remove o campo)', () => {
    expect(alteracoesDoPerfil({}, 'calmo')).toHaveProperty('temporizadorPadraoMin', undefined);
    expect(alteracoesDoPerfil({}, 'guiado').temporizadorPadraoMin).toBe(25);
  });
});
