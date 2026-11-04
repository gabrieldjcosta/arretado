import { LUGARES, lugarDaRota, ROTA_DO_PASSO, ROTA_DO_POUSO, semPilulaDosLugares } from './lugares';

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

  it('só o pouso esconde a pílula dos lugares', () => {
    expect(ROTA_DO_POUSO).toBe('/fio/pouso');
    expect(ROTA_DO_PASSO).toBe('/fio/passo');
    expect(semPilulaDosLugares(ROTA_DO_POUSO)).toBe(true);
    expect(semPilulaDosLugares(ROTA_DO_PASSO)).toBe(false);
    expect(semPilulaDosLugares('/')).toBe(false);
    expect(semPilulaDosLugares('/destino')).toBe(false);
  });
});
