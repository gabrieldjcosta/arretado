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
  it('sem achado, vazio', () => {
    expect(filtrarItens(ITENS_FIXOS, 'zzzz')).toEqual([]);
  });
});
