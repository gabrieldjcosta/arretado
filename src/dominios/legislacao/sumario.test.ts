import { TipoDispositivo } from '../../core/modelo';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { estruturar } from './estruturador';
import { sumarioDoRascunho } from './sumario';
import { anomalia } from './validacao';

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
    expect(sumario.redacoesAnteriores).toBe(0);
    expect(sumario.pareceCompilada).toBe(true);
    expect(sumario.anomaliasPorTipo).toEqual([]);
  });

  it('linha tachada: vira redação anterior (8.6), não descarte, e não parece a compilada; texto puro nunca parece', () => {
    const comTachado = [...LEI.slice(0, 5), tachada('Art. 1º Redação antiga.'), ...LEI.slice(5)];
    const sumario = sumarioDoRascunho(estruturar(comTachado));
    expect(sumario.descartes).toEqual([
      { motivo: 'cabecalho', linhas: 1 },
      { motivo: 'fecho', linhas: 1 },
    ]);
    expect(sumario.redacoesAnteriores).toBe(1);
    expect(sumario.pareceCompilada).toBe(false);

    expect(sumarioDoRascunho(estruturar(LEI, { formato: 'texto' })).pareceCompilada).toBe(false);
  });

  it('relatório de anomalias (8.7): quantas de cada tipo, conflitos antes, na ordem da lista fechada', () => {
    const r = estruturar(LEI, { formato: 'texto' });
    expect(sumarioDoRascunho(r).anomaliasPorTipo).toEqual([
      { tipo: 'a_confirmar_acima_do_limite', gravidade: 'aviso', quantidade: 1 },
    ]);
    const anomalias = [
      anomalia('alinea_sem_inciso', 'Alínea.', { endereco: 'art1.alA' }),
      anomalia('linha_solta', 'Solta.'),
      anomalia('endereco_duplicado', 'Repetido.', { endereco: 'art1' }),
      anomalia('alinea_sem_inciso', 'Alínea.', { endereco: 'art1.alB' }),
      anomalia('sem_artigos', 'Sem artigo.'),
    ];
    expect(sumarioDoRascunho({ ...r, anomalias }).anomaliasPorTipo).toEqual([
      { tipo: 'sem_artigos', gravidade: 'conflito', quantidade: 1 },
      { tipo: 'endereco_duplicado', gravidade: 'conflito', quantidade: 1 },
      { tipo: 'linha_solta', gravidade: 'aviso', quantidade: 1 },
      { tipo: 'alinea_sem_inciso', gravidade: 'aviso', quantidade: 2 },
    ]);
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
