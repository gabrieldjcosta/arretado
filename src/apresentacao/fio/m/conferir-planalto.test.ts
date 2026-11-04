import { sanitizarHtml } from '../../../core/seguranca/sanitizador';
import { criarRascunho, publicarVersao } from '../../../dominios/legislacao/servico';
import { FalhaNaBusca, type PaginaBuscada } from '../../../integracoes/url/buscar';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { avisoDaConferencia, conferirComOPlanalto, type Conferencia } from './conferir-planalto';

const ENDERECO = 'https://www.planalto.gov.br/l1234.htm';
const ANTIGA = '(Redação dada pela Lei nº 14.000, de 2021)';

const pagina = (nota: string) =>
  `<p>LEI Nº 1.234, DE 5 DE MAIO DE 2020.</p><p>Dispõe sobre o teste.</p>` +
  `<p>O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:</p>` +
  `<p>Art. 1º Esta Lei trata do teste. ${nota}</p><p>Art. 2º Vale desde já.</p>`;

/** Uma norma publicada a partir da página de antes, com o endereço oficial que a conferência busca (ou sem ele). */
async function guardar(comEndereco = true) {
  const { repo } = await repositorioDeTeste();
  const c = await criarRascunho(repo, {
    blocos: sanitizarHtml(pagina(ANTIGA)).blocos,
    origemEntrada: 'url',
    ...(comEndereco ? { urlOficial: ENDERECO } : {}),
  });
  await publicarVersao(repo, c.versao.id);
  return { repo, normaId: c.norma.id };
}

const servir =
  (html: string) =>
  (endereco: string): Promise<PaginaBuscada> =>
    Promise.resolve({ html, urlFinal: endereco });

describe('a conferência de uma norma do Varal com o Planalto', () => {
  it('página igual à guardada: nada a decidir', async () => {
    const { repo, normaId } = await guardar();
    const c = await conferirComOPlanalto(repo, normaId, servir(pagina(ANTIGA)));
    expect(c).toEqual({ tipo: 'resultado', resultado: { tipo: 'igual' }, urlOficial: ENDERECO });
    expect(avisoDaConferencia('LEP', c)).toBe(
      'LEP: o texto guardado é igual ao da página oficial.',
    );
  });

  it('busca o endereço oficial guardado na norma', async () => {
    const { repo, normaId } = await guardar();
    const buscar = vi.fn(servir(pagina(ANTIGA)));
    await conferirComOPlanalto(repo, normaId, buscar);
    expect(buscar).toHaveBeenCalledExactlyOnceWith(ENDERECO);
  });

  it('página diferente, sem nota de vigência mais nova: só formatação', async () => {
    const { repo, normaId } = await guardar();
    const c = await conferirComOPlanalto(
      repo,
      normaId,
      servir(pagina(ANTIGA).replace('Vale desde já.', 'Vale desde já mesmo.')),
    );
    expect(c).toMatchObject({ tipo: 'resultado', resultado: { tipo: 'sem_indicio' } });
    expect(avisoDaConferencia('LEP', c)).toBe(
      'LEP: nenhuma alteração de vigência na página oficial.',
    );
  });

  it('nota mais nova: há indício, o aviso curto não vale (a folha abre) e o texto não muda', async () => {
    const { repo, normaId } = await guardar();
    const versoesAntes = await repo.colecao('versoesNorma').todosDoUsuario();
    const c = await conferirComOPlanalto(
      repo,
      normaId,
      servir(pagina('(Redação dada pela Lei nº 15.100, de 2023)')),
    );
    expect(c).toMatchObject({
      tipo: 'resultado',
      resultado: {
        tipo: 'indicio',
        nota: { lei: 'Lei nº 15.100', ano: 2023 },
        registrada: { lei: 'Lei nº 14.000', ano: 2021 },
      },
    });
    expect(avisoDaConferencia('LEP', c)).toBeUndefined();
    // Só lê: nenhuma versão nova nasce, quem decide é a pessoa (D16).
    expect(await repo.colecao('versoesNorma').todosDoUsuario()).toHaveLength(versoesAntes.length);
  });

  it('norma sem endereço oficial: diz isso, sem buscar nada', async () => {
    const { repo, normaId } = await guardar(false);
    const buscar = vi.fn(servir(pagina(ANTIGA)));
    const c = await conferirComOPlanalto(repo, normaId, buscar);
    expect(c).toEqual({
      tipo: 'falha',
      mensagem: 'Esta norma não tem endereço oficial guardado.',
    });
    expect(buscar).not.toHaveBeenCalled();
  });

  it('a busca que falha vira uma frase, e a norma continua como está', async () => {
    const { repo, normaId } = await guardar();
    const c = await conferirComOPlanalto(repo, normaId, () =>
      Promise.reject(new FalhaNaBusca('sem rede', 'rede')),
    );
    expect(c).toEqual({
      tipo: 'falha',
      mensagem: 'Não deu para conferir agora. A norma continua como está.',
    });
    expect(avisoDaConferencia('LEP', c)).toBe(
      'Não deu para conferir agora. A norma continua como está.',
    );
  });

  it('uma página sem texto não vale como resposta', async () => {
    const { repo, normaId } = await guardar();
    const c = await conferirComOPlanalto(repo, normaId, servir('<html><body></body></html>'));
    expect(c.tipo).toBe('falha');
  });

  it('uma norma que não existe também vira frase', async () => {
    const { repo } = await repositorioDeTeste();
    const c = await conferirComOPlanalto(repo, 'nao-existe', servir(pagina(ANTIGA)));
    expect(c.tipo).toBe('falha');
  });
});

describe('o aviso curto da conferência', () => {
  it('a falha mostra a própria frase', () => {
    const falha: Conferencia = { tipo: 'falha', mensagem: 'Algo deu errado.' };
    expect(avisoDaConferencia('LEP', falha)).toBe('Algo deu errado.');
  });
});
