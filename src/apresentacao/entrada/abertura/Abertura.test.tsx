import { act, fireEvent, render, screen } from '@testing-library/react';
import { LockupParado } from '../../componentes/LockupParado';
import { simularMovimento } from '../../../testes/movimento';
import { Abertura } from './Abertura';

beforeEach(() => {
  simularMovimento('normal');
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const caixa = (left: number, top: number, width: number, height: number) =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

/**
 * O jsdom não tem layout: aqui o disco atrás do ponto do nome está em (200, 400) e o nome mede 320 px
 * de largura; o lockup do cabeçalho mede 144 px e o ponto dele está em (60, 30).
 */
function simularOLayout() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.classList.contains('eb-disco')) return caixa(190, 390, 20, 20);
    if (this.matches('svg.eb')) return caixa(40, 380, 320, 50);
    if (this.classList.contains('lockup-ponto')) return caixa(58, 28, 4, 4);
    if (this.matches('.marca svg')) return caixa(16, 10, 144, 22);
    return caixa(0, 0, 0, 0);
  });
}

function montar(
  props: { escrita?: 'completa' | 'curta'; calmo?: boolean; cabecalho?: boolean } = {},
) {
  const aoSair = vi.fn();
  const { cabecalho = true } = props;
  const vista = render(
    <>
      {cabecalho && (
        <a className="marca" href="#/">
          <LockupParado />
        </a>
      )}
      <Abertura
        escrita={props.escrita ?? 'completa'}
        calmo={props.calmo ?? false}
        aoSair={aoSair}
      />
    </>,
  );
  const camada = () => vista.container.querySelector<HTMLElement>('.abertura');
  const luz = () => vista.container.querySelector<SVGGElement>('.abertura-luz g');
  return { ...vista, aoSair, camada, luz };
}

const passar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

// O jsdom esconde (`display: none`) todo popover que não abriu e não sabe abrir: nas consultas por
// papel, o botão "Pular" só aparece com `hidden: true`. Num navegador, o `showPopover()` o abre.

describe('Abertura: a camada de tela cheia (M2 do Zé)', () => {
  it('é um popover manual com o nome escrito, decorativo, sem pegar o foco', () => {
    const { camada, container } = montar();
    expect(camada()).toHaveAttribute('popover', 'manual');
    // O nome é o `EscritaDoNome` de sempre, inteiro, e o desenho e a luz são só para os olhos.
    const nome = container.querySelector('.abertura-nome svg.eb');
    expect(nome).not.toBeNull();
    expect(nome).not.toHaveClass('curta');
    expect(nome).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.abertura-palco')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.abertura-luz')).toHaveAttribute('aria-hidden', 'true');
    // Não rouba o foco de quem já o tem.
    expect(document.body).toHaveFocus();
  });

  it('a primeira vez leva "Pular" (a sequência dela passa de 5 s); a do Dia, não', () => {
    const primeira = montar({ escrita: 'completa' });
    expect(screen.getByRole('button', { name: 'Pular', hidden: true })).toBeInTheDocument();
    primeira.unmount();
    const doDia = montar({ escrita: 'curta' });
    expect(screen.queryByRole('button', { name: 'Pular', hidden: true })).toBeNull();
    expect(doDia.container.querySelector('svg.eb')).toHaveClass('curta');
  });

  it('perfil Calmo: o desenho só esmaece', () => {
    const { container } = montar({ calmo: true });
    expect(container.querySelector('svg.eb')).toHaveClass('calmo');
    expect(container.querySelector('.abertura')).toHaveAttribute('data-calmo');
  });

  it('primeira vez: 2,64 s de nome, 0,3 s de pausa, a luz voa 0,5 s até o cabeçalho e a camada sai', async () => {
    simularOLayout();
    const { camada, luz, aoSair } = montar();
    expect(camada()).toHaveAttribute('data-fase', 'escrevendo');
    expect(luz()).toHaveAttribute('visibility', 'hidden');

    await passar(2640 + 300 - 20);
    expect(camada()).toHaveAttribute('data-fase', 'escrevendo');
    expect(aoSair).not.toHaveBeenCalled();

    // A luz sai do disco do nome (200, 400), com o raio dele na largura de 320 px.
    await passar(20);
    expect(camada()).toHaveAttribute('data-fase', 'voando');
    expect(luz()).toHaveAttribute('visibility', 'visible');
    expect(luz()).toHaveAttribute('transform', 'translate(200.00 400.00)');
    const [halo, disco, ponto] = Array.from(luz()?.children ?? []);
    const raioDoNome = (11 * 320) / 1015;
    expect(Number(ponto?.getAttribute('r'))).toBeCloseTo(raioDoNome, 1);
    expect(Number(disco?.getAttribute('r'))).toBeCloseTo((raioDoNome * 20) / 11, 1);
    expect(Number(halo?.getAttribute('r'))).toBeCloseTo(raioDoNome * 1.35, 1);

    // No meio do voo está entre os dois pontos, fora da reta (o arco).
    await passar(250);
    const meio = /translate\(([\d.]+) ([\d.]+)\)/.exec(luz()?.getAttribute('transform') ?? '');
    expect(Number(meio?.[2])).toBeLessThan(400);
    expect(Number(meio?.[2])).toBeGreaterThan(30);
    expect(aoSair).not.toHaveBeenCalled();

    // Pousa no ponto do cabeçalho (60, 30), do tamanho dele (largura de 144 px), e a camada sai.
    await passar(300);
    expect(luz()).toHaveAttribute('visibility', 'hidden');
    expect(luz()).toHaveAttribute('transform', 'translate(60.00 30.00)');
    expect(Number(ponto?.getAttribute('r'))).toBeCloseTo((11 * 144) / 1015, 1);
    expect(aoSair).toHaveBeenCalledTimes(1);
  });

  it('primeira abertura do Dia: o nome curto (1,2 s), a pausa de 0,15 s e a luz voa 0,45 s', async () => {
    simularOLayout();
    const { camada, aoSair } = montar({ escrita: 'curta' });
    await passar(1200 + 150 - 10);
    expect(camada()).toHaveAttribute('data-fase', 'escrevendo');
    await passar(10);
    expect(camada()).toHaveAttribute('data-fase', 'voando');
    await passar(400);
    expect(aoSair).not.toHaveBeenCalled();
    // A conta dos quadros começa no primeiro quadro: um respiro a mais depois dos 0,45 s.
    await passar(100);
    expect(aoSair).toHaveBeenCalledTimes(1);
  });

  it('Calmo: sem voo; o nome fica à vista e a camada esmaece', async () => {
    simularOLayout();
    const { camada, luz, aoSair } = montar({ escrita: 'curta', calmo: true });
    await passar(240 + 700 - 10);
    expect(camada()).toHaveAttribute('data-fase', 'escrevendo');
    await passar(10);
    expect(camada()).toHaveAttribute('data-fase', 'saindo');
    expect(luz()).toHaveAttribute('visibility', 'hidden');
    await passar(360);
    expect(aoSair).toHaveBeenCalledTimes(1);
  });

  it('sem cabeçalho à vista (a Sessão o esconde) não há voo: o nome só esmaece', async () => {
    simularOLayout();
    const { camada, luz, aoSair } = montar({ cabecalho: false });
    await passar(2640 + 300);
    expect(camada()).toHaveAttribute('data-fase', 'saindo');
    expect(luz()).toHaveAttribute('visibility', 'hidden');
    await passar(360);
    expect(aoSair).toHaveBeenCalledTimes(1);
  });

  it('um toque pula: a camada sai, e o toque é só isso (não chega ao que está embaixo)', () => {
    const { aoSair } = montar();
    const embaixo = vi.fn();
    document.body.addEventListener('pointerdown', embaixo);
    const aoClicar = vi.fn();
    document.body.addEventListener('click', aoClicar);
    const toque = new Event('pointerdown', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(toque);
    expect(aoSair).toHaveBeenCalledTimes(1);
    expect(toque.defaultPrevented).toBe(true);
    expect(embaixo).not.toHaveBeenCalled();
    // O clique que o mesmo toque gera é engolido; o seguinte, já não.
    fireEvent.click(document.body);
    expect(aoClicar).not.toHaveBeenCalled();
    fireEvent.click(document.body);
    expect(aoClicar).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('pointerdown', embaixo);
    document.body.removeEventListener('click', aoClicar);
  });

  it('o clique do toque que pulou só é engolido logo depois dele', async () => {
    montar();
    const aoClicar = vi.fn();
    document.body.addEventListener('click', aoClicar);
    fireEvent.pointerDown(document.body);
    await passar(800);
    fireEvent.click(document.body);
    expect(aoClicar).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('click', aoClicar);
  });

  it('a primeira tecla também pula, e é só isso: nem a tecla nem o soltar dela chegam embaixo', () => {
    const { aoSair } = montar();
    const aoTeclar = vi.fn();
    const aoSoltar = vi.fn();
    document.body.addEventListener('keydown', aoTeclar);
    document.body.addEventListener('keyup', aoSoltar);
    const tecla = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    document.body.dispatchEvent(tecla);
    expect(aoSair).toHaveBeenCalledTimes(1);
    expect(tecla.defaultPrevented).toBe(true);
    expect(aoTeclar).not.toHaveBeenCalled();
    // Outra tecla solta passa; o soltar da que pulou é engolido.
    fireEvent.keyUp(document.body, { key: 'a' });
    expect(aoSoltar).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(document.body, { key: 'Enter' });
    expect(aoSoltar).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('keydown', aoTeclar);
    document.body.removeEventListener('keyup', aoSoltar);
  });

  it('"Pular" sai na hora (também para quem o aciona sem tecla nem toque, como um leitor de tela)', () => {
    const { aoSair } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Pular', hidden: true }));
    expect(aoSair).toHaveBeenCalled();
  });

  it('desmontada no meio, não chama ninguém depois e solta os ouvintes de toque e tecla', async () => {
    simularOLayout();
    const { aoSair, unmount } = montar();
    await passar(1000);
    unmount();
    await passar(5000);
    expect(aoSair).not.toHaveBeenCalled();
    const toque = new Event('pointerdown', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(toque);
    expect(toque.defaultPrevented).toBe(false);
  });
});
