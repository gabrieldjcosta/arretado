import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { Intervalo } from '../../core/modelo';
import { BarraDeLacuna } from './BarraDeLacuna';
import { EditorDeLacuna } from './EditorDeLacuna';

function Teste({ texto }: { texto: string }) {
  const [o, setO] = useState<Intervalo[]>([]);
  const [separados, setSeparados] = useState(false);
  return (
    <>
      <EditorDeLacuna texto={texto} ocultos={o} aoMudar={setO} />
      <BarraDeLacuna
        texto={texto}
        ocultos={o}
        aoMudar={setO}
        separados={separados}
        aoSeparar={setSeparados}
      />
    </>
  );
}

afterEach(cleanup);

describe('BarraDeLacuna', () => {
  it('sugere por regra, deixa desfazer e oferece um cartão por trecho', async () => {
    const u = userEvent.setup();
    render(<Teste texto="Prazo de 30 dias, vedada a prorrogação." />);
    expect(screen.queryByLabelText('Um cartão por trecho')).toBeNull();
    await u.click(screen.getByRole('button', { name: 'Sugerir lacunas' }));
    expect(screen.getAllByRole('button', { name: /Trecho escondido/ })).toHaveLength(2);
    expect(screen.getByLabelText('Um cartão por trecho')).not.toBeChecked();
    await u.click(screen.getByRole('button', { name: /Trecho escondido: vedada/ }));
    expect(screen.getAllByRole('button', { name: /Trecho escondido/ })).toHaveLength(1);
  });

  it('avisa quando não há o que sugerir', async () => {
    const u = userEvent.setup();
    render(<Teste texto="A lei vale em todo o território." />);
    await u.click(screen.getByRole('button', { name: 'Sugerir lacunas' }));
    expect(screen.getByRole('status')).toHaveTextContent('Nada a sugerir');
  });
});
