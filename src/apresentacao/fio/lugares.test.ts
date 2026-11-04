import {
  comNavDoFio,
  LUGARES,
  lugarDaRota,
  noQuadroDoFio,
  ROTA_DO_PASSO,
  ROTA_DO_POUSO,
  ROTA_DO_VARAL,
  semPilulaDosLugares,
} from './lugares';

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
    ['/varal/normas', 'varal'],
    ['/biblioteca/normas/n1', 'varal'],
    ['/recall/frases', 'varal'],
  ])('a rota %s mora em %s', (rota, lugar) => {
    expect(lugarDaRota(rota)).toBe(lugar);
  });

  it('a Conta e as Orientações não acendem nenhum lugar', () => {
    expect(lugarDaRota('/conta')).toBeUndefined();
    expect(lugarDaRota('/orientacoes/ler')).toBeUndefined();
  });

  it.each([
    ['/', true, true],
    ['/destino', true, true],
    ['/varal', true, true],
    ['/varal/normas', true, true],
    ['/varal/sumulas', true, true],
    ['/fio/passo', true, false],
    ['/fio/pouso', true, false],
    // O que ainda mora na casca de antes: nem quadro, nem nav do quadro.
    ['/biblioteca/normas/n1', false, false],
    ['/recall/frases', false, false],
    ['/conta', false, false],
    ['/varalzinho', false, false],
  ])('%s: no quadro do mockup? %s; com a nav embaixo? %s', (rota, noQuadro, comNav) => {
    expect(noQuadroDoFio(rota)).toBe(noQuadro);
    expect(comNavDoFio(rota)).toBe(comNav);
  });

  it('o Varal tem a rota dele, e os folhetos moram embaixo dela', () => {
    expect(ROTA_DO_VARAL).toBe('/varal');
    expect(LUGARES.find((l) => l.id === 'varal')?.caminho).toBe(ROTA_DO_VARAL);
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
