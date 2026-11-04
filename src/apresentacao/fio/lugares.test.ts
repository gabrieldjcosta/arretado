import { LUGARES, lugarDaRota } from './lugares';

describe('os três lugares do Arretado novo', () => {
  it('são Agora, Destino e Varal, nessa ordem', () => {
    expect(LUGARES.map((l) => l.nome)).toEqual(['Agora', 'Destino', 'Varal']);
  });

  it.each([
    ['/', 'agora'],
    ['/fio/passo', 'agora'],
    ['/fio/pouso', 'agora'],
    ['/sessao/abrir', 'agora'],
    ['/comecar/defensoria', 'agora'],
    ['/destino', 'destino'],
    ['/plano/ciclo', 'destino'],
    ['/varal', 'varal'],
    ['/biblioteca/normas/n1', 'varal'],
    ['/recall/frases', 'varal'],
  ])('a rota %s mora em %s', (rota, lugar) => {
    expect(lugarDaRota(rota)).toBe(lugar);
  });

  it('a Conta e as Orientações não acendem nenhum lugar', () => {
    expect(lugarDaRota('/conta')).toBeUndefined();
    expect(lugarDaRota('/orientacoes/ler')).toBeUndefined();
  });
});
