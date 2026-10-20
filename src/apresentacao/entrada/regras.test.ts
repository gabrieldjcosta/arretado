import { fecharDia } from '../../dominios/dia/fechar';
import { alterarPreferencias } from '../../core/preferencias';
import { encerrarSessao, iniciarSessao } from '../../dominios/sessao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { conteudoDoDia } from './conteudo';
import {
  CHAVE_CHEGADA,
  CHAVE_ENTRADA,
  chegadaJaVista,
  decidir,
  decidirNaAberturaAFrio,
  entradaJaAbriu,
  lembrarDaChegada,
  lembrarDaEntrada,
  saudacaoDaHora,
} from './regras';

const DIA = 24 * 60 * 60_000;
// O relógio padrão de `repositorioDeTeste` é 2026-09-23T12:00Z, ou seja, 09h00 em Brasília.
const HOJE = '2026-09-23';

/** Um aparelho que nunca viu nenhuma das duas folhas (o `setup.ts` semeia as duas como vistas). */
function aparelhoNovo() {
  localStorage.removeItem(CHAVE_CHEGADA);
  localStorage.removeItem(CHAVE_ENTRADA);
}

describe('Entrada do Dia › o que o aparelho lembra', () => {
  it('o setup dos testes semeia as duas chaves, as mesmas das regras', () => {
    expect(chegadaJaVista()).toBe(true);
    expect(entradaJaAbriu('2026-12-31')).toBe(true);
  });

  it('a Entrada abriu neste Dia ou num posterior; num anterior, não', () => {
    aparelhoNovo();
    expect(entradaJaAbriu(HOJE)).toBe(false);
    lembrarDaEntrada(HOJE);
    expect(entradaJaAbriu(HOJE)).toBe(true);
    expect(entradaJaAbriu('2026-09-22')).toBe(true);
    expect(entradaJaAbriu('2026-09-24')).toBe(false);
  });

  it('um valor estragado conta como "nunca abriu"', () => {
    localStorage.setItem(CHAVE_ENTRADA, 'isto não é JSON');
    expect(entradaJaAbriu(HOJE)).toBe(false);
    localStorage.setItem(CHAVE_ENTRADA, JSON.stringify({ dia: 5 }));
    expect(entradaJaAbriu(HOJE)).toBe(false);
  });

  it('a Chegada, ao ser vista, fecha também a Entrada do mesmo Dia', () => {
    aparelhoNovo();
    expect(chegadaJaVista()).toBe(false);
    lembrarDaChegada(HOJE);
    expect(chegadaJaVista()).toBe(true);
    expect(entradaJaAbriu(HOJE)).toBe(true);
    expect(entradaJaAbriu('2026-09-24')).toBe(false);
  });
});

describe('Entrada do Dia › a saudação', () => {
  it('muda às 5 h, ao meio-dia e às 18 h', () => {
    const casos: [string, string][] = [
      ['00:30', 'Boa noite'],
      ['04:59', 'Boa noite'],
      ['05:00', 'Bom dia'],
      ['11:59', 'Bom dia'],
      ['12:00', 'Boa tarde'],
      ['17:59', 'Boa tarde'],
      ['18:00', 'Boa noite'],
      ['23:59', 'Boa noite'],
    ];
    for (const [hora, saudacao] of casos) expect(saudacaoDaHora(hora), hora).toBe(saudacao);
  });
});

describe('Entrada do Dia › quando abre', () => {
  it('num aparelho que nasceu hoje e não viu a Chegada, abre a Chegada', async () => {
    aparelhoNovo();
    const { repo } = await repositorioDeTeste();
    expect(await decidir(repo)).toEqual({ tipo: 'chegada', dia: HOJE });
  });

  it('num aparelho de outro Dia, nunca abre a Chegada: abre a Entrada, com o par do Dia', async () => {
    aparelhoNovo();
    const { repo, relogio } = await repositorioDeTeste();
    relogio.avancar(DIA);
    const aberta = await decidir(repo);
    expect(aberta?.tipo).toBe('entrada');
    if (aberta?.tipo !== 'entrada') return;
    expect(aberta.dia).toBe('2026-09-24');
    expect(aberta.saudacao).toBe('Bom dia');
    expect(aberta.conteudo).toEqual(await conteudoDoDia('2026-09-24'));
  });

  it('com a Chegada já vista, o aparelho de hoje abre a Entrada', async () => {
    localStorage.removeItem(CHAVE_ENTRADA);
    const { repo } = await repositorioDeTeste();
    expect((await decidir(repo))?.tipo).toBe('entrada');
  });

  it('a saudação segue a hora de Brasília', async () => {
    localStorage.removeItem(CHAVE_ENTRADA);
    const { repo, relogio } = await repositorioDeTeste();
    relogio.avancar(5 * 60 * 60_000);
    const tarde = await decidir(repo);
    expect(tarde?.tipo === 'entrada' && tarde.saudacao).toBe('Boa tarde');
  });

  it('nunca duas vezes no mesmo Dia', async () => {
    localStorage.removeItem(CHAVE_ENTRADA);
    const { repo } = await repositorioDeTeste();
    expect((await decidir(repo))?.tipo).toBe('entrada');
    lembrarDaEntrada(HOJE);
    expect(await decidir(repo)).toBeUndefined();
  });

  it('nunca com o Dia fechado', async () => {
    localStorage.removeItem(CHAVE_ENTRADA);
    const { repo } = await repositorioDeTeste();
    await fecharDia(repo);
    expect(await decidir(repo)).toBeUndefined();
  });

  it('nunca com uma Sessão aberta', async () => {
    localStorage.removeItem(CHAVE_ENTRADA);
    const { repo } = await repositorioDeTeste();
    const sessao = await iniciarSessao(repo, {});
    expect(await decidir(repo)).toBeUndefined();
    await encerrarSessao(repo, sessao.id);
    expect((await decidir(repo))?.tipo).toBe('entrada');
  });

  it('nunca com o Retorno à vista (dias fora)', async () => {
    localStorage.removeItem(CHAVE_ENTRADA);
    const { repo, relogio } = await repositorioDeTeste();
    const sessao = await iniciarSessao(repo, {});
    await encerrarSessao(repo, sessao.id);
    relogio.avancar(3 * DIA);
    expect(await decidir(repo)).toBeUndefined();
  });

  it('nunca com o "só estudo" ligado', async () => {
    localStorage.removeItem(CHAVE_ENTRADA);
    const { repo } = await repositorioDeTeste();
    await alterarPreferencias(repo, { modoSoEstudo: true });
    expect(await decidir(repo)).toBeUndefined();
    await alterarPreferencias(repo, { modoSoEstudo: false });
    expect((await decidir(repo))?.tipo).toBe('entrada');
  });

  it('se o conteúdo não carregar, não abre (e nada falha)', async () => {
    localStorage.removeItem(CHAVE_ENTRADA);
    const { repo } = await repositorioDeTeste();
    vi.resetModules();
    vi.doMock('./conteudo-de-partida', () => {
      throw new Error('sem rede');
    });
    try {
      const outras = await import('./regras');
      expect(await outras.decidir(repo)).toBeUndefined();
    } finally {
      vi.doUnmock('./conteudo-de-partida');
      vi.resetModules();
    }
  });

  it('a abertura a frio decide uma vez por repositório: voltar ao Hoje não decide de novo', async () => {
    localStorage.removeItem(CHAVE_ENTRADA);
    const { repo } = await repositorioDeTeste();
    expect((await decidirNaAberturaAFrio(repo))?.tipo).toBe('entrada');
    expect(await decidirNaAberturaAFrio(repo)).toBeUndefined();
    // Outra carga da página (outro repositório) é outra abertura a frio.
    const { repo: outro } = await repositorioDeTeste();
    expect((await decidirNaAberturaAFrio(outro))?.tipo).toBe('entrada');
  });
});
