import { reancorar } from './reancoragem';

describe('reancorar (exata → aproximada → pendente)', () => {
  const ancora = { texto: 'texto longo', inicio: 20, fim: 31 };

  it('exata no lugar: valida', () => {
    expect(reancorar(ancora, 'Primeiro artigo com texto longo.')).toEqual({
      status: 'valida',
      modo: 'exata',
      inicio: 20,
      fim: 31,
      texto: 'texto longo',
    });
  });

  it('exata em outro lugar: a ocorrência mais perto', () => {
    expect(reancorar(ancora, 'Aviso. Primeiro artigo com texto longo; texto longo.')).toMatchObject(
      {
        status: 'reancorada',
        modo: 'exata',
        inicio: 27,
      },
    );
  });

  it('aproximada: caixa, acento e espaços não contam', () => {
    const r = reancorar(
      { texto: 'Execução  penal', inicio: 2, fim: 17 },
      'A EXECUCAO PENAL tem objetivo.',
    );
    expect(r).toEqual({
      status: 'reancorada',
      modo: 'aproximada',
      inicio: 2,
      fim: 16,
      texto: 'EXECUCAO PENAL',
    });
  });

  it('aproximada: trecho longo com poucas letras diferentes', () => {
    const texto = 'O juiz decidirá sobre a progressão de regime prisional, ouvido o MP.';
    const r = reancorar({ texto: 'a progressao do regime prisonal', inicio: 22, fim: 53 }, texto);
    expect(r).toMatchObject({ status: 'reancorada', modo: 'aproximada' });
    if (r.status !== 'pendente') expect(r.texto).toBe('a progressão de regime prisional');
  });

  it('pendente: trecho curto e diferente não casa por aproximação', () => {
    expect(
      reancorar({ texto: 'Segundo artigo.', inicio: 0, fim: 15 }, 'Segundo artigo mudou.'),
    ).toEqual({ status: 'pendente' });
  });

  it('pendente: diferença grande demais, ou âncora vazia', () => {
    expect(
      reancorar(
        { texto: 'a progressão de regime prisional', inicio: 0, fim: 32 },
        'Nada a ver com o que estava escrito antes aqui.',
      ),
    ).toEqual({ status: 'pendente' });
    expect(reancorar({ texto: '', inicio: 0, fim: 0 }, 'abc')).toEqual({ status: 'pendente' });
  });
});
