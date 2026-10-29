import { render, screen, waitFor } from '@testing-library/react';
import type { Repositorio } from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { FonteDeIncidencia } from '../../dominios/legislacao/incidencia-fonte';
import { abrirNorma } from '../../dominios/legislacao/leitor';
import { marcarLidoAte } from '../../dominios/legislacao/leituras';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';
import { ContextoFonteIncidencia } from '../dados/fonteIncidenciaContexto';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha('O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta a seguinte Lei:'),
  linha('Art. 1º A execução penal tem por objetivo efetivar as disposições de sentença.'),
  linha('Art. 2º A jurisdição penal será exercida pelos juízes ou tribunais.'),
];
const ACERVO = 'lei-federal-7210-1984';

async function lerALep(repo: Repositorio) {
  const { versao, norma } = await criarRascunho(repo, {
    blocos: LEI,
    origemEntrada: 'html',
    tituloCurto: 'LEP',
  });
  await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
  await repo
    .colecao('normas')
    .atualizar(norma.id, { origemAcervo: { id: ACERVO, versao: 1, hash: 'a'.repeat(64) } });
  const { nos } = await abrirNorma(repo, norma.id);
  const art1 = nos.find((n) => n.dispositivo.endereco === 'art1');
  if (!art1) throw new Error('sem art. 1º');
  await marcarLidoAte(repo, norma.id, art1.dispositivo.id);
}

describe('revisão #326: o Hoje não espera a rede do mapa', () => {
  it('rede que não responde (lie-fi): o Agora cai em "Continuar a leitura" em vez de ficar no esqueleto', async () => {
    const { repo } = await repositorioDeTeste();
    await lerALep(repo);
    // fetch que nunca resolve nem rejeita: sinal fraco, portal cativo.
    const pendurada = new FonteDeIncidencia(
      '/incidencia',
      () => new Promise<Response>(() => undefined),
      () => Promise.resolve(undefined),
    );
    window.location.hash = '#/';
    render(
      <ContextoFonteIncidencia.Provider value={pendurada}>
        <App abrir={() => Promise.resolve(repo)} />
      </ContextoFonteIncidencia.Provider>,
    );
    await screen.findByRole('navigation', { name: 'Áreas' });
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: 'Continuar a leitura' })).toBeInTheDocument();
      },
      { timeout: 2500 },
    );
  });
});

describe('revisão #326: ir= no Iniciar é entrada não confiável', () => {
  it.each([
    ['art3%26foco%3Dtexto', 'inclui outro parâmetro'],
    ['..%2F..%2Fx', 'caminho'],
    ['art3%23x', 'fragmento'],
  ])('rejeita ir=%s (%s) e abre o Leitor sem o trecho', async (ir) => {
    const NORMA = '11111111-1111-4111-8111-111111111111';
    const { repo } = await repositorioDeTeste();
    window.location.hash = `#/sessao/iniciar?tipo=leitura&id=${NORMA}&rotulo=LEP&ir=${ir}&origem=leitura_salva&direto=1`;
    render(<App abrir={() => Promise.resolve(repo)} />);
    await waitFor(() => {
      expect(window.location.hash).toBe(`#/biblioteca/normas/${NORMA}`);
    });
  });

  it('ir= em alvo que não é leitura é ignorado', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = `#/sessao/iniciar?tipo=revisao&rotulo=Cart%C3%B5es&ir=art3&origem=revisao_vencida&direto=1`;
    render(<App abrir={() => Promise.resolve(repo)} />);
    await waitFor(() => {
      expect(window.location.hash).toBe('#/recall/revisar');
    });
  });
});
