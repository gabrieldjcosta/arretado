import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

const CSV =
  'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\nExecução Penal;2;Remição;Média\n';

const RESPOSTA_IA_COM_CERCAS = `\`\`\`
Disciplina;Código;Ponto;Faixa
Execução Penal;1;Progressão de regime;Alta
Execução Penal;2;Remição;Média
\`\`\``;

const RESPOSTA_IA_COM_CERCAS_CSV = `\`\`\`csv
Disciplina;Código;Ponto;Faixa
Execução Penal;1;Progressão de regime;Alta
Execução Penal;2;Remição;Média
\`\`\``;

const PROMPT_ESPERADO = `Transforme o conteúdo programático do edital abaixo numa tabela para eu importar numa plataforma de estudo.

Regras:
1. Use só o que está no texto do edital. Não invente, não resuma, não junte nem acrescente assuntos.
2. Uma linha por ponto do conteúdo programático. Se um ponto tiver subitens numerados (por exemplo 3.1, 3.2), cada subitem vira uma linha.
3. Três colunas, nesta ordem, separadas por ponto e vírgula: Disciplina;Ponto;Código
   - Disciplina: o nome da matéria como aparece no edital.
   - Ponto: o texto completo do assunto, sem a numeração.
   - Código: a numeração do edital (por exemplo 3.2); deixe vazio se não houver.
4. A primeira linha é o cabeçalho: Disciplina;Ponto;Código
5. Se algum texto tiver ponto e vírgula, coloque esse campo entre aspas duplas.
6. Se o edital tiver mais de um cargo, use só o conteúdo do cargo: [escreva aqui o seu cargo].
7. Responda só com a tabela, dentro de um bloco de código, sem comentário antes ou depois.

Conteúdo programático do edital:
[cole aqui]`;

describe('Plano: importar pontos (6.10)', () => {
  it('importa com prévia, lista por disciplina e oferece o vínculo no erro', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/plano';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);

    await usuario.upload(
      await screen.findByLabelText('Arquivo CSV'),
      new File([CSV], 'ciclo.csv', { type: 'text/csv' }),
    );
    expect(await screen.findByText('2 pontos em 1 disciplinas.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Importar pontos' }));

    const secao = await screen.findByRole('region', { name: 'Execução Penal' });
    expect(within(secao).getByText('1. Progressão de regime')).toBeInTheDocument();
    expect(within(secao).getByText('Alta')).toBeInTheDocument();

    await usuario.click(screen.getByRole('link', { name: 'Registrar erro' }));
    // Ponto fora de "mais detalhes" (D25): opcional e lembrado.
    const ponto = await screen.findByLabelText('Ponto do edital (opcional)');
    expect(within(ponto).getByRole('option', { name: '2 Remição' })).toBeInTheDocument();
  });

  it('CSV sem as colunas mostra o que falta', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/plano';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);
    await usuario.upload(
      await screen.findByLabelText('Arquivo CSV'),
      new File(['a;b\n1;2'], 'x.csv'),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/Disciplina.*Ponto/);
  });
});

describe('Plano vazio e importação com IA (UI-C)', () => {
  it('mostra título acolhedor e os dois caminhos lado a lado', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/plano';
    render(<App abrir={() => Promise.resolve(repo)} />);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Monte seu plano do seu jeito' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Escolha o concurso e o app monta a Trilha/)).toBeInTheDocument();

    // Um começo só (27/10/2026): o mesmo "Escolher meu concurso" do Hoje e da Biblioteca.
    const escolher = screen.getByRole('link', { name: 'Escolher meu concurso' });
    expect(escolher).toHaveAttribute('href', '#/comecar');
    expect(escolher).toHaveClass('principal');

    const linkTrazer = screen.getByRole('link', { name: 'Trazer meu edital' });
    expect(linkTrazer).toHaveAttribute('href', '#importar-edital');

    // O passo a passo continua, como caminho secundário.
    const linkCatalogo = screen.getByRole('link', { name: 'Montar pelo catálogo' });
    expect(linkCatalogo).toHaveAttribute('href', '#/plano/onboarding');
  });

  it('copia o prompt exato para IA no clipboard', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/plano';
    const usuario = userEvent.setup();
    const spy = vi.spyOn(navigator.clipboard, 'writeText');

    render(<App abrir={() => Promise.resolve(repo)} />);

    const sumario = await screen.findByText('Não sabe montar a planilha?', { selector: 'summary' });
    await usuario.click(sumario);

    expect(screen.getByText(/Transforme o conteúdo programático do edital/)).toBeInTheDocument();

    const botaoCopiar = screen.getByRole('button', { name: 'Copiar' });
    await usuario.click(botaoCopiar);

    expect(spy).toHaveBeenCalledWith(PROMPT_ESPERADO);
    expect(await navigator.clipboard.readText()).toBe(PROMPT_ESPERADO);
    spy.mockRestore();
  });

  it('colar o exemplo de resposta com cercas leva à mesma prévia que o arquivo equivalente', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/plano';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);

    const campoColar = await screen.findByLabelText('Ou cole o resultado da IA');
    await usuario.click(campoColar);
    await usuario.paste(RESPOSTA_IA_COM_CERCAS);

    await usuario.click(screen.getByRole('button', { name: 'Ler o texto colado' }));

    expect(await screen.findByText('2 pontos em 1 disciplinas.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Importar pontos' }));

    const secao = await screen.findByRole('region', { name: 'Execução Penal' });
    expect(within(secao).getByText('1. Progressão de regime')).toBeInTheDocument();
    expect(within(secao).getByText('Alta')).toBeInTheDocument();
  });

  it('aceita cerca de código com identificador de linguagem (```csv)', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/plano';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);

    const campoColar = await screen.findByLabelText('Ou cole o resultado da IA');
    await usuario.click(campoColar);
    await usuario.paste(RESPOSTA_IA_COM_CERCAS_CSV);

    await usuario.click(screen.getByRole('button', { name: 'Ler o texto colado' }));

    expect(await screen.findByText('2 pontos em 1 disciplinas.')).toBeInTheDocument();
  });

  it('texto colado inválido mostra a mesma mensagem de erro do arquivo', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/plano';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);

    const campoColar = await screen.findByLabelText('Ou cole o resultado da IA');
    await usuario.click(campoColar);
    await usuario.paste('```\na;b\n1;2\n```');
    await usuario.click(screen.getByRole('button', { name: 'Ler o texto colado' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Disciplina.*Ponto/);
  });

  it('texto colado vazio mostra mensagem de erro idêntica a arquivo vazio', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/plano';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);

    const botao = await screen.findByRole('button', { name: 'Ler o texto colado' });
    await usuario.click(botao);
    expect(await screen.findByRole('alert')).toHaveTextContent('O arquivo está vazio.');
  });

  it('quando o clipboard falha, seleciona o texto do prompt', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/plano';
    const usuario = userEvent.setup();
    const spy = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValue(new Error('Permissão negada'));

    render(<App abrir={() => Promise.resolve(repo)} />);

    const sumario = await screen.findByText('Não sabe montar a planilha?', { selector: 'summary' });
    await usuario.click(sumario);

    const botaoCopiar = screen.getByRole('button', { name: 'Copiar' });
    await usuario.click(botaoCopiar);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
