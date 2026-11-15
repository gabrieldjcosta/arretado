import { describe, expect, it } from 'vitest';
import { filtrarItens, ITENS_FIXOS } from './itens';

describe('filtrarItens', () => {
  it('sem consulta devolve tudo', () => {
    expect(filtrarItens(ITENS_FIXOS, '  ')).toHaveLength(ITENS_FIXOS.length);
  });
  it('ignora acento e caixa', () => {
    expect(filtrarItens(ITENS_FIXOS, 'ORIENTACOES').map((i) => i.id)).toEqual(['orientacoes']);
  });
  it('acha pelas palavras-chave', () => {
    expect(filtrarItens(ITENS_FIXOS, 'mapa').map((i) => i.id)).toEqual(['destino']);
  });
  it('a Trilha, que não é lugar do Fio, se acha pelo nome e pelo que guarda', () => {
    expect(filtrarItens(ITENS_FIXOS, 'ciclo').map((i) => i.para)).toEqual(['/plano']);
    expect(filtrarItens(ITENS_FIXOS, 'data da prova').map((i) => i.para)).toEqual(['/plano']);
    expect(filtrarItens(ITENS_FIXOS, 'trilha').map((i) => i.id)).toEqual(['destino', 'trilha']);
  });
  it('sem achado, vazio', () => {
    expect(filtrarItens(ITENS_FIXOS, 'zzzz')).toEqual([]);
  });
});
