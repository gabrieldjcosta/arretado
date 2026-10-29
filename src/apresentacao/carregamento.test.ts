import { simularMovimento } from '../testes/movimento';
import { esconderCarregamento } from './carregamento';

function montarTela(): HTMLElement {
  document.body.innerHTML = '<div id="carregamento" role="status"></div>';
  const tela = document.getElementById('carregamento');
  if (!tela) throw new Error('a tela de teste não foi montada');
  return tela;
}

describe('esconderCarregamento (a tela do Zé no index.html)', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('sem a tela resolve na hora, sem erro', async () => {
    await expect(esconderCarregamento()).resolves.toBeUndefined();
  });

  it('com movimento reduzido sai da árvore na hora', async () => {
    const tela = montarTela();
    const saida = esconderCarregamento();
    expect(tela.isConnected).toBe(false);
    await expect(saida).resolves.toBeUndefined();
  });

  it('com movimento normal esmaece (data-saindo) e sai da árvore em 200 ms', async () => {
    simularMovimento('normal');
    vi.useFakeTimers();
    const tela = montarTela();
    const saida = esconderCarregamento();
    expect(tela).toHaveAttribute('data-saindo');
    vi.advanceTimersByTime(199);
    expect(tela.isConnected).toBe(true);
    vi.advanceTimersByTime(1);
    expect(tela.isConnected).toBe(false);
    await expect(saida).resolves.toBeUndefined();
  });

  it('é idempotente: chamar de novo devolve a mesma promessa e não reinicia a saída', () => {
    simularMovimento('normal');
    vi.useFakeTimers();
    montarTela();
    const primeira = esconderCarregamento();
    vi.advanceTimersByTime(100);
    expect(esconderCarregamento()).toBe(primeira);
    vi.advanceTimersByTime(100);
    expect(document.getElementById('carregamento')).toBeNull();
  });
});
