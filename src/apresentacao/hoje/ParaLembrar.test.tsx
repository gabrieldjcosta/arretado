import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LEMBRETE_MAX } from '../../core/modelo';
import { alterarPreferencias, obterPreferencias } from '../../core/preferencias';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

/** Deixa um teste contar, segurar ou fazer falhar a gravação do "Para lembrar". */
const gravacao = vi.hoisted(() => ({
  chamadas: 0,
  segurar: undefined as Promise<void> | undefined,
  falharUmaVez: false,
}));
vi.mock('../../core/preferencias', async (original) => {
  const real = await original<typeof import('../../core/preferencias')>();
  return {
    ...real,
    alterarPreferencias: async (...args: Parameters<typeof real.alterarPreferencias>) => {
      gravacao.chamadas += 1;
      await gravacao.segurar;
      if (gravacao.falharUmaVez) {
        gravacao.falharUmaVez = false;
        throw new Error('sem espaço');
      }
      return real.alterarPreferencias(...args);
    },
  };
});

async function abrirHoje(repo: Awaited<ReturnType<typeof repositorioDeTeste>>['repo']) {
  window.location.hash = '#/';
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  const campo = await screen.findByRole('textbox', { name: 'Para lembrar' });
  return { usuario, campo };
}

describe('Hoje › Para lembrar (P7b)', () => {
  beforeEach(() => {
    localStorage.clear();
    gravacao.chamadas = 0;
    gravacao.segurar = undefined;
    gravacao.falharUmaVez = false;
  });

  it('nasce vazio, com o rótulo à vista', async () => {
    const { repo } = await repositorioDeTeste();
    const { campo } = await abrirHoje(repo);
    expect(campo).toHaveValue('');
    expect(campo).toHaveAttribute('placeholder', 'O que fazer fora do app');
    expect(screen.getByRole('heading', { name: 'Para lembrar' })).toBeVisible();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('escrever avisa que falta salvar; Salvar grava o texto aparado e diz que salvou', async () => {
    const { repo } = await repositorioDeTeste();
    const { usuario, campo } = await abrirHoje(repo);

    await usuario.type(campo, '  Pedir o livro de Processo Penal  ');
    expect(screen.getByRole('status')).toHaveTextContent('Ainda não salvo.');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Salvo.')).toBeInTheDocument();
    expect((await obterPreferencias(repo)).lembrete).toBe('Pedir o livro de Processo Penal');
    expect(campo).toHaveValue('Pedir o livro de Processo Penal');
  });

  it('tirar o foco do campo para clicar em Salvar grava uma vez só', async () => {
    const { repo } = await repositorioDeTeste();
    const { usuario, campo } = await abrirHoje(repo);
    let soltar = () => {};
    gravacao.segurar = new Promise<void>((resolver) => {
      soltar = resolver;
    });

    await usuario.type(campo, 'Ligar para o cartório');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' })); // o clique chega com a gravação em curso
    soltar();

    expect(await screen.findByText('Salvo.')).toBeInTheDocument();
    expect(gravacao.chamadas).toBe(1);
  });

  it('sair do campo sem apertar Salvar também grava, para o texto não sumir', async () => {
    const { repo } = await repositorioDeTeste();
    const { usuario, campo } = await abrirHoje(repo);

    await usuario.type(campo, 'Ligar para o cartório');
    await usuario.tab();

    expect(await screen.findByText('Salvo.')).toBeInTheDocument();
    expect((await obterPreferencias(repo)).lembrete).toBe('Ligar para o cartório');
    expect(gravacao.chamadas).toBe(1);
  });

  it('Salvar sem nada novo diz que está salvo e não grava', async () => {
    const { repo } = await repositorioDeTeste();
    const { usuario } = await abrirHoje(repo);

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Salvo.')).toBeInTheDocument();
    expect(gravacao.chamadas).toBe(0);
  });

  it('volta com o que estava salvo, e esvaziar o campo e salvar apaga', async () => {
    const { repo } = await repositorioDeTeste();
    await alterarPreferencias(repo, { lembrete: 'Pedir o livro de Processo Penal' });
    gravacao.chamadas = 0;
    const { usuario, campo } = await abrirHoje(repo);
    expect(campo).toHaveValue('Pedir o livro de Processo Penal');

    await usuario.clear(campo);
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Salvo.')).toBeInTheDocument();
    expect((await obterPreferencias(repo)).lembrete).toBe('');
    expect(campo).toHaveValue('');
  });

  it('o que a pessoa escreve enquanto grava fica no campo, ainda por salvar', async () => {
    const { repo } = await repositorioDeTeste();
    const { usuario, campo } = await abrirHoje(repo);
    let soltar = () => {};
    gravacao.segurar = new Promise<void>((resolver) => {
      soltar = resolver;
    });

    await usuario.type(campo, 'a');
    await usuario.tab(); // grava "a" e fica esperando
    await usuario.type(campo, 'b');
    soltar();

    await waitFor(async () => {
      expect((await obterPreferencias(repo)).lembrete).toBe('a');
    });
    expect(campo).toHaveValue('ab');
    expect(screen.getByRole('status')).toHaveTextContent('Ainda não salvo.');
  });

  it('a tecla E dentro do campo escreve, não abre o Registrar erro', async () => {
    const { repo } = await repositorioDeTeste();
    const { usuario, campo } = await abrirHoje(repo);
    await usuario.type(campo, 'e');
    expect(campo).toHaveValue('e');
    expect(window.location.hash).toBe('#/');
  });

  it('perto do teto mostra quantos caracteres já tem; antes disso, nada', async () => {
    const { repo } = await repositorioDeTeste();
    const { campo } = await abrirHoje(repo);
    const aviso = LEMBRETE_MAX - 50;

    fireEvent.change(campo, { target: { value: 'a'.repeat(aviso - 1) } });
    expect(screen.queryByText(`${String(aviso - 1)}/${String(LEMBRETE_MAX)}`)).toBeNull();
    expect(campo).not.toHaveAccessibleDescription();

    fireEvent.change(campo, { target: { value: 'a'.repeat(aviso) } });
    const contagem = `${String(aviso)}/${String(LEMBRETE_MAX)}`;
    expect(screen.getByText(contagem)).toBeInTheDocument();
    expect(campo).toHaveAccessibleDescription(contagem);
    expect(campo).toHaveAttribute('maxlength', String(LEMBRETE_MAX));
  });

  it('se a gravação falha, avisa, mantém o texto e deixa tentar de novo', async () => {
    const { repo } = await repositorioDeTeste();
    const { usuario, campo } = await abrirHoje(repo);
    gravacao.falharUmaVez = true;

    await usuario.type(campo, 'Ligar para o cartório');
    await usuario.tab(); // sair do campo tenta gravar e falha

    expect(await screen.findByRole('alert')).toHaveTextContent('Problema ao salvar.');
    expect(campo).toHaveValue('Ligar para o cartório');
    expect(screen.getByRole('status')).toHaveTextContent('Ainda não salvo.');

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Salvo.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect((await obterPreferencias(repo)).lembrete).toBe('Ligar para o cartório');
  });
});
