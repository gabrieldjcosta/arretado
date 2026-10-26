import tabelaJson from '../../../public/incidencia/fcc-defensor-sp/materias.json';
import { calcularPesos } from './pesos';
import {
  incidenciaDasMaterias,
  tabelaServeAoEdital,
  TabelaDeMaterias,
} from './incidencia-materias';

const tabela = TabelaDeMaterias.parse(tabelaJson);

describe('incidenciaDasMaterias', () => {
  it('casa o nome do edital sem olhar caixa nem acento', () => {
    const r = incidenciaDasMaterias(tabela, [
      { disciplinaId: 'dh', nome: 'DIREITOS HUMANOS' },
      { disciplinaId: 'eca', nome: 'Direito da Criança e do Adolescente' },
      { disciplinaId: 'emp', nome: 'DIREITO EMPRESARIAL' },
    ]);
    expect(r.get('dh')).toEqual({ incidencia: 0.1074, mediaDasOutras: false });
    expect(r.get('eca')?.incidencia).toBe(0.082);
    expect(r.get('emp')).toEqual({ incidencia: (0.1074 + 0.082) / 2, mediaDasOutras: true });
  });
  it('duas matérias do plano na mesma linha dividem a parcela', () => {
    const r = incidenciaDasMaterias(tabela, [
      { disciplinaId: 'a', nome: 'Execução Penal' },
      { disciplinaId: 'b', nome: 'Direito da Execução Penal' },
    ]);
    expect(r.get('a')?.incidencia).toBeCloseTo(0.0229);
  });
  it('sem nenhuma matéria na tabela devolve vazio', () => {
    expect(
      incidenciaDasMaterias(tabela, [{ disciplinaId: 'x', nome: 'Direito Agrário' }]).size,
    ).toBe(0);
  });
  it('pesa as matérias que a banca mais cobra com mais vezes por volta', () => {
    const nomes = ['Direitos Humanos', 'Direito do Consumidor', 'Direito Agrário'];
    const inc = incidenciaDasMaterias(
      tabela,
      nomes.map((nome, i) => ({ disciplinaId: String(i), nome })),
    );
    const { base, pesos } = calcularPesos(
      nomes.map((_, i) => ({
        disciplinaId: String(i),
        itensAltos: 0,
        incidencia: inc.get(String(i))!.incidencia,
        incidenciaMedia: inc.get(String(i))!.mediaDasOutras,
      })),
    );
    expect(base).toBe('incidencia');
    expect(pesos.map((p) => p.peso)).toEqual([2, 1, 1]);
    expect(pesos[2]?.razao).toBe('sem dado da banca: peso médio');
  });
});

describe('tabelaServeAoEdital', () => {
  it('exige a banca e o cargo do recorte', () => {
    expect(
      tabelaServeAoEdital(tabela, { banca: 'FCC', cargo: 'Defensor Público de Classe Inicial' }),
    ).toBe(true);
    expect(tabelaServeAoEdital(tabela, { banca: 'Cebraspe', cargo: 'Defensor Público' })).toBe(
      false,
    );
    expect(tabelaServeAoEdital(tabela, { banca: 'FCC' })).toBe(false);
  });
});
