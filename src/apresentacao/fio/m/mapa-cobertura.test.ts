import { esconderOQueSeCobre } from './mapa-cobertura';

afterEach(() => {
  document.body.replaceChildren();
});

/** Um retângulo na tela: o jsdom não tem layout, então cada texto diz onde ficaria. */
const retangulo = (left: number, top: number, width: number, height: number) =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  }) as DOMRect;

function marca(
  camada: HTMLElement,
  classe: string,
  rect: DOMRect,
  tag: 'span' | 'button' | 'div' = 'span',
) {
  const el = document.createElement(tag);
  el.className = classe;
  el.getBoundingClientRect = () => rect;
  camada.appendChild(el);
  return el;
}

/** Um lugar com o nome dentro, como o mapa os faz (`button.m-ne-lugar > span`). */
function lugar(camada: HTMLElement, classe: string, rect: DOMRect) {
  const botao = document.createElement('button');
  botao.className = `m-ne-lugar ${classe}`;
  const nome = document.createElement('span');
  nome.getBoundingClientRect = () => rect;
  botao.appendChild(nome);
  camada.appendChild(botao);
  return nome;
}

function camada() {
  const el = document.createElement('div');
  el.className = 'm-ne-marcas';
  document.body.appendChild(el);
  return el;
}

describe('quem se cobre no mapa (o `pos()` do mockup)', () => {
  it('de dois textos que se cobrem, fica o de maior prioridade: o nome de onde a pessoa está vence a porteira', () => {
    const c = camada();
    const porteira = marca(c, 'm-rotulo-porteira', retangulo(100, 100, 80, 14));
    const aqui = lugar(c, 'm-aberto m-com-voce', retangulo(110, 104, 60, 14));
    esconderOQueSeCobre(c, false);
    expect(aqui.style.visibility).toBe('');
    expect(porteira.style.visibility).toBe('hidden');
  });

  it('o destino e os lugares abertos vêm antes das porteiras e dos lugares fechados', () => {
    const c = camada();
    const fechado = lugar(c, 'm-fechado', retangulo(200, 200, 70, 14));
    const aberto = lugar(c, 'm-aberto', retangulo(205, 202, 70, 14));
    const fim = marca(c, 'm-ne-fim', retangulo(400, 300, 90, 30), 'button');
    const porteira = marca(c, 'm-rotulo-porteira', retangulo(410, 310, 80, 14));
    esconderOQueSeCobre(c, false);
    expect(aberto.style.visibility).toBe('');
    expect(fechado.style.visibility).toBe('hidden');
    expect(fim.style.visibility).toBe('');
    expect(porteira.style.visibility).toBe('hidden');
  });

  it('o que não se toca fica à vista, e a folga é de 3 px ao lado e de 1 px em cima e embaixo', () => {
    const c = camada();
    const a = lugar(c, 'm-aberto m-com-voce', retangulo(100, 100, 50, 14));
    const aoLado = marca(c, 'm-rotulo-porteira', retangulo(152, 100, 50, 14));
    const encosta = lugar(c, 'm-fechado', retangulo(153, 100, 50, 14));
    esconderOQueSeCobre(c, false);
    expect(a.style.visibility).toBe('');
    // A 2 px do vizinho, dentro dos 3 px de folga: some.
    expect(aoLado.style.visibility).toBe('hidden');
    // Acima de 3 px de distância do que já foi posto (a porteira escondida não conta), fica.
    expect(encosta.style.visibility).toBe('');
  });

  it('um texto sem largura (escondido pelo CSS) não ocupa lugar e volta a aparecer quando sobra', () => {
    const c = camada();
    const sem = lugar(c, 'm-aberto m-com-voce', retangulo(100, 100, 0, 0));
    sem.style.visibility = 'hidden';
    const vizinho = marca(c, 'm-rotulo-porteira', retangulo(100, 100, 80, 14));
    esconderOQueSeCobre(c, false);
    expect(sem.style.visibility).toBe('');
    expect(vizinho.style.visibility).toBe('');
  });

  it('refazer o teste devolve o que parou de se cobrir (a câmera andou)', () => {
    const c = camada();
    const aqui = lugar(c, 'm-aberto m-com-voce', retangulo(100, 100, 60, 14));
    const porteira = marca(c, 'm-rotulo-porteira', retangulo(110, 100, 80, 14));
    esconderOQueSeCobre(c, false);
    expect(porteira.style.visibility).toBe('hidden');
    porteira.getBoundingClientRect = () => retangulo(300, 300, 80, 14);
    esconderOQueSeCobre(c, false);
    expect(porteira.style.visibility).toBe('');
    expect(aqui.style.visibility).toBe('');
  });

  it('de longe entram os nomes das matérias: a de agora e a seguinte vêm antes das outras', () => {
    const c = camada();
    const outra = marca(c, 'm-ne-rotulo m-uf-sombra', retangulo(100, 100, 90, 28), 'div');
    const seguinte = marca(c, 'm-ne-rotulo m-uf-seguinte', retangulo(110, 104, 90, 28), 'div');
    const agora = marca(c, 'm-ne-rotulo m-uf-agora', retangulo(120, 108, 90, 28), 'div');
    esconderOQueSeCobre(c, true);
    expect(agora.style.visibility).toBe('');
    expect(seguinte.style.visibility).toBe('hidden');
    expect(outra.style.visibility).toBe('hidden');
  });

  it('de perto os nomes das matérias não entram no teste (o CSS os esconde)', () => {
    const c = camada();
    const rotulo = marca(c, 'm-ne-rotulo m-uf-agora', retangulo(100, 100, 90, 28), 'div');
    const porteira = marca(c, 'm-rotulo-porteira', retangulo(100, 100, 80, 14));
    esconderOQueSeCobre(c, false);
    expect(rotulo.style.visibility).toBe('');
    expect(porteira.style.visibility).toBe('');
  });
});
