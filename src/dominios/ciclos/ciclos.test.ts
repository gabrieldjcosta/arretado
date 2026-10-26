import { sugerirAjustes } from './ajuste';
import { gerarBlocos, voltasPorSemana } from './gerar';
import { pesosDoModelo } from './modelos';
import { calcularPesos, taxaDeErro } from './pesos';

describe('calcularPesos', () => {
  it('usa o edital quando falta incidência em alguma matéria', () => {
    const { base, pesos } = calcularPesos([
      { disciplinaId: 'a', incidencia: 0.5, itensAltos: 10 },
      { disciplinaId: 'b', itensAltos: 2 },
    ]);
    expect(base).toBe('edital');
    expect(pesos.map((p) => p.peso)).toEqual([2, 1]);
  });
  it('usa a incidência quando todas a trazem, com limites 1 a 4', () => {
    const { base, pesos } = calcularPesos([
      { disciplinaId: 'a', incidencia: 0.9, itensAltos: 0 },
      { disciplinaId: 'b', incidencia: 0.05, itensAltos: 0 },
      { disciplinaId: 'c', incidencia: 0.05, itensAltos: 0 },
    ]);
    expect(base).toBe('incidencia');
    expect(pesos.map((p) => p.peso)).toEqual([3, 1, 1]);
    expect(pesos[0]?.razao).toBe('peso pelas questões da banca');
  });
  it('ajuste manual vence e respeita o teto', () => {
    const { pesos } = calcularPesos([{ disciplinaId: 'a', itensAltos: 1, pesoManual: 9 }]);
    expect(pesos[0]).toMatchObject({ peso: 4, razao: 'ajuste seu' });
  });
  it('sem nenhum item alto, todas valem 1', () => {
    const { pesos } = calcularPesos([
      { disciplinaId: 'a', itensAltos: 0 },
      { disciplinaId: 'b', itensAltos: 0 },
    ]);
    expect(pesos.map((p) => p.peso)).toEqual([1, 1]);
  });
});

describe('gerarBlocos', () => {
  const pesos = (...p: number[]) =>
    p.map((peso, i) => ({ disciplinaId: String.fromCharCode(97 + i), peso, razao: '' }));
  it('soma dos blocos = soma dos pesos e cada matéria aparece peso vezes', () => {
    const blocos = gerarBlocos(pesos(3, 2, 1), 40);
    expect(blocos).toHaveLength(6);
    expect(blocos.filter((b) => b.disciplinaId === 'a')).toHaveLength(3);
    expect(blocos.every((b) => b.minutos === 40)).toBe(true);
  });
  it('não repete matéria vizinha quando é possível', () => {
    const ids = gerarBlocos(pesos(3, 2, 2), 30).map((b) => b.disciplinaId);
    ids.slice(1).forEach((id, i) => {
      expect(id).not.toBe(ids[i]);
    });
  });
  it('repete só quando não há outra saída', () => {
    expect(gerarBlocos(pesos(3, 1), 30).map((b) => b.disciplinaId)).toEqual(['a', 'b', 'a', 'a']);
  });
  it('voltas por semana', () => {
    expect(voltasPorSemana(gerarBlocos(pesos(2, 2), 30), 4)).toBe(2);
  });
});

describe('sugerirAjustes', () => {
  const m = (id: string, peso: number, erros: number, questoes: number, taxaAnterior?: number) => ({
    disciplinaId: id,
    nome: id,
    peso,
    desempenho: { erros, questoes },
    taxaAnterior,
  });
  it('suavização: pouca amostra quase não mexe na taxa', () => {
    expect(taxaDeErro({ erros: 2, questoes: 2 })).toBeLessThan(
      taxaDeErro({ erros: 20, questoes: 20 }),
    );
  });
  it('sem amostra mínima, nenhuma sugestão', () => {
    expect(sugerirAjustes([m('a', 1, 9, 10)])).toEqual([]);
  });
  it('sobe uma aparição na matéria muito acima da média, nunca passa de 4', () => {
    const r = sugerirAjustes([m('a', 1, 20, 40), m('b', 4, 2, 40), m('c', 1, 2, 40)]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ disciplinaId: 'a', de: 1, para: 2 });
    expect(r[0]?.razao).toContain('questões');
  });
  it('desce só com duas janelas abaixo de 10%', () => {
    const base = [m('b', 2, 20, 40), m('c', 2, 20, 40)];
    expect(
      sugerirAjustes([m('a', 2, 0, 60), ...base]).find((s) => s.disciplinaId === 'a'),
    ).toBeUndefined();
    const r = sugerirAjustes([m('a', 2, 0, 60, 0.05), ...base]);
    expect(r.find((s) => s.disciplinaId === 'a')).toMatchObject({ de: 2, para: 1 });
  });
});

describe('pesosDoModelo', () => {
  const materias = [
    { disciplinaId: 'a', nome: 'Penal', itensAltos: 6 },
    { disciplinaId: 'b', nome: 'Civil', itensAltos: 2 },
    { disciplinaId: 'c', nome: 'Tributário', itensAltos: 0 },
  ];
  it('igual dá 1 a todas; equilibrado segue os assuntos altos', () => {
    expect(pesosDoModelo('igual', materias).pesos.map((p) => p.peso)).toEqual([1, 1, 1]);
    expect(pesosDoModelo('equilibrado', materias).pesos.map((p) => p.peso)).toEqual([2, 1, 1]);
  });
  it('reta final deixa pouco cobrada em 1 e sobe a muito cobrada', () => {
    expect(pesosDoModelo('reta_final', materias).pesos.map((p) => p.peso)).toEqual([3, 1, 1]);
  });
  it('reforço sem questões suficientes avisa e usa o equilíbrio; com amostra, sobe a pior', () => {
    const sem = pesosDoModelo('reforco', materias);
    expect(sem.aviso).toContain('equilíbrio');
    expect(sem.pesos.map((p) => p.peso)).toEqual([2, 1, 1]);
    const com = pesosDoModelo(
      'reforco',
      materias.map((m, i) => ({
        ...m,
        desempenho: i === 1 ? { erros: 25, questoes: 40 } : { erros: 3, questoes: 40 },
      })),
    );
    expect(com.aviso).toBeUndefined();
    expect(com.pesos[1]).toMatchObject({ peso: 2 });
  });
});
