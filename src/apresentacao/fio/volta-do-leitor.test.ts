import { deOndeVeio, esquecerDeOndeVeio, lembrarDeOndeVeio, VOLTA_PADRAO } from './volta-do-leitor';

describe('o "Voltar" do Leitor: de onde a pessoa veio', () => {
  beforeEach(esquecerDeOndeVeio);

  it('sem origem (endereço aberto direto, recarga), leva à lista de normas do Varal', () => {
    expect(deOndeVeio()).toBe(VOLTA_PADRAO);
    expect(VOLTA_PADRAO).toBe('/varal/normas');
  });

  it('guarda o último endereço fora da norma, com a busca', () => {
    lembrarDeOndeVeio('/destino');
    lembrarDeOndeVeio('/biblioteca/acervo', '?tipo=norma&q=CP');
    expect(deOndeVeio()).toBe('/biblioteca/acervo?tipo=norma&q=CP');
  });

  it('a norma, os endereços internos dela (foco, "ir para") e o mapa não contam como origem', () => {
    lembrarDeOndeVeio('/fio/passo');
    lembrarDeOndeVeio('/biblioteca/normas/abc');
    lembrarDeOndeVeio('/biblioteca/normas/abc', '?foco=artigo');
    lembrarDeOndeVeio('/biblioteca/normas/abc/mapa');
    expect(deOndeVeio()).toBe('/fio/passo');
  });
});
