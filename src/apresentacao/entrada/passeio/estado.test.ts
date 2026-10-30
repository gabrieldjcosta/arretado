import {
  anuncioDaTela,
  aoAgoraNao,
  aoEsc,
  aoPular,
  aoSeguir,
  aoVamos,
  aoVoltar,
  PRIMEIRO_PASSO,
  TELA_BOAS,
  TELA_COMECAR,
  type Roteiro,
  type Tela,
} from './estado';
import { PASSOS } from './passos';

const primeira: Roteiro = { revisao: false, origem: 'boas' };
const refeito: Roteiro = { revisao: true, origem: 'boas' };
const daConta: Roteiro = { revisao: true, origem: 'passo' };
const passo = (indice: number): Tela => ({ tipo: 'passo', indice });
const ULTIMO = PASSOS.length - 1;

describe('o Passeio (D-D10): para onde cada controle leva', () => {
  it('"Vamos" vai ao primeiro passo', () => {
    expect(aoVamos()).toEqual(PRIMEIRO_PASSO);
    expect(PRIMEIRO_PASSO).toEqual(passo(0));
  });

  it('"Seguir" anda um passo por menu, na ordem das abas', () => {
    expect(PASSOS.map((p) => p.nome)).toEqual(['Hoje', 'Trilha', 'Fixar', 'Biblioteca']);
    for (let i = 0; i < ULTIMO; i += 1) expect(aoSeguir(passo(i), primeira)).toEqual(passo(i + 1));
  });

  it('o último passo da primeira vez segue para o Começar; refeito, "Concluir" fecha', () => {
    expect(aoSeguir(passo(ULTIMO), primeira)).toEqual(TELA_COMECAR);
    expect(aoSeguir(passo(ULTIMO), refeito)).toBe('fechar');
    expect(aoSeguir(passo(ULTIMO), daConta)).toBe('fechar');
  });

  it('refeito, o Começar nunca aparece, de nenhum passo nem de nenhum controle', () => {
    for (let i = 0; i <= ULTIMO; i += 1) {
      for (const roteiro of [refeito, daConta]) {
        expect(aoSeguir(passo(i), roteiro)).not.toEqual(TELA_COMECAR);
        expect(aoEsc(passo(i), roteiro)).not.toEqual(TELA_COMECAR);
      }
    }
    expect(aoPular(refeito)).toBe('fechar');
    expect(aoPular(daConta)).toBe('fechar');
  });

  it('"Voltar" desfaz um passo; do primeiro, volta às Boas-vindas ou, vindo da Conta, ao app', () => {
    for (let i = 1; i <= ULTIMO; i += 1) expect(aoVoltar(passo(i), primeira)).toEqual(passo(i - 1));
    expect(aoVoltar(passo(0), primeira)).toEqual(TELA_BOAS);
    expect(aoVoltar(passo(0), refeito)).toEqual(TELA_BOAS);
    expect(aoVoltar(passo(0), daConta)).toBe('fechar');
  });

  it('"Pular o passeio" leva ao Começar na primeira vez e fecha quando refeito', () => {
    expect(aoPular(primeira)).toEqual(TELA_COMECAR);
    expect(aoPular(refeito)).toBe('fechar');
  });

  it('"Agora não" também pula o passeio: com a conta ligada leva ao Começar; sem ela, ou refeito, fecha', () => {
    expect(aoAgoraNao(primeira, true)).toEqual(TELA_COMECAR);
    expect(aoAgoraNao(primeira, false)).toBe('fechar');
    expect(aoAgoraNao(refeito, true)).toBe('fechar');
    expect(aoAgoraNao(daConta, true)).toBe('fechar');
  });

  it('Esc: num passo é "Pular o passeio"; nas Boas-vindas e no Começar fecha a folha', () => {
    expect(aoEsc(TELA_BOAS, primeira)).toBe('fechar');
    expect(aoEsc(TELA_COMECAR, primeira)).toBe('fechar');
    for (let i = 0; i <= ULTIMO; i += 1) {
      expect(aoEsc(passo(i), primeira)).toEqual(TELA_COMECAR);
      expect(aoEsc(passo(i), refeito)).toBe('fechar');
    }
  });

  it('só os passos andam: nas outras telas, "Seguir" e "Voltar" fecham em vez de inventar um destino', () => {
    expect(aoSeguir(TELA_BOAS, primeira)).toBe('fechar');
    expect(aoVoltar(TELA_COMECAR, primeira)).toBe('fechar');
  });

  it('o leitor de tela ouve o título da tela e, nos passos, "Passo N de 4: Nome"', () => {
    expect(anuncioDaTela(TELA_BOAS)).toBe('Boas-vindas ao Arretado!');
    expect(anuncioDaTela(TELA_COMECAR)).toBe('Vamo começar?');
    expect(anuncioDaTela(passo(0))).toBe('Passo 1 de 4: Hoje');
    expect(anuncioDaTela(passo(3))).toBe('Passo 4 de 4: Biblioteca');
  });
});
