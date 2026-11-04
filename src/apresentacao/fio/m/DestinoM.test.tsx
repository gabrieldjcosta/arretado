import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { simularMovimento } from '../../../testes/movimento';
import type { EstadoDoFio } from '../../../dominios/fio';
import type { EntradaDaJornada } from '../destino/jornada';
import { useJornadaDoFio, type JornadaDoFio } from '../destino/useJornadaDoFio';
import { DestinoM } from './DestinoM';
import { destinoJaVisto, esquecerDestinoVisto, marcarDestinoVisto } from './destino-visto';

vi.mock('../destino/useJornadaDoFio', () => ({ useJornadaDoFio: vi.fn() }));

type ComAnimate = { animate?: unknown };

const MATERIAS = [
  { id: 'exec', nome: 'Execução Penal' },
  { id: 'penal', nome: 'Direito Penal' },
];

function estado(extra: Partial<EstadoDoFio> = {}): EstadoDoFio {
  return {
    versao: 1,
    etapasFeitas: 0,
    passosDados: 0,
    etapasPorMateria: {},
    porteirasDoFim: [],
    pousos: [],
    ...extra,
  };
}

function entrada(extra: Partial<EntradaDaJornada> = {}): EntradaDaJornada {
  return {
    materias: MATERIAS,
    atualId: 'exec',
    pousosPorMateria: {},
    portasAbertas: [],
    comMapa: true,
    ...extra,
  };
}

function jornada(
  e: EntradaDaJornada | undefined,
  fio: Partial<EstadoDoFio> = {},
  extra: Partial<JornadaDoFio> = {},
): JornadaDoFio {
  return {
    carregando: false,
    falhou: false,
    entrada: e,
    fio: { estado: estado(fio), marcas: {} },
    ...extra,
  };
}

function abrir(j: JornadaDoFio) {
  vi.mocked(useJornadaDoFio).mockReturnValue(j);
  return render(
    <MemoryRouter>
      <main id="conteudo">
        <DestinoM />
      </main>
    </MemoryRouter>,
  );
}

const LIDOS = [
  { normaId: 'lep', endereco: 'art-112', rotulo: 'LEP, Art. 112', lido: true },
  { normaId: 'lep', endereco: 'art-52', rotulo: 'LEP, Art. 52', lido: false },
  { normaId: 'lep', endereco: 'art-66', rotulo: 'LEP, Art. 66', lido: false },
  { normaId: 'lep', endereco: 'art-41', rotulo: 'LEP, Art. 41', lido: true },
];

beforeEach(() => {
  esquecerDestinoVisto();
});

afterEach(() => {
  cleanup();
  delete (Element.prototype as ComAnimate).animate;
  esquecerDestinoVisto();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('o Destino no quadro do mockup', () => {
  it('abre com o título para o leitor de tela, o "olho" e o número em % do que mais cai já lido', () => {
    abrir(jornada(entrada({ artigos: LIDOS })));
    expect(screen.getByRole('heading', { level: 1, name: 'Destino' })).toHaveClass('m-so-leitor');
    expect(screen.getByText('Linha do destino · sua prova')).toHaveClass('m-olho');
    // Sem movimento o número já está no valor final; o leitor de tela lê só ele.
    expect(document.querySelector('.m-numero [aria-hidden="true"]')).toHaveTextContent('50');
    expect(document.querySelector('.m-numero .m-so-leitor')).toHaveTextContent('50%');
    expect(
      screen.getByText(/do que mais cai em Execução Penal já é seu\. Cada ponto é um artigo/),
    ).toBeInTheDocument();
  });

  it('sem a lei da matéria o número conta as etapas, e diz qual lei falta', () => {
    abrir(jornada(entrada(), { etapasFeitas: 3, passosDados: 7 }));
    const numero = document.querySelector('.m-numero');
    expect(numero).toHaveTextContent('3 etapas');
    expect(
      screen.getByText(
        /pousadas no caminho, com 7 passos dados\. Quando Execução Penal tiver a lei/,
      ),
    ).toBeInTheDocument();
  });

  it('uma etapa e um passo ficam no singular', () => {
    abrir(jornada(entrada(), { etapasFeitas: 1, passosDados: 1 }));
    expect(document.querySelector('.m-numero')).toHaveTextContent('1 etapa');
    expect(screen.getByText(/pousada no caminho, com 1 passo dado\./)).toBeInTheDocument();
  });

  it('sem matéria no Ciclo manda escolher a prova no Agora; com matéria e sem pouso, puxar o fio', () => {
    const { unmount } = abrir(jornada(entrada({ materias: [], atualId: '' })));
    expect(
      screen.getByText('Escolha a sua prova no Agora para dar a cada estado uma matéria.'),
    ).toBeInTheDocument();
    unmount();
    abrir(jornada(entrada()));
    expect(
      screen.getByText(
        'Cada etapa que pousa abre um lugar no caminho. Puxe o fio no Agora para o primeiro.',
      ),
    ).toBeInTheDocument();
  });

  it('enquanto o app ainda lê, o número é zero e o mapa fica ocupado, sem aviso de falha', () => {
    abrir(jornada(undefined, {}, { carregando: true }));
    expect(document.querySelector('.m-numero .m-so-leitor')).toHaveTextContent('0%');
    expect(screen.getByRole('group', { name: 'Mapa do caminho pelo Nordeste' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('se a leitura falhou, diz com calma e não desenha o mapa', () => {
    abrir(jornada(undefined, {}, { falhou: true }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não deu para abrir o mapa agora. Tente de novo em instantes.',
    );
    expect(screen.queryByRole('group', { name: 'Mapa do caminho pelo Nordeste' })).toBeNull();
  });

  it('a legenda diz o que é o fio claro e o escuro, e avisa quando o Ciclo passa das nove matérias do mapa', () => {
    const muitas = Array.from({ length: 11 }, (_, i) => ({
      id: `m${String(i)}`,
      nome: `Matéria ${String(i)}`,
    }));
    const { container, unmount } = abrir(jornada(entrada()));
    const legenda = container.querySelector('.m-legenda-mapa');
    expect(legenda).toHaveTextContent('pela frente');
    expect(legenda).toHaveTextContent('já é seu');
    expect(legenda).not.toHaveTextContent('nove primeiras matérias');
    unmount();
    const { container: c2 } = abrir(jornada(entrada({ materias: muitas, atualId: 'm0' })));
    expect(c2.querySelector('.m-legenda-mapa')).toHaveTextContent(
      'O mapa mostra as nove primeiras matérias do seu Ciclo.',
    );
  });

  it('os pousos vão para o leitor de tela numa lista, do mais recente ao mais antigo', () => {
    abrir(
      jornada(entrada({ pousosPorMateria: { exec: 2 } }), {
        etapasFeitas: 2,
        pousos: [
          {
            etapa: 1,
            materia: 'Execução Penal',
            materiaId: 'exec',
            fatos: ['Art. 112', 'Art. 52'],
          },
          { etapa: 0, materia: 'Execução Penal', materiaId: 'exec', fatos: [] },
        ],
      }),
    );
    const lista = screen.getByRole('list', { name: 'Seus pousos, do mais recente ao mais antigo' });
    const itens = [...lista.querySelectorAll('li')].map((li) => li.textContent);
    expect(itens).toEqual([
      'Etapa 2, Execução Penal: Art. 112, Art. 52',
      'Etapa 1, Execução Penal',
    ]);
  });

  it('sem pouso não há lista', () => {
    abrir(jornada(entrada()));
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('a visita conta mesmo sem movimento: a próxima não repete a entrada', () => {
    expect(destinoJaVisto()).toBe(false);
    abrir(jornada(entrada()));
    expect(destinoJaVisto()).toBe(true);
    expect(document.querySelector('.m-destino-intro')).toBeNull();
  });
});

describe('a entrada da primeira visita (`introDestino` do mockup)', () => {
  /** As animações ficam paradas no meio: a entrada segue à vista até o teste acabar. */
  function comMovimento() {
    (Element.prototype as ComAnimate).animate = vi.fn(() => ({
      finished: new Promise<void>(() => undefined),
      cancel: () => undefined,
    }));
    simularMovimento('normal');
  }

  it('na primeira visita a estrela, "Seu destino" e a frase cobrem o quadro, sem entrar para o leitor de tela', () => {
    comMovimento();
    abrir(jornada(entrada({ artigos: LIDOS })));
    const sobre = document.querySelector('#conteudo > .m-destino-intro');
    expect(sobre).not.toBeNull();
    expect(sobre).toHaveAttribute('aria-hidden', 'true');
    expect(sobre?.querySelector('strong')?.textContent).toBe('Seu destino');
    expect(sobre?.querySelector('strong')?.querySelectorAll('i')).toHaveLength(
      'Seu destino'.length,
    );
    expect(sobre?.querySelector('span')).toHaveTextContent('A aprovação na sua prova');
    expect(sobre?.querySelector('svg path')).toHaveAttribute('d');
    expect(destinoJaVisto()).toBe(true);
  });

  it('o mapa só abre depois do tempo da entrada (2,35 s) e o resto da tela sobe um depois do outro', () => {
    comMovimento();
    abrir(jornada(entrada({ artigos: LIDOS })));
    const animate = (Element.prototype as ComAnimate).animate as ReturnType<typeof vi.fn>;
    const chamadas = animate.mock.calls as unknown as Array<[Keyframe[], KeyframeAnimationOptions]>;
    const atrasos = chamadas.map(([, opc]) => opc.delay ?? 0);
    // A subida do resto da tela começa 150 ms antes de a entrada acabar; o mapa revela de cima com o atraso inteiro.
    expect(atrasos).toContain(2350 - 150);
    expect(atrasos).toContain(2350);
  });

  it('depois da primeira visita não há entrada, e o número já vai direto ao valor', () => {
    marcarDestinoVisto();
    comMovimento();
    abrir(jornada(entrada({ artigos: LIDOS })));
    expect(document.querySelector('.m-destino-intro')).toBeNull();
  });

  it('o número sobe de 0 até o valor em 0,9 s, depois de esperar a entrada', () => {
    vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    marcarDestinoVisto();
    comMovimento();
    abrir(jornada(entrada({ artigos: LIDOS })));
    const visivel = () => document.querySelector('.m-numero [aria-hidden="true"]')?.textContent;
    expect(visivel()).toBe('0');
    act(() => {
      vi.advanceTimersByTime(450);
    });
    const meio = Number(visivel()?.replace(',', '.'));
    expect(meio).toBeGreaterThan(0);
    expect(meio).toBeLessThan(50);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(visivel()).toBe('50');
  });
});
