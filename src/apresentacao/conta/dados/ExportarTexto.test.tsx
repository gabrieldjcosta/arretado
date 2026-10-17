import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { ContextoRepositorio } from '../../dados/contexto';
import { ExportarTexto } from './ExportarTexto';
import { formatarFrasesTexto, formatarResumosTexto, nomeArquivoExportacao } from './textos-backup';

// ── Fixtures sintéticas para teste das funções puras ──────────────────────

const FIXTURE_DISCIPLINAS: Record<string, string> = {
  'disc-penal': 'Direito Penal',
  'disc-const': 'Direito Constitucional',
};

const FIXTURE_FRASES = [
  {
    texto: 'O dolo eventual é compatível com a tentativa no tribunal do júri.',
    disciplinaId: 'disc-penal',
  },
  {
    texto: 'A norma de eficácia plena produz todos os seus efeitos desde a promulgação.',
    disciplinaId: 'disc-const',
  },
  {
    texto: 'Não há crime sem lei anterior que o defina.',
    disciplinaId: 'disc-penal',
  },
  {
    texto: 'Frase geral sem matéria definida.',
  },
];

const FIXTURE_FRASES_SEM_DISCIPLINA = [
  { texto: 'Primeira frase avulsa.' },
  { texto: 'Segunda frase avulsa.' },
];

const FIXTURE_RESUMOS = [
  {
    titulo: 'Controle Difuso',
    conteudo: 'O controle difuso pode ser exercido por qualquer juiz ou tribunal no caso concreto.',
    disciplinaId: 'disc-const',
  },
  {
    titulo: 'Princípio da Insignificância',
    conteudo:
      'Princípio da Insignificância\nO princípio afasta a tipicidade material quando a lesão ao bem jurídico for inexpressiva.',
    disciplinaId: 'disc-penal',
  },
  {
    titulo: 'Resumo Geral',
    conteudo: 'Resumo avulso sem disciplina.',
  },
];

const FIXTURE_RESUMOS_SEM_DISCIPLINA = [
  {
    titulo: 'Ato Administrativo',
    conteudo:
      'Os atributos do ato administrativo são presunção de legitimidade, imperatividade e autoexecutoriedade.',
  },
  {
    titulo: 'Desapropriação',
    conteudo:
      'A desapropriação por necessidade pública exige justa e prévia indenização em dinheiro.',
  },
];

describe('Funções puras de formatação de texto (.txt)', () => {
  it('formata frases agrupadas por disciplina em blocos, com ordenação alfabética e sem disciplina no fim', () => {
    const texto = formatarFrasesTexto(FIXTURE_FRASES, FIXTURE_DISCIPLINAS);
    const esperado = [
      '# Direito Constitucional',
      '',
      'A norma de eficácia plena produz todos os seus efeitos desde a promulgação.',
      '',
      '# Direito Penal',
      '',
      'O dolo eventual é compatível com a tentativa no tribunal do júri.',
      '',
      'Não há crime sem lei anterior que o defina.',
      '',
      '# Sem disciplina',
      '',
      'Frase geral sem matéria definida.',
    ].join('\n');

    expect(texto).toBe(esperado);
  });

  it('formata frases sem nenhuma disciplina como blocos simples, sem cabeçalho', () => {
    const texto = formatarFrasesTexto(FIXTURE_FRASES_SEM_DISCIPLINA, {});
    const esperado = 'Primeira frase avulsa.\n\nSegunda frase avulsa.';
    expect(texto).toBe(esperado);
  });

  it('lista vazia de frases retorna string vazia', () => {
    expect(formatarFrasesTexto([])).toBe('');
  });

  it('formata resumos agrupados por disciplina em blocos, com título e corpo', () => {
    const texto = formatarResumosTexto(FIXTURE_RESUMOS, FIXTURE_DISCIPLINAS);
    const esperado = [
      '# Direito Constitucional',
      '',
      'Controle Difuso',
      '',
      'O controle difuso pode ser exercido por qualquer juiz ou tribunal no caso concreto.',
      '',
      '# Direito Penal',
      '',
      'Princípio da Insignificância\nO princípio afasta a tipicidade material quando a lesão ao bem jurídico for inexpressiva.',
      '',
      '# Sem disciplina',
      '',
      'Resumo Geral',
      '',
      'Resumo avulso sem disciplina.',
    ].join('\n');

    expect(texto).toBe(esperado);
  });

  it('formata resumos sem nenhuma disciplina como blocos simples', () => {
    const texto = formatarResumosTexto(FIXTURE_RESUMOS_SEM_DISCIPLINA, {});
    const esperado = [
      'Ato Administrativo',
      '',
      'Os atributos do ato administrativo são presunção de legitimidade, imperatividade e autoexecutoriedade.',
      '',
      'Desapropriação',
      '',
      'A desapropriação por necessidade pública exige justa e prévia indenização em dinheiro.',
    ].join('\n');

    expect(texto).toBe(esperado);
  });

  it('lista vazia de resumos retorna string vazia', () => {
    expect(formatarResumosTexto([])).toBe('');
  });

  it('nome do arquivo leva a data no formato AAAA-MM-DD', () => {
    const data = new Date('2026-10-16T14:30:00.000Z');
    expect(nomeArquivoExportacao('frases', data)).toBe('arretado-frases-2026-10-16.txt');
    expect(nomeArquivoExportacao('resumos', data)).toBe('arretado-resumos-2026-10-16.txt');
  });
});

describe('Componente ExportarTexto', () => {
  it('sem dados: botões desabilitados com "Nenhuma frase ainda" e "Nenhum resumo ainda"', async () => {
    const { repo } = await repositorioDeTeste();
    render(
      <ContextoRepositorio.Provider value={repo}>
        <ExportarTexto />
      </ContextoRepositorio.Provider>,
    );

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Exportar em texto' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Arquivo sem senha, para ler ou guardar onde quiser. Não serve para restaurar; para isso, use o backup.',
      ),
    ).toBeInTheDocument();

    const botaoFrases = await screen.findByRole('button', { name: 'Nenhuma frase ainda' });
    const botaoResumos = await screen.findByRole('button', { name: 'Nenhum resumo ainda' });

    expect(botaoFrases).toBeDisabled();
    expect(botaoResumos).toBeDisabled();
  });

  it('com dados: botões habilitados com rótulos e disparam download ao clicar', async () => {
    const { repo } = await repositorioDeTeste({ inicio: '2026-10-16T12:00:00.000Z' });
    const penal = await repo.colecao('disciplinas').criar({ nome: 'Direito Penal' });
    await repo.colecao('frases').criar({
      texto: 'Não há crime sem lei anterior.',
      origemTipo: 'manual',
      disciplinaId: penal.id,
      estado: 'ativa',
      proximaRevisao: '2026-10-17',
    });
    await repo.colecao('notas').criar({
      tipo: 'resumo',
      titulo: 'Tipicidade',
      conteudo: 'A tipicidade formal é a adequação ao tipo penal.',
      disciplinaId: penal.id,
    });

    const criarUrl = vi.fn().mockReturnValue('blob:http://localhost/teste');
    const revogarUrl = vi.fn();
    Object.assign(URL, { createObjectURL: criarUrl, revokeObjectURL: revogarUrl });
    const clicar = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const usuario = userEvent.setup();
    render(
      <ContextoRepositorio.Provider value={repo}>
        <ExportarTexto />
      </ContextoRepositorio.Provider>,
    );

    const botaoFrases = await screen.findByRole('button', { name: 'Frases corretas (.txt)' });
    const botaoResumos = await screen.findByRole('button', { name: 'Resumos (.txt)' });

    expect(botaoFrases).toBeEnabled();
    expect(botaoResumos).toBeEnabled();

    await usuario.click(botaoFrases);
    expect(criarUrl).toHaveBeenCalledTimes(1);
    expect(clicar).toHaveBeenCalledTimes(1);

    await usuario.click(botaoResumos);
    expect(criarUrl).toHaveBeenCalledTimes(2);
    expect(clicar).toHaveBeenCalledTimes(2);
  });
});
