import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { simularMovimento } from '../../../testes/movimento';
import type { EntradaDaJornada } from '../destino/jornada';
import { MapaM } from './MapaM';
import { ToastM } from './ToastM';
import { esconderAviso } from './toast';

afterEach(() => {
  cleanup();
  esconderAviso();
  vi.restoreAllMocks();
});

const entrada = (extra: Partial<EntradaDaJornada> = {}): EntradaDaJornada => ({
  materias: [
    { id: 'exec', nome: 'Execução Penal' },
    { id: 'penal', nome: 'Direito Penal' },
  ],
  atualId: 'exec',
  pousosPorMateria: { exec: 2 },
  portasAbertas: [],
  comMapa: true,
  artigos: [
    { normaId: 'lep', endereco: 'art-112', rotulo: 'LEP, Art. 112', lido: true },
    { normaId: 'lep', endereco: 'art-52', rotulo: 'LEP, Art. 52', lido: false },
  ],
  ...extra,
});

/** `null`: o app ainda não leu nada (a caixa só com o mar). */
function abrir(e: EntradaDaJornada | null = entrada()) {
  const usuario = userEvent.setup();
  const tela = render(
    <MemoryRouter>
      <MapaM entrada={e ?? undefined} intro={false} atraso={0} />
      <ToastM />
    </MemoryRouter>,
  );
  return { usuario, ...tela };
}

/** O aviso do quadro (`role="status"`): o texto chega quando o toque é tratado. */
const aviso = (texto: string | RegExp) =>
  waitFor(() => {
    expect(screen.getByRole('status')).toHaveTextContent(texto);
  });

/** O jsdom não tem layout: a caixa do mapa ganha um tamanho (o de um celular) para a câmera ter o que medir. */
function comCaixa(largura: number, altura: number) {
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(largura);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(altura);
}

const caixaDoMapa = (c: HTMLElement) => {
  const caixa = c.querySelector<HTMLElement>('#m-destino');
  if (!caixa) throw new Error('faltou a caixa do mapa');
  return caixa;
};

describe('o mapa do Destino no quadro do mockup', () => {
  it('é um grupo nomeado, com a dica de como passear', () => {
    abrir();
    const mapa = screen.getByRole('group', { name: 'Mapa do caminho pelo Nordeste' });
    expect(mapa).toHaveAttribute('tabindex', '0');
    expect(mapa).toHaveAccessibleDescription(/Arraste para passear/);
    expect(mapa).toHaveClass('m-destino', 'm-ne');
    expect(mapa).toHaveAttribute('aria-busy', 'false');
  });

  it('sem leitura dos dados a caixa fica só com o mar, ocupada, sem marca nenhuma', () => {
    const { container } = abrir(null);
    const mapa = screen.getByRole('group', { name: 'Mapa do caminho pelo Nordeste' });
    expect(mapa).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('desenha o Nordeste: um traço por estado do Ciclo, o caminho e o que a pessoa já andou', () => {
    const { container } = abrir();
    const caixa = caixaDoMapa(container);
    // Um estado para cada matéria do Ciclo e o resto do Nordeste (e do Brasil) embaçado por trás, na máscara do filtro.
    expect(caixa.querySelectorAll('.m-ne-estados .m-ne-uf').length).toBeGreaterThanOrEqual(2);
    expect(caixa.querySelector('.m-ne-resto')).toHaveAttribute('mask', 'url(#m-ne-longe)');
    expect(caixa.querySelector('.m-ne-uf.m-uf-agora')).not.toBeNull();
    expect(caixa.querySelector('.m-ne-uf.m-uf-seguinte')).not.toBeNull();
    expect(caixa.querySelectorAll('.m-tracejado')).toHaveLength(2);
    expect(caixa.querySelector('.m-tracejado.m-longe')).not.toBeNull();
    expect(caixa.querySelector('.m-trilha-halo')).not.toBeNull();
    // Dois pousos na matéria da vez já são caminho andado, com o brilho de baixo (desvio 20).
    expect(caixa.querySelector('.m-andado')).toHaveAttribute('pathLength', '1');
    expect(caixa.querySelector('.m-andado-b.m-brilho')).not.toBeNull();
    // O grão do papel vem do filtro do quadro, e o desenho não conta para o leitor de tela.
    expect(caixa.querySelector('.m-territorio-grao')).not.toBeNull();
    expect(caixa.querySelector('.m-ne-svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('sem pouso nenhum não há caminho andado para desenhar', () => {
    const { container } = abrir(entrada({ pousosPorMateria: {} }));
    expect(caixaDoMapa(container).querySelector('.m-andado')).toBeNull();
  });

  it('cada marca guarda o seu ponto no desenho, que o CSS põe na tela pela câmera (desvio 29)', () => {
    const { container } = abrir();
    const marcas = [...container.querySelectorAll<HTMLElement>('.m-ne-marcas > *')];
    expect(marcas.length).toBeGreaterThan(5);
    for (const m of marcas) {
      if (m.classList.contains('m-no-aqui') || m.classList.contains('m-ne-fim')) continue;
      expect(Number.isFinite(Number(m.style.getPropertyValue('--x')))).toBe(true);
      expect(Number.isFinite(Number(m.style.getPropertyValue('--y')))).toBe(true);
      // A posição em px quem escreve é o CSS: o React nunca põe `left` e `top` nas marcas.
      expect(m.style.left).toBe('');
      expect(m.style.top).toBe('');
    }
  });

  it('cada artigo que cai é um ponto que abre o Leitor no artigo, aceso quando já foi lido', () => {
    abrir();
    const lido = screen.getByRole('link', { name: 'LEP, Art. 112, já lido: abrir no Leitor' });
    expect(lido).toHaveAttribute('href', '/biblioteca/normas/lep?ir=art-112&foco=artigo&mapa=1');
    expect(lido).toHaveClass('m-estrela-art', 'm-lido');
    const pela = screen.getByRole('link', { name: 'LEP, Art. 52: abrir no Leitor' });
    expect(pela).toHaveClass('m-estrela-art');
    expect(pela).not.toHaveClass('m-lido');
  });

  it('o primeiro lugar abre com a matéria da vez; a ficha é rascunho e Escape devolve o foco', async () => {
    const { usuario } = abrir();
    const lugar = screen.getAllByRole('button', { name: /você está aqui: abrir a ficha/ })[0];
    if (!lugar) throw new Error('faltou o lugar onde a pessoa está');
    await usuario.click(lugar);

    const ficha = await screen.findByRole('region', { name: /^Ficha de / });
    expect(ficha).toHaveFocus();
    expect(within(ficha).getByText(/Rascunho da pesquisa/)).toBeInTheDocument();
    expect(within(ficha).getByRole('button', { name: 'Fechar a ficha' })).toBeInTheDocument();

    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: /^Ficha de / })).not.toBeInTheDocument();
    expect(lugar).toHaveFocus();
  });

  it('o "×" da ficha a fecha e devolve o foco ao lugar de onde ela veio', async () => {
    const { usuario } = abrir();
    const lugar = screen.getAllByRole('button', { name: /abrir a ficha/ })[0];
    if (!lugar) throw new Error('faltou um lugar aberto');
    await usuario.click(lugar);
    await usuario.click(await screen.findByRole('button', { name: 'Fechar a ficha' }));
    expect(screen.queryByRole('region', { name: /^Ficha de / })).not.toBeInTheDocument();
    expect(lugar).toHaveFocus();
  });

  it('um lugar que ainda não abriu diz que abre num pouso, sem cobrar nada', async () => {
    const { usuario } = abrir(entrada({ pousosPorMateria: {} }));
    const fechado = screen.getAllByRole('button', { name: /abre num pouso/ })[0];
    if (!fechado) throw new Error('faltou um lugar fechado');
    await usuario.click(fechado);
    await aviso(/se abre num pouso, quando o fio passar por lá\.$/);
  });

  it('a porteira fechada explica o que falta', async () => {
    const { usuario } = abrir();
    await usuario.click(screen.getByRole('button', { name: 'Porteira de Execução Penal' }));
    await aviso('Essa porteira fica pronta quando você ler o que mais cai em Execução Penal.');
  });

  it('a porteira da matéria que leu tudo está pronta', async () => {
    const lidos = entrada().artigos?.map((a) => ({ ...a, lido: true }));
    const { usuario } = abrir(entrada({ ...(lidos ? { artigos: lidos } : {}) }));
    await usuario.click(
      screen.getByRole('button', { name: 'Porteira de Execução Penal: pronta para você' }),
    );
    await aviso('Porteira pronta. Ela aparece num passo seu de Execução Penal.');
  });

  it('com a folha da porteira disponível, tocar na pronta a abre em vez de avisar', async () => {
    const lidos = entrada().artigos?.map((a) => ({ ...a, lido: true }));
    const aoAbrir = vi.fn();
    const usuario = userEvent.setup();
    render(
      <MemoryRouter>
        <MapaM
          entrada={entrada({ ...(lidos ? { artigos: lidos } : {}) })}
          intro={false}
          atraso={0}
          aoAbrirPorteira={aoAbrir}
        />
        <ToastM />
      </MemoryRouter>,
    );
    await usuario.click(
      screen.getByRole('button', { name: 'Porteira de Execução Penal: pronta para você' }),
    );
    expect(aoAbrir).toHaveBeenCalledWith({ id: 'exec', nome: 'Execução Penal' });
    expect(document.querySelector('.m-toast.m-on')).toBeNull();
  });

  it('a porteira aberta mostra o nome do estado para onde o caminho segue', async () => {
    const { usuario } = abrir(entrada({ portasAbertas: ['exec'] }));
    await usuario.click(screen.getByRole('button', { name: 'Porteira de Execução Penal: aberta' }));
    await aviso(/^Porteira aberta\. O caminho segue para Piauí\.$/);
  });

  it('cada porteira leva o nome dela ao lado, escrito como o mockup escreve ("porteira" e "porteira aberta")', () => {
    const { container } = abrir(entrada({ portasAbertas: ['exec'] }));
    const rotulos = [...container.querySelectorAll('.m-rotulo-porteira')].map((r) => r.textContent);
    expect(rotulos).toContain('porteira aberta');
    // O nome escrito é desenho; o leitor de tela lê o botão da porteira.
    for (const r of container.querySelectorAll('.m-rotulo-porteira')) {
      expect(r).toHaveAttribute('aria-hidden', 'true');
    }
    expect(container.querySelector('.m-porteira.m-aberta')).not.toBeNull();
  });

  it('o destino diz que é a chegada', async () => {
    const { usuario } = abrir();
    await usuario.click(screen.getByRole('button', { name: /Seu destino/ }));
    await aviso(/a chegada/);
  });

  it('"Ver o Nordeste" e "Voltar para você" alternam entre o Nordeste e a pessoa', async () => {
    const { usuario } = abrir();
    // Sem movimento (o jsdom não anima), a câmera já nasce em torno da pessoa.
    await usuario.click(screen.getByRole('button', { name: 'Ver o Nordeste' }));
    expect(await screen.findByRole('button', { name: 'Voltar para você' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Voltar para você' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ver o Nordeste' })).toBeInTheDocument();
    });
  });

  it('sem matéria nenhuma o mapa abre assim mesmo, com o destino e sem artigos', () => {
    abrir(entrada({ materias: [], pousosPorMateria: {} }));
    expect(screen.getByRole('button', { name: /Seu destino/ })).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});

describe('a câmera do mapa', () => {
  it('põe o desenho e as marcas na vista da pessoa: viewBox, canto e escala, sem o modo "longe"', () => {
    comCaixa(390, 520);
    const { container } = abrir();
    const caixa = caixaDoMapa(container);
    const caixaSvg = container.querySelector('.m-ne-svg');
    const [x, y, w, h] = (caixaSvg?.getAttribute('viewBox') ?? '').split(' ').map(Number);
    expect([x, y, w, h].every((n) => Number.isFinite(n))).toBe(true);
    expect(w).toBeGreaterThan(0);
    // O alto da vista é a largura vezes a proporção da caixa (390 por 520).
    expect(h).toBeCloseTo((w ?? 0) * (520 / 390), 1);
    expect(Number(caixa.style.getPropertyValue('--cam-x'))).toBeCloseTo(x ?? NaN, 1);
    expect(Number(caixa.style.getPropertyValue('--cam-y'))).toBeCloseTo(y ?? NaN, 1);
    expect(Number(caixa.style.getPropertyValue('--cam-k'))).toBeCloseTo(390 / (w ?? NaN), 3);
    // Em torno da pessoa a câmera é curta: os artigos aparecem e as matérias dos estados ficam de fora.
    expect(caixa).not.toHaveClass('m-alto');
  });

  it('no monitor (caixa com mais de 600 px) a câmera em torno da pessoa mostra mais chão', () => {
    comCaixa(390, 520);
    const celular = abrir();
    const larguraDoCelular = Number(
      celular.container.querySelector('.m-ne-svg')?.getAttribute('viewBox')?.split(' ')[2],
    );
    cleanup();

    comCaixa(1000, 700);
    const monitor = abrir();
    const larguraDoMonitor = Number(
      monitor.container.querySelector('.m-ne-svg')?.getAttribute('viewBox')?.split(' ')[2],
    );
    expect(larguraDoMonitor).toBeGreaterThan(larguraDoCelular);
  });

  it('"Ver o Nordeste" abre a vista de longe, com os nomes das matérias; "Voltar para você" a fecha', async () => {
    comCaixa(390, 520);
    const { container, usuario } = abrir();
    const caixa = caixaDoMapa(container);
    const antes = caixa.style.getPropertyValue('--cam-k');

    await usuario.click(screen.getByRole('button', { name: 'Ver o Nordeste' }));
    await waitFor(() => {
      expect(caixa).toHaveClass('m-alto');
    });
    expect(Number(caixa.style.getPropertyValue('--cam-k'))).toBeLessThan(Number(antes));

    await usuario.click(screen.getByRole('button', { name: 'Voltar para você' }));
    await waitFor(() => {
      expect(caixa).not.toHaveClass('m-alto');
    });
    expect(caixa.style.getPropertyValue('--cam-k')).toBe(antes);
  });

  it('as setas passeiam, "+" e "-" aproximam e afastam e "0" volta para a pessoa', async () => {
    comCaixa(390, 520);
    const { container, usuario } = abrir();
    const mapa = screen.getByRole('group', { name: 'Mapa do caminho pelo Nordeste' });
    const caixa = caixaDoMapa(container);
    const svg = container.querySelector('.m-ne-svg');
    const largura = () => Number(svg?.getAttribute('viewBox')?.split(' ')[2]);
    const inicio = largura();

    act(() => {
      mapa.focus();
    });
    await usuario.keyboard('{ArrowRight}');
    // Passeou: a câmera já não é a da pessoa, e o botão oferece o caminho de volta.
    expect(screen.getByRole('button', { name: 'Voltar para você' })).toBeInTheDocument();
    expect(largura()).toBeCloseTo(inicio, 1);

    await usuario.keyboard('+');
    expect(largura()).toBeLessThan(inicio);
    await usuario.keyboard('-');
    await usuario.keyboard('-');
    expect(largura()).toBeGreaterThan(inicio);
    expect(caixa.style.getPropertyValue('--cam-k')).not.toBe('');

    await usuario.keyboard('0');
    expect(screen.getByRole('button', { name: 'Ver o Nordeste' })).toBeInTheDocument();
    expect(largura()).toBeCloseTo(inicio, 1);
  });

  it('as teclas do mapa não valem para as marcas: nas marcas, as setas e o Enter são delas', async () => {
    comCaixa(390, 520);
    const { usuario } = abrir();
    const lugar = screen.getAllByRole('button', { name: /você está aqui: abrir a ficha/ })[0];
    if (!lugar) throw new Error('faltou o lugar onde a pessoa está');
    act(() => {
      lugar.focus();
    });
    await usuario.keyboard('{ArrowRight}');
    // Nenhuma tecla passeou o mapa: ele continua na vista da pessoa.
    expect(screen.getByRole('button', { name: 'Ver o Nordeste' })).toBeInTheDocument();
  });

  it('a roda do mouse aproxima em torno do cursor e solta a câmera da pessoa', () => {
    comCaixa(390, 520);
    const { container } = abrir();
    const mapa = screen.getByRole('group', { name: 'Mapa do caminho pelo Nordeste' });
    const svg = container.querySelector('.m-ne-svg');
    const largura = () => Number(svg?.getAttribute('viewBox')?.split(' ')[2]);
    const inicio = largura();

    // A roda é escutada direto na caixa, sem passar pelo React (o React a registra como passiva).
    const rolou = fireEvent.wheel(mapa, { deltaY: -240, clientX: 100, clientY: 100 });
    expect(rolou).toBe(false);
    expect(largura()).toBeLessThan(inicio);
    expect(screen.getByRole('button', { name: 'Voltar para você' })).toBeInTheDocument();
  });

  it('arrastar passeia só depois de 6 px, e a caixa avisa que está arrastando até soltar', () => {
    comCaixa(390, 520);
    const { container } = abrir();
    const mapa = screen.getByRole('group', { name: 'Mapa do caminho pelo Nordeste' });
    const caixa = caixaDoMapa(container);
    const svg = container.querySelector('.m-ne-svg');
    const canto = () => svg?.getAttribute('viewBox');
    const inicio = canto();
    const ponteiro = (tipo: string, x: number, y: number) => {
      fireEvent(mapa, new MouseEvent(tipo, { clientX: x, clientY: y, bubbles: true }));
    };

    ponteiro('pointerdown', 200, 200);
    ponteiro('pointermove', 203, 202);
    // Um toque que tremeu um pouco ainda é um toque.
    expect(canto()).toBe(inicio);
    expect(caixa).not.toHaveClass('m-arrastando');

    ponteiro('pointermove', 150, 260);
    expect(caixa).toHaveClass('m-arrastando');
    expect(canto()).not.toBe(inicio);
    expect(screen.getByRole('button', { name: 'Voltar para você' })).toBeInTheDocument();

    ponteiro('pointerup', 150, 260);
    expect(caixa).not.toHaveClass('m-arrastando');
  });

  it('o foco por teclado numa marca fora da caixa leva a câmera até ela', () => {
    comCaixa(390, 520);
    const { container } = abrir();
    const destino = container.querySelector<HTMLElement>('.m-ne-fim');
    if (!destino) throw new Error('faltou o destino');
    const svg = container.querySelector('.m-ne-svg');
    const inicio = svg?.getAttribute('viewBox');
    expect(screen.getByRole('button', { name: 'Ver o Nordeste' })).toBeInTheDocument();

    act(() => {
      destino.focus();
    });
    // O destino fica no fim do caminho, bem longe da pessoa: a câmera vai até lá e fica solta.
    expect(svg?.getAttribute('viewBox')).not.toBe(inicio);
    expect(screen.getByRole('button', { name: 'Voltar para você' })).toBeInTheDocument();
  });

  it('a pessoa andou (um pouso novo): a câmera em torno dela acompanha, sem o React reescrever as marcas', async () => {
    comCaixa(390, 520);
    const { container, rerender } = abrir();
    const antes = container.querySelector('.m-ne-svg')?.getAttribute('viewBox');
    const maisUm = entrada({ pousosPorMateria: { exec: 2, penal: 1 }, atualId: 'penal' });
    rerender(
      <MemoryRouter>
        <MapaM entrada={maisUm} intro={false} atraso={0} />
        <ToastM />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('.m-ne-svg')?.getAttribute('viewBox')).not.toBe(antes);
    });
  });
});

describe('a entrada do mapa (o que o mockup move, com os tempos dele)', () => {
  type ComAnimate = { animate?: unknown };
  type Chamada = [Keyframe[], KeyframeAnimationOptions];

  afterEach(() => {
    delete (Element.prototype as ComAnimate).animate;
  });

  /** Com `animate` e o sistema sem pedir menos movimento, o modo é o normal, como num navegador. */
  function comMovimento() {
    const animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: () => undefined }));
    (Element.prototype as ComAnimate).animate = animate;
    simularMovimento('normal');
    return animate;
  }

  const chamadasDe = (animate: ReturnType<typeof vi.fn>, classe: string) =>
    animate.mock.calls
      .map((c, i) => ({
        chamada: c as unknown as Chamada,
        alvo: animate.mock.contexts[i] as Element,
      }))
      .filter(({ alvo }) => alvo.classList.contains(classe))
      .map(({ chamada }) => chamada);

  function abrirComEntrada(atraso: number, intro: boolean) {
    return render(
      <MemoryRouter>
        <MapaM entrada={entrada()} intro={intro} atraso={atraso} />
      </MemoryRouter>,
    );
  }

  it('o "você está aqui" pula 0,4 s depois da entrada, na mola, e o caminho já andado se desenha 1,5 s depois', () => {
    const animate = comMovimento();
    abrirComEntrada(2350, true);

    const [pula] = chamadasDe(animate, 'm-no-aqui');
    expect(pula?.[1]).toMatchObject({ duration: 600, delay: 400 + 2350 });
    expect(pula?.[1].easing).toBe('cubic-bezier(.34,1.56,.64,1)');

    const andado = chamadasDe(animate, 'm-andado');
    expect(andado).toHaveLength(1);
    expect(andado[0]?.[1]).toMatchObject({ duration: 900, delay: 1500 + 2350 });
    expect(andado[0]?.[0]).toEqual([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }]);
    // O traço de baixo (o brilho) se desenha junto, e os dois usam o tamanho normalizado do caminho (`pathLength`).
    expect(chamadasDe(animate, 'm-andado-b')).toHaveLength(1);
    expect(document.querySelector('.m-andado')).toHaveStyle({ strokeDasharray: '1 1' });
  });

  it('na primeira visita a caixa se revela de cima em 2,6 s, depois do tempo da entrada', () => {
    const animate = comMovimento();
    abrirComEntrada(2350, true);
    const [revela] = chamadasDe(animate, 'm-destino');
    expect(revela?.[1]).toMatchObject({ duration: 2600, delay: 2350 });
    expect(revela?.[0].map((q) => q.clipPath)).toEqual([
      'inset(0 0 100% 0)',
      'inset(0 0 72% 0)',
      'inset(0 0 0% 0)',
    ]);
  });

  it('depois da primeira visita não há revelação, e o "você está aqui" pula sem esperar a entrada', () => {
    const animate = comMovimento();
    abrirComEntrada(0, false);
    expect(chamadasDe(animate, 'm-destino')).toHaveLength(0);
    const [pula] = chamadasDe(animate, 'm-no-aqui');
    expect(pula?.[1]).toMatchObject({ duration: 600, delay: 400 });
  });

  it('com a câmera longe, ela só se aproxima da pessoa depois da entrada (0,9 s depois dela), em 1,8 s', () => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'performance',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });
    try {
      comMovimento();
      comCaixa(390, 520);
      const { container } = abrirComEntrada(2350, true);
      const svg = container.querySelector('.m-ne-svg');
      const largura = () => Number(svg?.getAttribute('viewBox')?.split(' ')[2]);
      // Abre no Nordeste todo (mais de 1.300 unidades de largura).
      const todo = largura();
      expect(todo).toBeGreaterThan(1300);
      act(() => {
        vi.advanceTimersByTime(2350 + 900 - 50);
      });
      expect(largura()).toBe(todo);
      act(() => {
        vi.advanceTimersByTime(100);
      });
      act(() => {
        vi.advanceTimersByTime(900);
      });
      // No meio do voo a câmera já se aproximou, mas ainda não chegou.
      expect(largura()).toBeLessThan(todo);
      expect(largura()).toBeGreaterThan(400);
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      expect(largura()).toBeLessThanOrEqual(400);
    } finally {
      vi.useRealTimers();
    }
  });
});
