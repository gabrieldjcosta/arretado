import { deOndeVeio, esquecerDeOndeVeio, lembrarDeOndeVeio, VOLTA_PADRAO } from './volta-do-leitor';

const NORMA = '/biblioteca/normas/abc';

describe('o "Voltar" do Leitor: de onde a pessoa veio', () => {
  beforeEach(esquecerDeOndeVeio);

  it('sem origem (endereço aberto direto, recarga), leva à lista de normas do Varal', () => {
    expect(deOndeVeio()).toBe(VOLTA_PADRAO);
    expect(VOLTA_PADRAO).toBe('/varal/normas');
    lembrarDeOndeVeio(NORMA);
    expect(deOndeVeio()).toBe(VOLTA_PADRAO);
  });

  it('guarda o endereço de onde a pessoa entrou na norma, com a busca', () => {
    lembrarDeOndeVeio('/destino');
    lembrarDeOndeVeio('/biblioteca/acervo', '?tipo=norma&q=CP');
    // Fora da norma nada é origem ainda.
    expect(deOndeVeio()).toBe(VOLTA_PADRAO);
    lembrarDeOndeVeio(NORMA);
    expect(deOndeVeio()).toBe('/biblioteca/acervo?tipo=norma&q=CP');
  });

  it('a norma, os endereços internos dela (foco, "ir para") e o mapa não contam como origem', () => {
    lembrarDeOndeVeio('/fio/passo');
    lembrarDeOndeVeio(NORMA);
    lembrarDeOndeVeio(NORMA, '?foco=artigo');
    lembrarDeOndeVeio(`${NORMA}/mapa`);
    lembrarDeOndeVeio('/biblioteca/normas/outra');
    expect(deOndeVeio()).toBe('/fio/passo');
  });

  it('sair da norma para outra tela e voltar pelo navegador mantém a origem, também em dois passos', () => {
    lembrarDeOndeVeio('/varal/normas');
    lembrarDeOndeVeio(NORMA);
    // O link "Conta › Aparência" dos ajustes de leitura, e de lá outra tela da Conta.
    lembrarDeOndeVeio('/conta/aparencia');
    lembrarDeOndeVeio('/conta/dados');
    lembrarDeOndeVeio('/conta/aparencia', '', true);
    lembrarDeOndeVeio(NORMA, '', true);
    expect(deOndeVeio()).toBe('/varal/normas');
  });

  it('entrar de novo na norma por um link, vindo de outra tela, troca a origem', () => {
    lembrarDeOndeVeio('/varal/normas');
    lembrarDeOndeVeio(NORMA);
    lembrarDeOndeVeio('/destino');
    lembrarDeOndeVeio(NORMA);
    expect(deOndeVeio()).toBe('/destino');
  });

  it('a mesma rota anotada duas vezes (o desenho que se repete) não muda nada', () => {
    lembrarDeOndeVeio('/destino');
    lembrarDeOndeVeio(NORMA);
    lembrarDeOndeVeio(NORMA);
    expect(deOndeVeio()).toBe('/destino');
  });
});
