import { lerSelecao } from './selecao';

/** Dois dispositivos como o leitor desenha: rótulo fora do texto vigente, pedaços e o marcador. */
function montar() {
  document.body.innerHTML = `
    <div id="lista">
      <p><span>Art. 1º</span> <span class="texto-vigente" data-dispositivo="d1">A execução <mark>penal</mark> tem<button data-fora-do-texto>✎</button> por <del>fim</del> objetivo:</span></p>
      <p><span>I -</span> <span class="texto-vigente" data-dispositivo="d2">efetivar as disposições;</span></p>
    </div>`;
  const lista = document.getElementById('lista');
  if (!lista) throw new Error('sem lista');
  const textos = [...lista.querySelectorAll('.texto-vigente')];
  return { lista, d1: textos[0], d2: textos[1] };
}

/** O nó de texto que contém o texto dado. */
function noDe(raiz: Element | undefined, texto: string): Text {
  const andar = document.createTreeWalker(raiz ?? document.body, NodeFilter.SHOW_TEXT);
  for (let no = andar.nextNode(); no; no = andar.nextNode()) {
    if (no.textContent?.includes(texto)) return no as Text;
  }
  throw new Error(`sem "${texto}"`);
}

function selecionar(a: Text, de: number, b: Text, ate: number) {
  const selecao = document.getSelection();
  selecao?.setBaseAndExtent(a, de, b, ate);
  return selecao;
}

const TEXTO_D1 = 'A execução penal tem por fim objetivo:';

describe('a seleção em offsets do texto gravado (11.4)', () => {
  afterEach(() => {
    document.getSelection()?.removeAllRanges();
    document.body.innerHTML = '';
  });

  it('dentro de um dispositivo: atravessa o grifo e o tachado, sem contar o marcador da nota', () => {
    const { lista, d1 } = montar();
    // De "execução" (no primeiro nó) até "fim" (dentro do <del>), passando pelo ✎.
    const selecao = selecionar(noDe(d1, 'A execução'), 2, noDe(d1, 'fim'), 3);
    const lida = lerSelecao(selecao, lista);
    expect(lida).toEqual({ dispositivoId: 'd1', inicio: 2, fim: 28, cortada: false });
    expect(TEXTO_D1.slice(2, 28)).toBe('execução penal tem por fim');
  });

  it('de trás para frente dá o mesmo trecho', () => {
    const { lista, d1 } = montar();
    const selecao = selecionar(noDe(d1, 'penal'), 5, noDe(d1, 'A execução'), 2);
    expect(lerSelecao(selecao, lista)).toEqual({
      dispositivoId: 'd1',
      inicio: 2,
      fim: 16,
      cortada: false,
    });
  });

  it('começando no rótulo vale o começo do texto; atravessando dispositivos, corta no primeiro', () => {
    const { lista, d2 } = montar();
    const selecao = selecionar(noDe(lista, 'Art. 1º'), 0, noDe(d2, 'efetivar'), 8);
    expect(lerSelecao(selecao, lista)).toEqual({
      dispositivoId: 'd1',
      inicio: 0,
      fim: TEXTO_D1.length,
      cortada: true,
    });
  });

  it('a faixa que só encosta no seguinte não corta; fora do texto, vazia ou só espaço: nada', () => {
    const { lista, d1, d2 } = montar();
    // Do meio do d1 até o começo do d2 (o clique triplo): fica no d1, sem corte.
    let selecao = selecionar(noDe(d1, 'objetivo'), 0, noDe(d2, 'efetivar'), 0);
    expect(lerSelecao(selecao, lista)).toMatchObject({ dispositivoId: 'd1', cortada: false });
    selecao = selecionar(noDe(lista, 'Art. 1º'), 0, noDe(lista, 'Art. 1º'), 4);
    expect(lerSelecao(selecao, lista)).toBeUndefined();
    selecao = selecionar(noDe(d1, 'penal'), 2, noDe(d1, 'penal'), 2);
    expect(lerSelecao(selecao, lista)).toBeUndefined();
    selecao = selecionar(noDe(d1, ' tem'), 4, noDe(d1, ' por '), 1);
    expect(lerSelecao(selecao, lista)).toBeUndefined();
    expect(lerSelecao(null, lista)).toBeUndefined();
  });
});
