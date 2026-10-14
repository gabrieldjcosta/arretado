import { describe, expect, it } from 'vitest';
import {
  CatalogoIndisponivel,
  FonteEmbutida,
  carreirasDisponiveis,
  carreirasPendentes,
  disciplinasSugeridas,
  editaisOferecidos,
  explicarFaixa,
} from './index';

const fonte = new FonteEmbutida();

describe('catálogo embutido', () => {
  it('índice lista carreiras disponíveis e pendentes', async () => {
    const indice = await fonte.listar();
    expect(indice.carreiras).toHaveLength(10);
    expect(carreirasDisponiveis(indice).length).toBeGreaterThanOrEqual(4);
    expect(carreirasPendentes(indice).length).toBe(10 - carreirasDisponiveis(indice).length);
  });

  it('todas as carreiras disponíveis carregam e batem com o índice', async () => {
    const indice = await fonte.listar();
    for (const c of carreirasDisponiveis(indice)) {
      const carreira = await fonte.obter(c.slug);
      expect(carreira.slug).toBe(c.slug);
      expect(carreira.editais.length).toBe(c.editais + c.orgaosSemEdital);
    }
  });

  it('recusa slug inexistente ou malformado', async () => {
    await expect(fonte.obter('nao-existe')).rejects.toMatchObject({ motivo: 'nao_encontrado' });
    await expect(fonte.obter('../index')).rejects.toBeInstanceOf(CatalogoIndisponivel);
  });

  it('recusa arquivo fora do formato', async () => {
    const ruim = new FonteEmbutida({}, { 'x/a.json': () => Promise.resolve({ versao: 2 }) });
    await expect(ruim.obter('a')).rejects.toMatchObject({ motivo: 'formato_invalido' });
    await expect(ruim.listar()).rejects.toMatchObject({ motivo: 'nao_encontrado' });
  });
});

describe('consultas', () => {
  it('editais oferecidos têm rótulo "baseado no edital" e disciplinas', async () => {
    const dp = await fonte.obter('defensoria-publica');
    const editais = editaisOferecidos(dp);
    expect(editais.length).toBeGreaterThan(0);
    for (const e of editais) expect(e.rotulo).toMatch(/^baseado no edital /);
    const anos = editais.map((e) => e.ano ?? 0);
    expect(anos).toEqual([...anos].sort((a, b) => b - a));
  });

  it('disciplinas sugeridas vêm das mais para as menos cobradas e explicam a base', async () => {
    const mg = await fonte.obter('magistratura');
    const lista = disciplinasSugeridas(mg);
    expect(lista[0]?.faixaSugerida).toBe('Altíssima');
    expect(explicarFaixa(lista[0]!)).not.toBe('');
    expect(explicarFaixa({ ...lista[0]!, faixaSugerida: null })).toBe('');
  });
});
