import dadosBrutos from './nordeste.json';
import type { DadosDoNordeste } from './nordeste';
import {
  caminhoDoTrecho,
  faixasDosEstados,
  passosDoEstado,
  pontoDaCurva,
  portasDaTrilha,
  posicaoDoLugar,
} from './trilha';

const dados = dadosBrutos as unknown as DadosDoNordeste;
const lugares = dados.ordem;

describe('a curva do caminho', () => {
  it('passa pelos lugares: t 0 é o lugar de trás e t 1 o da frente', () => {
    const a = lugares[3];
    const b = lugares[4];
    expect(a && b).toBeTruthy();
    const ini = pontoDaCurva(lugares, 3, 0);
    const fim = pontoDaCurva(lugares, 3, 1);
    expect(ini.x).toBeCloseTo(a?.x ?? NaN, 5);
    expect(ini.y).toBeCloseTo(a?.y ?? NaN, 5);
    expect(fim.x).toBeCloseTo(b?.x ?? NaN, 5);
    expect(fim.y).toBeCloseTo(b?.y ?? NaN, 5);
  });

  it('o lugar j é a mesma posição pelas duas pontas', () => {
    expect(posicaoDoLugar(0)).toEqual({ seg: 0, t: 0 });
    expect(posicaoDoLugar(5)).toEqual({ seg: 4, t: 1 });
    const direto = pontoDaCurva(lugares, 5, 0);
    const pelaTras = pontoDaCurva(lugares, 4, 1);
    expect(pelaTras.x).toBeCloseTo(direto.x, 5);
    expect(pelaTras.y).toBeCloseTo(direto.y, 5);
  });

  it('o trecho vira um caminho SVG que começa e termina nos lugares', () => {
    const d = caminhoDoTrecho(lugares, posicaoDoLugar(1), posicaoDoLugar(3));
    expect(d.startsWith('M')).toBe(true);
    const primeiro = lugares[1];
    expect(d.startsWith(`M${primeiro?.x.toFixed(1) ?? ''} ${primeiro?.y.toFixed(1) ?? ''}`)).toBe(
      true,
    );
    const ultimo = lugares[3];
    expect(d.endsWith(`${ultimo?.x.toFixed(1) ?? ''} ${ultimo?.y.toFixed(1) ?? ''}`)).toBe(true);
  });

  it('sem trecho entre as posições, não há o que desenhar', () => {
    expect(caminhoDoTrecho(lugares, posicaoDoLugar(2), posicaoDoLugar(2))).toBe('');
    expect(caminhoDoTrecho(lugares, posicaoDoLugar(4), posicaoDoLugar(2))).toBe('');
    expect(caminhoDoTrecho([], { seg: 0, t: 0 }, { seg: 0, t: 1 })).toBe('');
  });
});

describe('os estados no caminho', () => {
  it('cada estado tem seus lugares seguidos, na ordem da jornada', () => {
    const faixas = faixasDosEstados(lugares);
    expect(faixas.MA).toEqual({ inicio: 0, lugares: 3 });
    expect(faixas.PI).toEqual({ inicio: 3, lugares: 4 });
    expect(faixas.BA.inicio + faixas.BA.lugares).toBe(lugares.length);
    const soma = Object.values(faixas).reduce((n, f) => n + f.lugares, 0);
    expect(soma).toBe(lugares.length);
  });

  it('há uma porteira em cada divisa: oito, uma entre cada par de estados', () => {
    const portas = portasDaTrilha(lugares);
    expect(portas).toHaveLength(8);
    expect(portas.map((p) => `${p.de}>${p.para}`)).toEqual([
      'MA>PI',
      'PI>CE',
      'CE>RN',
      'RN>PB',
      'PB>PE',
      'PE>AL',
      'AL>SE',
      'SE>BA',
    ]);
    // Fica no meio do trecho que muda de estado.
    for (const p of portas) {
      expect(p.t).toBe(0.5);
      expect(lugares[p.seg]?.uf).toBe(p.de);
      expect(lugares[p.seg + 1]?.uf).toBe(p.para);
    }
  });

  it('os pontos dos artigos: quatro por trecho dentro do estado e dois antes da porteira', () => {
    // Maranhão tem 3 lugares: 2 trechos de dentro (8 pontos) e o de saída (2).
    expect(passosDoEstado(lugares, 'MA')).toHaveLength(10);
    // Bahia é o último: só trechos de dentro, 9 trechos.
    expect(passosDoEstado(lugares, 'BA')).toHaveLength(36);
    expect(passosDoEstado(lugares, 'XX')).toHaveLength(0);
  });

  it('os pontos seguem o caminho: cada um fica no trecho que diz', () => {
    const passos = passosDoEstado(lugares, 'PI');
    for (const p of passos) {
      const curva = pontoDaCurva(lugares, p.seg, p.t);
      expect(p.x).toBeCloseTo(curva.x, 5);
      expect(p.y).toBeCloseTo(curva.y, 5);
      expect(lugares[p.seg]?.uf).toBe('PI');
    }
    const ordemDoCaminho = passos.map((p) => p.seg + p.t);
    expect([...ordemDoCaminho].sort((a, b) => a - b)).toEqual(ordemDoCaminho);
  });
});
