import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { EntradaDaJornada } from './jornada';
import { MapaDoNordeste } from './MapaDoNordeste';

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

function abrir(e: EntradaDaJornada = entrada()) {
  const usuario = userEvent.setup();
  render(
    <MemoryRouter>
      <MapaDoNordeste entrada={e} />
    </MemoryRouter>,
  );
  return usuario;
}

describe('o mapa do Nordeste', () => {
  it('é um grupo nomeado, com a dica de como passear', () => {
    abrir();
    const mapa = screen.getByRole('group', { name: 'Mapa do caminho pelo Nordeste' });
    expect(mapa).toHaveAttribute('tabindex', '0');
    expect(mapa).toHaveAccessibleDescription(/Arraste para passear/);
  });

  it('cada artigo que cai é um ponto que abre o Leitor no artigo, aceso quando já foi lido', () => {
    abrir();
    const lido = screen.getByRole('link', { name: 'LEP, Art. 112, já lido: abrir no Leitor' });
    expect(lido).toHaveAttribute('href', '/biblioteca/normas/lep?ir=art-112&foco=artigo&mapa=1');
    expect(lido).toHaveClass('lido');
    const pela = screen.getByRole('link', { name: 'LEP, Art. 52: abrir no Leitor' });
    expect(pela).not.toHaveClass('lido');
  });

  it('o primeiro lugar abre com a matéria da vez; a ficha é rascunho e Escape devolve o foco', async () => {
    const usuario = abrir();
    const lugar = screen.getAllByRole('button', { name: /você está aqui: abrir a ficha/ })[0];
    if (!lugar) throw new Error('faltou o lugar onde a pessoa está');
    await usuario.click(lugar);

    const ficha = await screen.findByRole('region', { name: /^Ficha de / });
    expect(ficha).toHaveFocus();
    expect(within(ficha).getByText(/Rascunho da pesquisa/)).toBeInTheDocument();

    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: /^Ficha de / })).not.toBeInTheDocument();
    expect(lugar).toHaveFocus();
  });

  it('um lugar que ainda não abriu diz que abre num pouso, sem cobrar nada', async () => {
    const usuario = abrir(entrada({ pousosPorMateria: {} }));
    const fechado = screen.getAllByRole('button', { name: /abre num pouso/ })[0];
    if (!fechado) throw new Error('faltou um lugar fechado');
    await usuario.click(fechado);
    expect(await screen.findByRole('status')).toHaveTextContent(
      /se abre num pouso, quando o fio passar por lá\.$/,
    );
  });

  it('a porteira fechada explica o que falta; a aberta diz para onde o caminho segue', async () => {
    const usuario = abrir();
    const fechada = screen.getByRole('button', { name: 'Porteira de Execução Penal' });
    await usuario.click(fechada);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Essa porteira fica pronta quando você ler o que mais cai em Execução Penal.',
    );
  });

  it('a porteira da matéria que leu tudo está pronta, e a que já passou, aberta', async () => {
    const lidos = entrada().artigos?.map((a) => ({ ...a, lido: true }));
    const usuario = abrir(entrada({ ...(lidos ? { artigos: lidos } : {}) }));
    await usuario.click(
      screen.getByRole('button', { name: 'Porteira de Execução Penal: pronta para você' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Porteira pronta. Ela aparece num passo seu de Execução Penal.',
    );
  });

  it('a porteira aberta mostra o nome do estado para onde o caminho segue', async () => {
    const usuario = abrir(entrada({ portasAbertas: ['exec'] }));
    await usuario.click(screen.getByRole('button', { name: 'Porteira de Execução Penal: aberta' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /^Porteira aberta\. O caminho segue para Piauí\.$/,
    );
  });

  it('o destino diz que é a chegada', async () => {
    const usuario = abrir();
    await usuario.click(screen.getByRole('button', { name: /Seu destino/ }));
    expect(await screen.findByRole('status')).toHaveTextContent(/a chegada/);
  });

  it('os botões de câmera existem e alternam entre o Nordeste e a pessoa', async () => {
    const usuario = abrir();
    expect(screen.getByRole('button', { name: 'Aproximar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Afastar' })).toBeInTheDocument();
    // Sem movimento (o jsdom não tem matchMedia), a câmera já nasce em torno da pessoa.
    const vista = screen.getByRole('button', { name: 'Ver o Nordeste' });
    await usuario.click(vista);
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
