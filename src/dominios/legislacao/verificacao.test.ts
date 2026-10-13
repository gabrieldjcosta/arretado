import type { Bloco } from '../../core/seguranca/sanitizador';
import { repositorioDeTeste } from '../../testes/repositorio';
import { criarRascunho, publicarVersao } from './servico';
import {
  alvoDaVerificacao,
  compararComVersao,
  compararNotas,
  VerificacaoIndisponivel,
} from './verificacao';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const lei = (nota: string): Bloco[] => [
  linha('LEI Nº 1.234, DE 5 DE MAIO DE 2020.'),
  linha('Dispõe sobre o teste.'),
  linha(
    'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:',
  ),
  linha(`Art. 1º Esta Lei trata do teste. ${nota}`),
  linha('Art. 2º Vale desde já.'),
];
const BASE = lei('(Redação dada pela Lei nº 14.000, de 2021)');
const URL_OFICIAL = 'https://www.planalto.gov.br/ccivil_03/leis/l1234.htm';

async function publicada() {
  const { repo } = await repositorioDeTeste();
  const c = await criarRascunho(repo, {
    blocos: BASE,
    origemEntrada: 'url',
    urlOficial: URL_OFICIAL,
  });
  await publicarVersao(repo, c.versao.id);
  return { repo, normaId: c.norma.id, versaoId: c.versao.id };
}

describe('compararNotas', () => {
  it('ano primeiro, depois o número do ato', () => {
    expect(
      compararNotas({ lei: 'Lei nº 1', ano: 2022 }, { lei: 'Lei nº 99', ano: 2021 }),
    ).toBeGreaterThan(0);
    expect(
      compararNotas({ lei: 'Lei nº 14.001', ano: 2021 }, { lei: 'Lei nº 14.000', ano: 2021 }),
    ).toBeGreaterThan(0);
    expect(
      compararNotas({ lei: 'Lei nº 14.000', ano: 2021 }, { lei: 'Lei nº 14.000', ano: 2021 }),
    ).toBe(0);
  });
});

describe('verificar atualização (6b)', () => {
  it('fonte idêntica: igual', async () => {
    const { repo, normaId } = await publicada();
    const { versao } = await alvoDaVerificacao(repo, normaId);
    expect(await compararComVersao(versao, BASE)).toEqual({ tipo: 'igual' });
  });

  it('nota de lei mais nova: indício, com a registrada', async () => {
    const { repo, normaId } = await publicada();
    const { versao } = await alvoDaVerificacao(repo, normaId);
    const r = await compararComVersao(versao, lei('(Redação dada pela Lei nº 15.100, de 2023)'));
    expect(r).toEqual({
      tipo: 'indicio',
      nota: { lei: 'Lei nº 15.100', ano: 2023 },
      registrada: { lei: 'Lei nº 14.000', ano: 2021 },
    });
  });

  it('página diferente sem nota nova (ou com nota mais velha): sem indício', async () => {
    const { repo, normaId } = await publicada();
    const { versao } = await alvoDaVerificacao(repo, normaId);
    expect(await compararComVersao(versao, [...BASE, linha('Art. 3º Mais um.')])).toEqual({
      tipo: 'sem_indicio',
    });
    expect(
      await compararComVersao(versao, lei('(Redação dada pela Lei nº 13.000, de 2019)')),
    ).toEqual({
      tipo: 'sem_indicio',
    });
  });

  it('só lê: não cria versão nem muda a norma', async () => {
    const { repo, normaId, versaoId } = await publicada();
    const antes = await repo.colecao('versoesNorma').todosDoUsuario();
    const { versao } = await alvoDaVerificacao(repo, normaId);
    await compararComVersao(versao, lei('(Redação dada pela Lei nº 15.100, de 2023)'));
    expect(await repo.colecao('versoesNorma').todosDoUsuario()).toEqual(antes);
    expect((await repo.colecao('normas').obter(normaId))?.versaoVigenteId).toBe(versaoId);
  });

  it('sem endereço oficial ou sem versão vigente: indisponível', async () => {
    const { repo } = await repositorioDeTeste();
    const c = await criarRascunho(repo, { blocos: BASE, origemEntrada: 'html' });
    await expect(alvoDaVerificacao(repo, c.norma.id)).rejects.toMatchObject({
      motivo: 'sem_endereco',
    });
    const d = await criarRascunho(repo, {
      blocos: lei('(Redação dada pela Lei nº 9, de 2001)'),
      origemEntrada: 'url',
      urlOficial: URL_OFICIAL,
    });
    await expect(alvoDaVerificacao(repo, d.norma.id)).rejects.toBeInstanceOf(
      VerificacaoIndisponivel,
    );
    await expect(alvoDaVerificacao(repo, 'nao-existe')).rejects.toMatchObject({
      motivo: 'norma_inexistente',
    });
  });
});
