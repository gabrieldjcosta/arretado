import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { registrarErro } from '../../dominios/recall/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

type Repo = Awaited<ReturnType<typeof repositorioDeTeste>>['repo'];

async function abrirHoje(repo: Repo) {
  window.location.hash = '#/';
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  await screen.findByRole('heading', { name: 'Hoje' });
  return usuario;
}

async function lerUmaNorma(repo: Repo) {
  const norma = await repo
    .colecao('normas')
    .criar({ tituloCurto: 'LEP', escopo: 'pessoal', tipo: 'Lei' });
  await repo.colecao('leituras').criar({
    normaId: norma.id,
    posicaoId: '11111111-1111-4111-8111-111111111111',
    ultimaLeituraEm: repo.ctx.agora().toISOString(),
  });
  return norma;
}

describe('Hoje › convite depois da primeira leitura', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sem leitura nenhuma, não aparece', async () => {
    const { repo } = await repositorioDeTeste();
    await abrirHoje(repo);
    expect(screen.queryByText(/vale lembrar/)).toBeNull();
  });

  it('depois de ler uma norma e sem frases, convida, leva à norma e "Agora não" dispensa de vez', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await lerUmaNorma(repo);
    const usuario = await abrirHoje(repo);
    expect(await screen.findByText(/Algo em LEP vale lembrar\?/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir LEP' })).toHaveAttribute(
      'href',
      `#/biblioteca/normas/${norma.id}`,
    );
    await usuario.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(screen.queryByText(/vale lembrar/)).toBeNull();
    expect(localStorage.getItem('arretado.conviteFrases.dispensado')).toBe('1');
  });

  it('com alguma frase, não aparece', async () => {
    const { repo } = await repositorioDeTeste();
    await lerUmaNorma(repo);
    await registrarErro(repo, { fraseCorreta: 'O prazo é de 10 dias.' });
    await abrirHoje(repo);
    expect(screen.queryByText(/vale lembrar/)).toBeNull();
  });
});
