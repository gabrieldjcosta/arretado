import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TextoBuscavel } from '../../dominios/legislacao/busca';
import { BuscaNaNorma, type TextosDaBusca } from './BuscaNaNorma';

afterEach(cleanup);

const ART_3 = 7;
const BUSCAVEIS: TextoBuscavel[] = [
  { indice: 4, texto: 'harmônica', chave: 'harmonica', inicioNoTexto: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
];

function Busca({ irPara, textos }: { irPara: (indice: number) => void; textos: TextosDaBusca }) {
  const [consulta, setConsulta] = useState('');
  return (
    <BuscaNaNorma
      aberto
      aoFechar={() => undefined}
      consulta={consulta}
      mudarConsulta={setConsulta}
      textos={textos}
      tentarDeNovo={() => undefined}
      indiceDoEndereco={(e) => (e === 'art3' ? ART_3 : undefined)}
      referencia={(i) => `nó ${String(i)}`}
      irPara={irPara}
    />
  );
}

/**
 * Digita e dá Enter no mesmo instante, antes de a lista alcançar o que foi digitado (num aparelho
 * lento, o Enter chega antes do render adiado): dentro de um só `act`, o render adiado só roda na saída.
 */
function digitarEEnter(valor: string) {
  const campo = screen.getByRole('searchbox', { name: 'Texto ou endereço' });
  act(() => {
    fireEvent.change(campo, { target: { value: valor } });
    fireEvent.submit(campo);
  });
}

describe('Enter na busca da norma', () => {
  it('vai ao endereço digitado, mesmo antes de a lista adiada alcançá-lo', () => {
    const irPara = vi.fn();
    render(<Busca irPara={irPara} textos={{ estado: 'pronto', buscaveis: BUSCAVEIS }} />);
    digitarEEnter('art. 3');
    expect(irPara).toHaveBeenCalledExactlyOnceWith(ART_3);
  });

  it('vai ao primeiro achado do texto digitado, mesmo antes de a lista adiada alcançá-lo', () => {
    const irPara = vi.fn();
    render(<Busca irPara={irPara} textos={{ estado: 'pronto', buscaveis: BUSCAVEIS }} />);
    digitarEEnter('HARMONICA');
    expect(irPara).toHaveBeenCalledExactlyOnceWith(4);
  });

  it('sem endereço nem achado, não vai a lugar nenhum', () => {
    const irPara = vi.fn();
    render(<Busca irPara={irPara} textos={{ estado: 'carregando' }} />);
    digitarEEnter('xyz');
    expect(irPara).not.toHaveBeenCalled();
  });
});
