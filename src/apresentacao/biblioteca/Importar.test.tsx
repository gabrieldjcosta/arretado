import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import {
  criarRascunho,
  publicarVersao,
  rascunhosPendentes,
} from '../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

const LEP_HTML = [
  '<p>Presidência da República</p>',
  '<p>LEI Nº 7.210, DE 11 DE JULHO DE 1984.</p>',
  '<p>Institui a Lei de Execução Penal.</p>',
  '<p>O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:</p>',
  '<p>TÍTULO I</p>',
  '<p>DO OBJETO E DA APLICAÇÃO DA LEI DE EXECUÇÃO PENAL</p>',
  '<p>Art. 1º A execução penal tem por objetivo efetivar as disposições de sentença.</p>',
  '<p>Art. 2º A jurisdição penal dos Juízes será exercida no processo de execução.</p>',
  '<p>Parágrafo único. Esta Lei aplicar-se-á igualmente ao preso provisório.</p>',
  '<p>Brasília, 11 de julho de 1984; 163º da Independência e 96º da República.</p>',
].join('');
const LEP_TEXTO = LEP_HTML.replace(/<p>/g, '').replace(/<\/p>/g, '\n');

async function abrir(repo: Repositorio, rota = '/biblioteca/importar') {
  window.location.hash = `#${rota}`;
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  await screen.findByRole('heading', { level: 1 });
  return usuario;
}

/** O `paste` como o navegador entrega: HTML da página e texto puro de reserva. */
function colar(dados: { html?: string; texto?: string }) {
  fireEvent.paste(screen.getByLabelText('Cole aqui a lei'), {
    clipboardData: {
      getData: (tipo: string) =>
        (tipo === 'text/html' ? dados.html : tipo === 'text/plain' ? dados.texto : '') ?? '',
    },
  });
}

const sumario = () => screen.findByRole('region', { name: 'Estrutura encontrada' });

function contagens(regiao: HTMLElement) {
  return Array.from(regiao.querySelectorAll('.contagens > div'), (d) => d.textContent);
}

describe('Importar por colagem (9.5)', () => {
  it('colar o HTML: sumário com o título sugerido; publicar leva à Biblioteca com a norma', async () => {
    const { repo } = await repositorioDeTeste();
    const usuario = await abrir(repo);

    colar({ html: LEP_HTML, texto: LEP_TEXTO });

    const estrutura = await sumario();
    expect(contagens(estrutura)).toEqual([
      'Título1',
      'Preâmbulo1',
      'Artigos2',
      'Rubrica1',
      'Parágrafo1',
    ]);
    expect(estrutura).toHaveTextContent('6 dispositivos no total.');
    expect(screen.getByText(/^LEI Nº 7\.210, DE 11 DE JULHO DE 1984\. — Institui/)).toBeVisible();
    expect(screen.getByRole('region', { name: 'Avisos' })).toHaveTextContent(
      'Nenhuma linha tachada: a página parece a compilada',
    );
    expect(screen.getByRole('region', { name: 'Ficou de fora' })).toHaveTextContent(
      '1 linha do cabeçalho do portal1 linha do fecho (local, data e assinaturas)',
    );
    const titulo = screen.getByRole('textbox', { name: 'Título curto' });
    expect(titulo).toHaveValue('Lei nº 7.210/1984');
    // O rascunho já está gravado, e a rota o retoma se a página recarregar.
    const [pendente] = await rascunhosPendentes(repo);
    expect(pendente?.versao.origemEntrada).toBe('html');
    expect(window.location.hash).toBe(`#/biblioteca/importar/${pendente?.versao.id ?? ''}`);

    await usuario.clear(titulo);
    await usuario.type(titulo, '  LEP ');
    await usuario.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
    expect(screen.getByText('LEP publicada.')).toHaveAttribute('role', 'status');
    const lista = await screen.findByRole('region', { name: 'Normas' });
    expect(within(lista).getByText('LEP')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Importações pendentes' })).not.toBeInTheDocument();
    expect(await rascunhosPendentes(repo)).toEqual([]);
    expect(window.location.hash).toBe('#/biblioteca');
  });

  it('só texto puro: tudo a confirmar, e o botão aceita em lote', async () => {
    const { repo } = await repositorioDeTeste();
    const usuario = await abrir(repo);

    colar({ texto: LEP_TEXTO });

    await sumario();
    expect(screen.queryByText(/parece a compilada/)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Para confirmar' })).toHaveTextContent(
      '6 dispositivos',
    );
    await usuario.click(screen.getByRole('button', { name: 'Aceitar 6 e publicar' }));

    expect(await screen.findByText('Lei nº 7.210/1984 publicada.')).toHaveAttribute(
      'role',
      'status',
    );
    const dispositivos = await repo.colecao('dispositivos').todosDoUsuario();
    expect(dispositivos.every((d) => d.confianca === 'a_confirmar')).toBe(true);
  });

  it('HTML sem texto: vale o texto puro; nada nos dois, a área continua', async () => {
    const { repo } = await repositorioDeTeste();
    await abrir(repo);

    colar({ html: '<img src="x.png">', texto: '   ' });
    expect(await screen.findByRole('alert')).toHaveTextContent('O que foi colado não tem texto.');
    expect(screen.getByLabelText('Cole aqui a lei')).toBeInTheDocument();

    colar({ html: '<script>alert(1)</script>', texto: LEP_TEXTO });
    await sumario();
    const [pendente] = await rascunhosPendentes(repo);
    expect(pendente?.versao.origemEntrada).toBe('texto');
  });

  it('sem artigos: "Não consegui identificar artigos" com as duas saídas', async () => {
    const { repo } = await repositorioDeTeste();
    const usuario = await abrir(repo);

    colar({ html: '<p>Um texto qualquer que não é lei.</p>' });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não consegui identificar artigos neste texto.',
    );
    expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Guardar para editar depois' })).toHaveAttribute(
      'href',
      '#/biblioteca',
    );
    expect(await rascunhosPendentes(repo)).toHaveLength(1);

    await usuario.click(screen.getByRole('button', { name: 'Colar novamente da página' }));

    expect(await screen.findByLabelText('Cole aqui a lei')).toBeInTheDocument();
    expect(await rascunhosPendentes(repo)).toEqual([]);
    expect(window.location.hash).toBe('#/biblioteca/importar');
  });

  it('linha tachada: vira redação anterior (8.6), contada na estrutura, sem aviso de compilada', async () => {
    const { repo } = await repositorioDeTeste();
    await abrir(repo);

    colar({
      html: LEP_HTML.replace(
        '<p>Art. 2º',
        '<p><strike>Art. 2º A jurisdição será exercida pelo juiz.</strike></p><p>Art. 2º',
      ),
    });

    await sumario();
    expect(screen.queryByText(/parece a compilada/)).toBeNull();
    expect(screen.getByRole('region', { name: 'Estrutura encontrada' })).toHaveTextContent(
      'com 1 redação anterior (oculta na leitura).',
    );
    expect(screen.getByRole('region', { name: 'Ficou de fora' })).not.toHaveTextContent('tachada');
  });

  it('a mesma norma colada duas vezes: retomar o rascunho ou ver a publicada, sem criar outra', async () => {
    const { repo } = await repositorioDeTeste();
    const usuario = await abrir(repo);
    colar({ html: LEP_HTML });
    await sumario();
    await usuario.click(screen.getByRole('link', { name: 'Biblioteca' }));
    await usuario.click(await screen.findByRole('link', { name: 'Importar norma' }));

    colar({ html: LEP_HTML });

    expect(
      await screen.findByText(
        'Este texto já foi colado: a importação de Lei nº 7.210/1984 está pendente de revisão.',
      ),
    ).toBeVisible();
    await usuario.click(screen.getByRole('button', { name: 'Retomar a importação' }));
    await sumario();
    expect(await rascunhosPendentes(repo)).toHaveLength(1);
    await usuario.click(screen.getByRole('button', { name: 'Publicar' }));
    await screen.findByRole('heading', { level: 1, name: 'Biblioteca' });

    await usuario.click(await screen.findByRole('link', { name: 'Importar norma' }));
    colar({ html: LEP_HTML });
    expect(
      await screen.findByText('Lei nº 7.210/1984 já está na Biblioteca, com este mesmo texto.'),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ver na Biblioteca' })).toHaveAttribute(
      'href',
      '#/biblioteca',
    );
    // A norma já publicada abre para leitura (9.6).
    const [norma] = await repo.colecao('normas').todosDoUsuario();
    expect(screen.getByRole('link', { name: 'Ler a norma' })).toHaveAttribute(
      'href',
      `#/biblioteca/normas/${norma?.id ?? ''}`,
    );
    await usuario.click(screen.getByRole('button', { name: 'Colar outra norma' }));
    expect(screen.getByLabelText('Cole aqui a lei')).toBeInTheDocument();
    expect(await repo.colecao('normas').todosDoUsuario()).toHaveLength(1);
  });
});

describe('Importar: retomar e publicar o rascunho (9.5)', () => {
  const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
  const LEI: Bloco[] = [
    linha('LEI Nº 8.069, DE 13 DE JULHO DE 1990.'),
    linha('Dispõe sobre o Estatuto da Criança e do Adolescente.'),
    linha('Art. 1º Esta Lei dispõe sobre a proteção integral.'),
    linha('Art. 2º Considera-se criança a pessoa até doze anos.'),
  ];

  it('pela rota do rascunho: retoma, e o título em branco não publica', async () => {
    const { repo } = await repositorioDeTeste();
    const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const usuario = await abrir(repo, `/biblioteca/importar/${versao.id}`);

    await sumario();
    const titulo = screen.getByRole('textbox', { name: 'Título curto' });
    expect(titulo).toHaveValue('Lei nº 8.069/1990');
    await usuario.clear(titulo);
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();
    expect(screen.getByText('Para publicar: dê um título curto.')).toBeInTheDocument();
    await usuario.type(titulo, 'ECA');

    const publicar = screen.getByRole('button', { name: 'Publicar' });
    fireEvent.click(publicar);
    // Trava contra clique duplo: desabilitado já no primeiro clique.
    expect(screen.getByRole('button', { name: 'Publicando…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Publicando…' }));

    expect(await screen.findByText('ECA publicada.')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('conflito bloqueia: a lista do que corrigir e o Publicar desabilitado', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma, versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const art2 = (await repo.colecao('dispositivos').todosDoUsuario()).find(
      (d) => d.normaId === norma.id && d.endereco === 'art2',
    );
    await repo.colecao('dispositivos').atualizar(art2!.id, { endereco: 'art1' });
    await abrir(repo, `/biblioteca/importar/${versao.id}`);

    await sumario();
    expect(screen.getByRole('alert')).toHaveTextContent('Ainda não dá para publicar:');
    expect(screen.getByRole('alert')).toHaveTextContent('O endereço art1 aparece 2 vezes');
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();
  });

  it('outra aba publicou antes: publicar mostra o motivo, sem duplicar nada', async () => {
    const { repo } = await repositorioDeTeste();
    const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const usuario = await abrir(repo, `/biblioteca/importar/${versao.id}`);
    await sumario();

    await publicarVersao(repo, versao.id);
    await usuario.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta versão já foi publicada; não é mais rascunho.',
    );
    expect(screen.getByRole('link', { name: 'Voltar à Biblioteca' })).toBeInTheDocument();
  });

  it('rascunho que não existe mais: o motivo e a volta', async () => {
    const { repo } = await repositorioDeTeste();
    await abrir(repo, `/biblioteca/importar/${repo.ctx.novoId()}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('Este rascunho não existe mais.');
  });

  it('descartar o rascunho pede confirmação e volta à Biblioteca com o aviso', async () => {
    const { repo } = await repositorioDeTeste();
    const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const usuario = await abrir(repo, `/biblioteca/importar/${versao.id}`);
    await sumario();

    await usuario.click(screen.getByRole('button', { name: 'Descartar rascunho' }));
    const dialogo = screen.getByRole('dialog', {
      name: 'Descartar a importação de Lei nº 8.069/1990?',
    });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Descartar' }));

    expect(await screen.findByText('Importação de Lei nº 8.069/1990 descartada.')).toHaveAttribute(
      'role',
      'status',
    );
    expect(await screen.findByRole('heading', { name: 'Nenhuma norma ainda' })).toBeInTheDocument();
    await waitFor(async () => {
      expect(await rascunhosPendentes(repo)).toEqual([]);
    });
  });
});
