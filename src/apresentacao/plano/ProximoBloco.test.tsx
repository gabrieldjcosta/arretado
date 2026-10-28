import { render, screen, waitFor } from '@testing-library/react';
import { iniciarSessao } from '../../dominios/sessao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';
import { garantirCicloPadrao } from './ciclo/padrao';

async function planoComCiclo() {
  const { repo } = await repositorioDeTeste();
  const d = await repo.colecao('disciplinas').criar({ nome: 'Penal' });
  await repo.colecao('pontos').criar({ disciplinaId: d.id, titulo: 'Crimes', faixa: 'alta' });
  await garantirCicloPadrao(repo);
  return repo;
}

describe('Trilha › Próximo bloco (F5)', () => {
  it('vem antes do campo opcional da data da prova: a ação principal é a primeira da tela', async () => {
    const repo = await planoComCiclo();
    window.location.hash = '#/plano';
    render(<App abrir={() => Promise.resolve(repo)} />);

    const comecar = await screen.findByRole('link', { name: 'Começar este bloco' });
    const data = await screen.findByRole('button', {
      name: 'Informar a data da prova (opcional)',
    });
    expect(comecar.compareDocumentPosition(data) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('com Sessão aberta não oferece "Começar este bloco": o Hoje também deixa o Agora esperar', async () => {
    const repo = await planoComCiclo();
    window.location.hash = '#/plano';
    render(<App abrir={() => Promise.resolve(repo)} />);
    expect(await screen.findByRole('link', { name: 'Começar este bloco' })).toBeInTheDocument();

    await iniciarSessao(repo, { alvo: { tipo: 'livre', rotulo: 'Penal' } });
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Começar este bloco' })).not.toBeInTheDocument();
    });
  });
});
