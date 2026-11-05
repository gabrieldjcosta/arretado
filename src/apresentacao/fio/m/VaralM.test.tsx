import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { Repositorio } from '../../../core/persistencia';
import { abrirNorma } from '../../../dominios/legislacao/leitor';
import { marcarLidoAte } from '../../../dominios/legislacao/leituras';
import { simularMovimento } from '../../../testes/movimento';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { fonteDoMapaDoVaral, guardarNoVaral } from '../../../testes/varal';
import { ContextoRepositorio } from '../../dados/contexto';
import { ContextoFonteAcervo } from '../../dados/fonteAcervoContexto';
import { ContextoFonteIncidencia } from '../../dados/fonteIncidenciaContexto';
import { esquecerOrganizacao, tirarDoVaral } from './organizar';
import { ToastM } from './ToastM';
import { avisar, esconderAviso } from './toast';
import { VaralM } from './VaralM';

type ComAnimate = { animate?: unknown };

/** Onde a pessoa está, para os testes lerem a rota. */
function Aqui() {
  const l = useLocation();
  return <output data-testid="rota">{`${l.pathname}${l.search}`}</output>;
}

interface Cenario {
  repo: Repositorio;
  ids: Readonly<Record<string, string>>;
}

/** `antes` mexe no app antes de a tela abrir (ler uma norma, tirar uma linha do varal). */
async function abrir(opcoes: { vazio?: boolean; antes?: (c: Cenario) => Promise<void> } = {}) {
  const { repo } = await repositorioDeTeste({ inicio: new Date().toISOString() });
  const { fonte, ids } = await guardarNoVaral(repo, opcoes);
  await opcoes.antes?.({ repo, ids });
  render(
    <ContextoRepositorio.Provider value={repo}>
      <ContextoFonteAcervo.Provider value={fonte}>
        <ContextoFonteIncidencia.Provider value={fonteDoMapaDoVaral()}>
          <MemoryRouter initialEntries={['/varal']}>
            <main id="conteudo">
              <Routes>
                <Route path="/varal" element={<VaralM />} />
                <Route path="*" element={<p>outra tela</p>} />
              </Routes>
              <Aqui />
              <ToastM />
            </main>
          </MemoryRouter>
        </ContextoFonteIncidencia.Provider>
      </ContextoFonteAcervo.Provider>
    </ContextoRepositorio.Provider>,
  );
  return { repo, ids, usuario: userEvent.setup() };
}

/** Uma Frase ativa que a pessoa escreveu; devolve o id. */
async function guardarFrase(repo: Repositorio, texto: string): Promise<string> {
  const f = await repo.colecao('frases').criar({
    texto,
    origemTipo: 'manual',
    estado: 'ativa',
    proximaRevisao: '2026-12-01',
  });
  return f.id;
}

const rota = () => screen.getByTestId('rota').textContent;
/** O folheto de um nome: o botão com esse nome em letra grossa (o nome acessível vem do texto visível, sem `aria-label`: desvio 38). */
const folheto = (nome: string): HTMLElement => {
  const botao = screen.getByText(nome, { selector: 'strong' }).closest('button');
  if (!botao) throw new Error(`Sem folheto ${nome}`);
  return botao;
};
/** O número miúdo (vazio quando é zero) e a linha de estado de um folheto. */
const resumo = (nome: string) => {
  const f = folheto(nome);
  return {
    quantos: f.querySelector('.m-conta-f')?.textContent ?? '',
    estado: f.querySelector('.m-estado')?.textContent ?? '',
  };
};

beforeEach(() => {
  esquecerOrganizacao();
  avisar('');
  esconderAviso();
});

afterEach(() => {
  cleanup();
  delete (Element.prototype as ComAnimate).animate;
  vi.clearAllMocks();
  esquecerOrganizacao();
});

describe('o Varal no quadro do mockup', () => {
  it('abre com o título para o leitor de tela, a frase e os dois fios de folhetos', async () => {
    await abrir({ vazio: true });
    expect(screen.getByRole('heading', { level: 1, name: 'Varal' })).toHaveClass('m-so-leitor');
    expect(
      screen.getByRole('heading', { level: 2, name: 'O que você guardou, pendurado no fio.' }),
    ).toBeInTheDocument();
    const estuda = screen.getByRole('group', { name: 'O que você estuda' });
    expect([...estuda.querySelectorAll('strong')].map((n) => n.textContent)).toEqual([
      'Normas',
      'Súmulas e teses',
      'Meus textos',
    ]);
    const guarda = screen.getByRole('group', { name: 'O que você guarda' });
    expect([...guarda.querySelectorAll('strong')].map((n) => n.textContent)).toEqual([
      'Frases',
      'Cartões',
      'Lembretes',
    ]);
    // Cada fio tem a sua curva, e o desenho de xilogravura de cada folheto é um traço só.
    expect(document.querySelectorAll('.m-varal-fio')).toHaveLength(2);
    expect(document.querySelectorAll('.m-xilo svg path')).toHaveLength(6);
  });

  it('um app vazio: nenhum número, e cada folheto diz o que fazer', async () => {
    await abrir({ vazio: true });
    expect(await screen.findByText('puxe uma do acervo')).toBeInTheDocument();
    // Zero não vira número miúdo no folheto.
    expect(resumo('Normas')).toEqual({ quantos: '', estado: 'puxe uma do acervo' });
    expect(resumo('Súmulas e teses')).toEqual({ quantos: '', estado: 'do acervo' });
    expect(resumo('Meus textos')).toEqual({ quantos: '', estado: 'cole seu material' });
    expect(resumo('Frases')).toEqual({ quantos: '', estado: 'as certas, tiradas da lei' });
    expect(resumo('Cartões')).toEqual({ quantos: '', estado: 'sem pressa' });
    expect(resumo('Lembretes')).toEqual({ quantos: '', estado: 'uma nota rápida' });
    expect(document.querySelector('.m-conta-f')).toBeNull();
  });

  it('o número e a linha de estado vêm do que o app guarda', async () => {
    await abrir();
    await waitFor(() => {
      expect(resumo('Normas')).toEqual({ quantos: '2', estado: 'as leis do seu estudo' });
    });
    expect(resumo('Súmulas e teses')).toEqual({ quantos: '2', estado: 'do acervo' });
    expect(within(folheto('Normas')).getByText('2')).toHaveClass('m-conta-f');
  });

  it('"Normas" diz a norma lida por último e o artigo onde parou', async () => {
    await abrir({
      antes: async ({ repo, ids }) => {
        const aberta = await abrirNorma(repo, ids['lei-a'] ?? '');
        const art2 = aberta.nos.find((n) => n.dispositivo.rotulo === 'Art. 2º')?.dispositivo.id;
        await marcarLidoAte(repo, ids['lei-a'] ?? '', art2 ?? '');
      },
    });
    await waitFor(() => {
      expect(resumo('Normas')).toEqual({ quantos: '2', estado: 'Retomar: LEP, art. 2º' });
    });
  });

  it('as tiradas deste aparelho são descontadas do número do folheto', async () => {
    const { ids } = await abrir({
      antes: ({ ids: guardadas }) => {
        tirarDoVaral('normas', [guardadas['lei-b'] ?? '']);
        tirarDoVaral('sumulas', [guardadas['teses-stj'] ?? '', guardadas['sumulas-stj'] ?? '']);
        return Promise.resolve();
      },
    });
    expect(ids['lei-b']).toBeDefined();
    await waitFor(() => {
      expect(resumo('Normas').quantos).toBe('1');
    });
    expect(resumo('Súmulas e teses').quantos).toBe('');
  });

  it.each([
    ['Normas', '/varal/normas'],
    ['Súmulas e teses', '/varal/sumulas'],
    ['Meus textos', '/biblioteca/resumos'],
    ['Cartões', '/recall/cartoes'],
  ])('o folheto %s abre %s', async (nome, destino) => {
    const { usuario } = await abrir();
    await usuario.click(folheto(nome));
    expect(rota()).toBe(destino);
  });

  it('"Lembretes" abre a nota, sem sair do Varal', async () => {
    const { usuario } = await abrir();
    await usuario.click(folheto('Lembretes'));
    expect(await screen.findByRole('dialog', { name: 'Lembrete' })).toBeInTheDocument();
    expect(rota()).toBe('/varal');
  });

  it('"Frases" abre o Caderno, uma folha que sobe, sem sair do Varal', async () => {
    const { usuario } = await abrir({
      antes: async ({ repo }) => {
        await guardarFrase(repo, 'A progressão depende do bom comportamento.');
      },
    });
    await waitFor(() => {
      expect(resumo('Frases').quantos).toBe('1');
    });
    await usuario.click(folheto('Frases'));
    const caderno = await screen.findByRole('dialog', { name: 'Suas Frases certas' });
    expect(
      await within(caderno).findByText('A progressão depende do bom comportamento.'),
    ).toBeInTheDocument();
    expect(rota()).toBe('/varal');
    // "Abrir a lista completa" leva à tela de antes (onde a Frase vira cartão com lacuna), depois de a folha descer.
    await usuario.click(within(caderno).getByRole('button', { name: 'Abrir a lista completa' }));
    await waitFor(() => {
      expect(rota()).toBe('/recall/frases');
    });
  });

  it('o número do folheto "Frases" é o das ativas: as arquivadas não contam', async () => {
    await abrir({
      antes: async ({ repo }) => {
        await guardarFrase(repo, 'Uma Frase ativa.');
        const arquivada = await guardarFrase(repo, 'Uma Frase arquivada.');
        await repo.colecao('frases').atualizar(arquivada, { estado: 'arquivada' });
      },
    });
    await waitFor(() => {
      expect(resumo('Frases').quantos).toBe('1');
    });
  });

  it('no Vivo os folhetos descem do fio um a um, com a mola e 70 ms entre um e outro', async () => {
    (Element.prototype as ComAnimate).animate = vi.fn(() => ({
      finished: new Promise<void>(() => undefined),
      cancel: () => undefined,
    }));
    simularMovimento('normal');
    await abrir({ vazio: true });
    const animate = (Element.prototype as ComAnimate).animate as ReturnType<typeof vi.fn>;
    const chamadas = animate.mock.calls as unknown as Array<[Keyframe[], KeyframeAnimationOptions]>;
    const dosFolhetos = chamadas.filter(([, opc]) => opc.duration === 600);
    expect(dosFolhetos.map(([, opc]) => opc.delay)).toEqual([0, 70, 140, 210, 280, 350]);
    expect(dosFolhetos[0]?.[1].easing).toBe('cubic-bezier(.34,1.56,.64,1)');
  });

  it('sem movimento os folhetos já estão no fio, inclinados como no mockup', async () => {
    await abrir({ vazio: true });
    const graus = [...document.querySelectorAll<HTMLElement>('.m-folheto')].map(
      (b) => b.style.transform,
    );
    expect(graus).toEqual([
      'rotate(-1.5deg)',
      'rotate(1.2deg)',
      'rotate(-0.8deg)',
      'rotate(1.4deg)',
      'rotate(-1.2deg)',
      'rotate(0.9deg)',
    ]);
  });
});

describe('a busca única do alto', () => {
  async function digitar(texto: string, antes?: (c: Cenario) => Promise<void>) {
    const c = await abrir(antes ? { antes } : {});
    const campo = screen.getByRole('searchbox', { name: 'Buscar no Varal' });
    await c.usuario.type(campo, texto);
    return { ...c, campo };
  }

  it('uma palavra lista as normas que a têm no nome, e os fios saem de cena', async () => {
    const { usuario, ids } = await digitar('lep');
    const lista = await screen.findByRole('region', { name: 'O que o Varal achou' });
    expect(await within(lista).findByText('LEP')).toBeInTheDocument();
    expect(within(lista).getByText('norma')).toBeInTheDocument();
    expect(document.querySelector('.m-varal')).toHaveAttribute('hidden');
    await usuario.click(within(lista).getByRole('button', { name: /^LEP/ }));
    expect(rota()).toBe(`/biblioteca/normas/${ids['lei-a'] ?? ''}`);
  });

  it('"2 LEP" abre o artigo da norma no Leitor', async () => {
    const { usuario, ids } = await digitar('2 lep');
    const achado = await screen.findByRole('button', { name: /^LEP, art\. 2º/ });
    expect(achado).toHaveTextContent('abre no Leitor');
    await usuario.click(achado);
    expect(rota()).toBe(`/biblioteca/normas/${ids['lei-a'] ?? ''}?ir=art2`);
  });

  it('o Enter abre o primeiro achado', async () => {
    const { usuario, ids, campo } = await digitar('2 lep');
    await screen.findByRole('button', { name: /^LEP, art\. 2º/ });
    await usuario.type(campo, '{Enter}');
    expect(rota()).toBe(`/biblioteca/normas/${ids['lei-a'] ?? ''}?ir=art2`);
  });

  it('o que não existe diz que nada foi achado, e apagar a busca traz os fios de volta', async () => {
    const { usuario, campo } = await digitar('zzz');
    expect(await screen.findByText(/Nada achado para “zzz”/)).toBeInTheDocument();
    await usuario.clear(campo);
    await waitFor(() => {
      expect(document.querySelector('.m-varal')).not.toHaveAttribute('hidden');
    });
    expect(screen.queryByRole('region', { name: 'O que o Varal achou' })).not.toBeInTheDocument();
  });

  it('Enter com o campo vazio diz o que digitar', async () => {
    await abrir();
    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Buscar no Varal' }), {
      key: 'Enter',
    });
    expect(
      await screen.findByText('Digite um artigo, uma súmula ou uma palavra.'),
    ).toBeInTheDocument();
  });

  it('uma palavra de uma Frase guardada acha a Frase, e tocar nela abre o Caderno nessa Frase', async () => {
    let achada = '';
    const { usuario } = await digitar('reincidente', async ({ repo }) => {
      await guardarFrase(repo, 'A progressão decidida pelo juiz.');
      achada = await guardarFrase(repo, 'O reincidente progride com 20% da pena.');
    });
    const lista = await screen.findByRole('region', { name: 'O que o Varal achou' });
    const achado = await within(lista).findByRole('button', {
      name: /O reincidente progride com 20% da pena\./,
    });
    expect(achado).toHaveTextContent('Frase');
    // Só a Frase que tem a palavra entra na lista.
    expect(within(lista).queryByText(/decidida pelo juiz/)).not.toBeInTheDocument();
    await usuario.click(achado);
    const caderno = await screen.findByRole('dialog', { name: 'Suas Frases certas' });
    expect(rota()).toBe('/varal');
    // A folha rola até a Frase e a foca (depois de o foco inicial da folha passar).
    await waitFor(() => {
      expect(
        within(caderno)
          .getByText(/O reincidente progride/)
          .closest('.m-frase-item'),
      ).toBe(document.activeElement);
    });
    expect(document.activeElement).toHaveAttribute('data-frase', achada);
  });

  it('o Enter na busca abre o Caderno quando o primeiro achado é uma Frase', async () => {
    const { usuario, campo } = await digitar('prescrição', async ({ repo }) => {
      await guardarFrase(repo, 'A prescrição não corre durante o sursis.');
    });
    await screen.findByRole('button', { name: /A prescrição não corre/ });
    await usuario.type(campo, '{Enter}');
    expect(await screen.findByRole('dialog', { name: 'Suas Frases certas' })).toBeInTheDocument();
    expect(rota()).toBe('/varal');
  });

  it('a norma que a pessoa tirou do varal não aparece na busca', async () => {
    const c = await abrir({
      antes: ({ ids: guardadas }) => {
        tirarDoVaral('normas', [guardadas['lei-a'] ?? '']);
        return Promise.resolve();
      },
    });
    await c.usuario.type(screen.getByRole('searchbox', { name: 'Buscar no Varal' }), 'lep');
    expect(await screen.findByText(/Nada achado para “lep”/)).toBeInTheDocument();
  });
});
