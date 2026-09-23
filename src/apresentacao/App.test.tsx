import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renderiza o nome do produto', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Arretado' })).toBeInTheDocument();
  });
});
