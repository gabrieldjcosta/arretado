import { conteudoDoDia, posicaoDoDia } from './conteudo';
import { CITACOES, DICAS } from './conteudo-de-partida';

// Quem morreu até 1954 está em domínio público no Brasil (70 anos, Lei 9.610, art. 41). Autor novo na
// lista de Citações pede o ano da morte aqui, conferido em duas fontes: sem ele, este teste falha.
const MORTE: Record<string, number> = {
  Horácio: -8,
  'Fernando Pessoa': 1935,
  Aristóteles: -322,
  'Rainer Maria Rilke': 1926,
  'Castro Alves': 1871,
  Epicteto: 135,
  'José de Alencar': 1877,
  'Johann Wolfgang von Goethe': 1832,
  Ulpiano: 223,
};
const TRADUZIDOS = [
  'Horácio',
  'Aristóteles',
  'Rainer Maria Rilke',
  'Epicteto',
  'Johann Wolfgang von Goethe',
  'Ulpiano',
];

const MARCACAO = /[<>&]/;
// A fala do Arretado: sem rótulo clínico, sem dívida e sem promessa (CLAUDE.md).
const CLINICA =
  /diagn[óo]stic|transtorno|tratamento|tdah|d[ée]ficit|autis|terapi|medica[çc]|ansiedad|depress/i;
const COBRANCA = /parou|atrasad|pendente|d[ií]vida|culpa|fracass|falhou|perdeu/i;
const PROMESSA = /%|garant|aprova[çc]|certeza|comprovad|milagre|segredo/i;

describe('Entrada do Dia › conteúdo de partida', () => {
  it('são 12 Citações e 12 dicas', () => {
    expect(CITACOES).toHaveLength(12);
    expect(DICAS).toHaveLength(12);
  });

  it('cada Citação tem texto, autor e obra, em texto puro e curto', () => {
    for (const c of CITACOES) {
      for (const campo of [c.texto, c.autor, c.obra]) {
        expect(campo.trim()).toBe(campo);
        expect(campo).not.toBe('');
        expect(campo).not.toMatch(MARCACAO);
      }
      expect(c.texto.length).toBeLessThanOrEqual(130);
    }
  });

  it('só há autor morto até 1954, e cada um tem o ano registrado', () => {
    for (const c of CITACOES) {
      const autor = c.autor.replace(/ \(.*\)$/, '');
      expect(MORTE[autor], `${autor}: sem ano da morte registrado`).toBeDefined();
      expect(MORTE[autor]).toBeLessThanOrEqual(1954);
    }
  });

  it('a Citação traduzida leva o crédito "tradução do Arretado"', () => {
    for (const c of CITACOES.filter((x) => TRADUZIDOS.includes(x.autor))) {
      expect(c.obra, c.autor).toContain('(tradução do Arretado)');
    }
    expect(CITACOES.filter((c) => c.autor.includes('Rilke')).length).toBeGreaterThan(0);
  });

  it('nenhuma Citação nem dica se repete', () => {
    expect(new Set(CITACOES.map((c) => c.texto)).size).toBe(CITACOES.length);
    expect(new Set(DICAS.map((d) => d.destaque)).size).toBe(DICAS.length);
    expect(new Set(DICAS.map((d) => d.texto)).size).toBe(DICAS.length);
  });

  it('cada dica é um gesto curto e um porquê, em texto puro, em até 160 caracteres', () => {
    for (const d of DICAS) {
      expect(d.destaque.trim()).toBe(d.destaque);
      expect(d.texto.trim()).toBe(d.texto);
      expect(d.destaque.length).toBeGreaterThan(0);
      expect(d.texto.length).toBeGreaterThan(0);
      expect(d.destaque.length, d.destaque).toBeLessThanOrEqual(70);
      expect(`${d.destaque} ${d.texto}`.length, d.destaque).toBeLessThanOrEqual(160);
      expect(`${d.destaque} ${d.texto}`).not.toMatch(MARCACAO);
    }
  });

  it('nenhuma dica fala como clínica, como cobrança ou como promessa', () => {
    for (const d of DICAS) {
      const inteira = `${d.destaque} ${d.texto}`;
      expect(inteira, d.destaque).not.toMatch(CLINICA);
      expect(inteira, d.destaque).not.toMatch(COBRANCA);
      expect(inteira, d.destaque).not.toMatch(PROMESSA);
    }
  });
});

describe('Entrada do Dia › o Dia escolhe o par', () => {
  it('o mesmo Dia dá sempre a mesma posição, e Dias seguidos andam uma', () => {
    expect(posicaoDoDia('2026-01-01', 12)).toBe(0);
    expect(posicaoDoDia('2026-01-02', 12)).toBe(1);
    expect(posicaoDoDia('2026-01-13', 12)).toBe(0);
    expect(posicaoDoDia('2026-10-21', 12)).toBe(posicaoDoDia('2026-10-21', 12));
    // Antes do ponto de partida o ciclo continua para trás, sem posição negativa.
    expect(posicaoDoDia('2025-12-31', 12)).toBe(11);
  });

  it('12 Dias seguidos passam por todas as Citações e por todas as dicas, cada uma uma vez', async () => {
    const dias = Array.from({ length: 12 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
    const pares = await Promise.all(dias.map((d) => conteudoDoDia(d)));
    expect(new Set(pares.map((p) => p?.citacao.texto)).size).toBe(12);
    expect(new Set(pares.map((p) => p?.dica.destaque)).size).toBe(12);
  });

  it('em 21/10/2026 o par é o da prancha: Ricardo Reis e "Tentar lembrar vale mais que reler"', async () => {
    const par = await conteudoDoDia('2026-10-21');
    expect(par?.citacao.texto).toContain('Sê todo em cada coisa');
    expect(par?.citacao.autor).toBe('Fernando Pessoa (Ricardo Reis)');
    expect(par?.dica.destaque).toBe('Tentar lembrar vale mais que reler.');
  });

  it('se o conteúdo não carregar, devolve nada em vez de falhar', async () => {
    vi.resetModules();
    vi.doMock('./conteudo-de-partida', () => {
      throw new Error('sem rede');
    });
    try {
      const { conteudoDoDia: semConteudo } = await import('./conteudo');
      expect(await semConteudo('2026-10-21')).toBeUndefined();
    } finally {
      vi.doUnmock('./conteudo-de-partida');
      vi.resetModules();
    }
  });
});
