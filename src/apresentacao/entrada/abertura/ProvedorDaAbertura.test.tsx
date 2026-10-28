import { StrictMode } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { alterarPreferencias } from '../../../core/preferencias';
import { simularMovimento } from '../../../testes/movimento';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { Marca } from '../../componentes/escrita/Marca';
import { lembrarDaEscrita } from '../../componentes/escrita/frequencia';
import { useAberturaEmCurso } from '../../componentes/escrita/vez-da-escrita';
import { ContextoRepositorio } from '../../dados/contexto';
import { ProvedorDaAbertura } from './ProvedorDaAbertura';

const CHAVE = 'arretado:escrita-do-nome:v1';
const HOJE = '2026-10-20T12:00:00.000Z';

beforeEach(() => {
  window.localStorage.clear();
  // O setup semeia o Dia no futuro (aparelho que já viu a Abertura); aqui o nome ainda não foi escrito.
  window.localStorage.removeItem(CHAVE);
  simularMovimento('normal');
});

/** Quem abre por cima do app (a Chegada) pergunta isto: aqui só mostra a resposta. */
function Sonda() {
  return <p data-testid="sonda">{useAberturaEmCurso() ? 'espera' : 'livre'}</p>;
}

async function montar(opcoes: { estrito?: boolean; soEstudo?: boolean } = {}) {
  const { repo } = await repositorioDeTeste({ inicio: HOJE });
  if (opcoes.soEstudo) await alterarPreferencias(repo, { modoSoEstudo: true });
  const arvore = (
    <ContextoRepositorio.Provider value={repo}>
      <ProvedorDaAbertura>
        <a className="marca" href="#/">
          <Marca />
        </a>
        <Sonda />
      </ProvedorDaAbertura>
    </ContextoRepositorio.Provider>
  );
  const vista = render(opcoes.estrito ? <StrictMode>{arvore}</StrictMode> : arvore);
  const camada = () => vista.container.querySelector('.abertura');
  // A escrita do cabeçalho (`svg.eb` dentro de `.marca`) e o lockup parado (com o ponto de luz).
  const escritaNoCabecalho = () => vista.container.querySelector('.marca svg.eb');
  const parado = () => vista.container.querySelector('.marca .lockup-ponto');
  const sonda = () => vista.getByTestId('sonda').textContent;
  return { ...vista, camada, escritaNoCabecalho, parado, sonda };
}

const guardado = () => JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null') as unknown;

describe('ProvedorDaAbertura: quem escreve o nome (M2 do Zé)', () => {
  it('primeira vez: o cabeçalho espera, a tela cheia escreve e o cabeçalho nasce parado', async () => {
    const { camada, escritaNoCabecalho, parado, sonda, container } = await montar();
    // Decidindo: nenhuma das duas escreve, e quem abre por cima espera.
    expect(camada()).toBeNull();
    expect(escritaNoCabecalho()).toBeNull();
    expect(parado()).toBeNull();
    expect(sonda()).toBe('espera');

    await waitFor(() => {
      expect(camada()).not.toBeNull();
    });
    expect(camada()?.querySelector('svg.eb')).not.toBeNull();
    expect(camada()?.querySelector('svg.eb')).not.toHaveClass('curta');
    // O nome não se escreve nos dois lugares: o cabeçalho tem o lockup parado, com o ponto de luz.
    expect(escritaNoCabecalho()).toBeNull();
    await waitFor(() => {
      expect(parado()).not.toBeNull();
    });
    expect(container.querySelectorAll('svg.eb')).toHaveLength(1);
    expect(sonda()).toBe('espera');
    expect(guardado()).toEqual({ dia: '2026-10-20' });
  });

  it('um toque pula: a camada sai, a espera acaba e o cabeçalho segue parado', async () => {
    const { camada, escritaNoCabecalho, parado, sonda } = await montar();
    await waitFor(() => {
      expect(camada()).not.toBeNull();
    });
    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(camada()).toBeNull();
    });
    expect(sonda()).toBe('livre');
    expect(escritaNoCabecalho()).toBeNull();
    expect(parado()).not.toBeNull();
  });

  it('primeira abertura do Dia seguinte: a tela cheia escreve no modo curto', async () => {
    lembrarDaEscrita(new Date('2026-10-19T12:00:00Z'));
    const { camada } = await montar();
    await waitFor(() => {
      expect(camada()?.querySelector('svg.eb')).toHaveClass('curta');
    });
    expect(guardado()).toEqual({ dia: '2026-10-20' });
  });

  it('demais aberturas do Dia: nada de camada nem de espera, o cabeçalho parado na hora', async () => {
    lembrarDaEscrita(new Date('2026-10-20T08:00:00Z'));
    const { camada, escritaNoCabecalho, parado, sonda } = await montar();
    expect(camada()).toBeNull();
    expect(escritaNoCabecalho()).toBeNull();
    expect(parado()).not.toBeNull();
    expect(sonda()).toBe('livre');
  });

  it('movimento reduzido do sistema: nenhuma camada, o cabeçalho parado, a primeira vez guardada', async () => {
    simularMovimento('reduzido');
    const { camada, parado, sonda } = await montar();
    expect(camada()).toBeNull();
    expect(parado()).not.toBeNull();
    expect(sonda()).toBe('livre');
    expect(window.localStorage.getItem(CHAVE)).toBeNull();
  });

  it('com o "só estudo" ligado a tela cheia não abre: o cabeçalho escreve como sempre escreveu', async () => {
    const { camada, escritaNoCabecalho, parado, sonda } = await montar({ soEstudo: true });
    expect(sonda()).toBe('espera');
    await waitFor(() => {
      expect(escritaNoCabecalho()).not.toBeNull();
    });
    expect(camada()).toBeNull();
    expect(parado()).toBeNull();
    expect(sonda()).toBe('livre');
    await waitFor(() => {
      expect(guardado()).toEqual({ dia: '2026-10-20' });
    });
  });

  it('no StrictMode (efeitos em dobro) a escrita é de um lugar só', async () => {
    const { camada, escritaNoCabecalho, container } = await montar({ estrito: true });
    await waitFor(() => {
      expect(camada()).not.toBeNull();
    });
    expect(escritaNoCabecalho()).toBeNull();
    expect(container.querySelectorAll('.abertura')).toHaveLength(1);
    expect(container.querySelectorAll('svg.eb')).toHaveLength(1);
  });
});
