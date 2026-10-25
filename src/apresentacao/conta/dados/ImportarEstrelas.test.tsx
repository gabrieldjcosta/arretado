import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { ContextoRepositorio } from '../../dados/contexto';
import { ImportarEstrelas } from './ImportarEstrelas';

async function montar() {
  const { repo } = await repositorioDeTeste();
  render(
    <ContextoRepositorio.Provider value={repo}>
      <ImportarEstrelas />
    </ContextoRepositorio.Provider>,
  );
}

const arquivo = (conteudo: string) =>
  new File([conteudo], 'pacote.json', { type: 'application/json' });

describe('ImportarEstrelas', () => {
  it('relata a norma do pacote que não está na biblioteca', async () => {
    await montar();
    const pacote = JSON.stringify({
      id: '11111111-1111-4111-8111-111111111111',
      titulo: 'T',
      normas: { 'lei-x-1-2000': ['1'] },
    });
    await userEvent.upload(screen.getByLabelText(/arquivo do pacote/i), arquivo(pacote));
    expect(await screen.findByRole('status')).toHaveTextContent(
      '0 estrelas novas em 0 normas; normas do pacote ainda fora da sua biblioteca: 1.',
    );
  });

  it('recusa arquivo que não é pacote', async () => {
    await montar();
    await userEvent.upload(screen.getByLabelText(/arquivo do pacote/i), arquivo('{"a":1}'));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Este arquivo não é um pacote de estrelas.',
    );
  });
});
