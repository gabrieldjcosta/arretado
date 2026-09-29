import { TipoDispositivo } from '../../core/modelo';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { estruturar } from './estruturador';
import { sumarioDoRascunho } from './sumario';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const tachada = (texto: string): Bloco => ({ trechos: [{ texto, tachado: true }] });
const LEI: Bloco[] = [
  linha('Presidência da República'),
  linha('LEI Nº 1.234, DE 5 DE MAIO DE 2020.'),
  linha('Dispõe sobre o teste.'),
  linha('TÍTULO I'),
  linha('DAS DISPOSIÇÕES GERAIS'),
  linha('Art. 1º Esta Lei trata do teste.'),
  linha('Parágrafo único. O teste é contínuo.'),
  linha('Art. 2º São deveres:'),
  linha('I - estudar;'),
  linha('II - revisar.'),
  linha('Brasília, 5 de maio de 2020; 199º da Independência e 132º da República.'),
];

describe('sumário da importação (9.5)', () => {
  it('conta os nós por tipo, na ordem da estrutura, e as linhas que ficaram de fora', () => {
    const sumario = sumarioDoRascunho(estruturar(LEI));
    expect(sumario.porTipo).toEqual([
      { tipo: 'titulo', quantidade: 1 },
      { tipo: 'artigo', quantidade: 2 },
      { tipo: 'nome', quantidade: 1 },
      { tipo: 'paragrafo', quantidade: 1 },
      { tipo: 'inciso', quantidade: 2 },
    ]);
    expect(sumario.descartes).toEqual([
      { motivo: 'cabecalho', linhas: 1 },
      { motivo: 'fecho', linhas: 1 },
    ]);
    expect(sumario.pareceCompilada).toBe(true);
  });

  it('linha tachada: não parece a compilada; texto puro nunca parece', () => {
    const comTachado = [...LEI.slice(0, 5), tachada('Art. 1º Redação antiga.'), ...LEI.slice(5)];
    const sumario = sumarioDoRascunho(estruturar(comTachado));
    expect(sumario.descartes).toContainEqual({ motivo: 'redacao_anterior', linhas: 1 });
    expect(sumario.pareceCompilada).toBe(false);

    expect(sumarioDoRascunho(estruturar(LEI, { formato: 'texto' })).pareceCompilada).toBe(false);
  });

  it('todo tipo do modelo tem lugar na ordem de exibição', () => {
    const nos = TipoDispositivo.options.map((tipo) => ({
      tipo,
      endereco: tipo,
      trechos: [],
      notas: [],
      redacoesAnteriores: [],
      status: 'vigente' as const,
      confianca: 'alta' as const,
      filhos: [],
      linhas: { inicio: 0, fim: 0 },
    }));
    const sumario = sumarioDoRascunho({ ...estruturar(LEI), nos });
    expect(sumario.porTipo.map((t) => t.tipo).sort()).toEqual([...TipoDispositivo.options].sort());
  });
});
