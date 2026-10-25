import { act, renderHook } from '@testing-library/react';
import {
  _ligarParaTestes,
  _reiniciarParaTestes,
  aplicarAtualizacao,
  useAtualizacaoPronta,
} from './registro';

class Alvo extends EventTarget {}

/** Um `ServiceWorkerRegistration` de mentira: só o que o registro usa. */
function registroFalso(opcoes: { waiting?: boolean; controlado: boolean }) {
  const container = new Alvo() as EventTarget & { controller: unknown };
  container.controller = opcoes.controlado ? {} : null;
  Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
  const esperando = { postMessage: vi.fn() };
  const reg = new Alvo() as EventTarget & {
    waiting: unknown;
    installing: unknown;
    update: () => Promise<void>;
  };
  reg.waiting = opcoes.waiting ? esperando : null;
  reg.installing = null;
  reg.update = () => Promise.resolve();
  return { reg: reg as unknown as ServiceWorkerRegistration, container, esperando, bruto: reg };
}

describe('registro do service worker', () => {
  beforeEach(() => {
    _reiniciarParaTestes();
  });

  it('não avisa nada enquanto não há versão nova', () => {
    const { reg } = registroFalso({ controlado: true });
    _ligarParaTestes(reg);
    const { result } = renderHook(() => useAtualizacaoPronta());
    expect(result.current).toBe(false);
  });

  it('avisa quando já havia uma versão esperando ao abrir', () => {
    const { reg } = registroFalso({ waiting: true, controlado: true });
    _ligarParaTestes(reg);
    const { result } = renderHook(() => useAtualizacaoPronta());
    expect(result.current).toBe(true);
  });

  it('avisa quando uma versão nova termina de instalar numa aba já controlada', () => {
    const { reg, bruto } = registroFalso({ controlado: true });
    _ligarParaTestes(reg);
    const { result } = renderHook(() => useAtualizacaoPronta());
    const nova = new Alvo() as EventTarget & { state: string };
    nova.state = 'installing';
    bruto.installing = nova;
    act(() => {
      bruto.dispatchEvent(new Event('updatefound'));
      nova.state = 'installed';
      nova.dispatchEvent(new Event('statechange'));
    });
    expect(result.current).toBe(true);
  });

  it('a primeira instalação não é "versão nova"', () => {
    const { reg, bruto } = registroFalso({ controlado: false });
    _ligarParaTestes(reg);
    const { result } = renderHook(() => useAtualizacaoPronta());
    const nova = new Alvo() as EventTarget & { state: string };
    nova.state = 'installed';
    bruto.installing = nova;
    act(() => {
      bruto.dispatchEvent(new Event('updatefound'));
      nova.dispatchEvent(new Event('statechange'));
    });
    expect(result.current).toBe(false);
  });

  it('"Atualizar" manda a versão nova assumir e só então recarrega esta aba', () => {
    const { reg, container, esperando } = registroFalso({ waiting: true, controlado: true });
    _ligarParaTestes(reg);
    const recarregar = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { href: window.location.href, reload: recarregar },
      configurable: true,
    });
    // Uma troca de controlador que esta aba não pediu não recarrega nada (outra aba pode ter pedido).
    container.dispatchEvent(new Event('controllerchange'));
    expect(recarregar).not.toHaveBeenCalled();

    aplicarAtualizacao();
    expect(esperando.postMessage).toHaveBeenCalledWith({ tipo: 'ativar' });
    expect(recarregar).not.toHaveBeenCalled();
    container.dispatchEvent(new Event('controllerchange'));
    expect(recarregar).toHaveBeenCalledTimes(1);
  });
});
