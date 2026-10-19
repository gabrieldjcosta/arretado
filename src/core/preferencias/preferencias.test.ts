import { LEMBRETE_MAX, Preferencias } from '../modelo';
import { Repositorio } from '../persistencia';
import { repositorioDeTeste } from '../../testes/repositorio';
import { alterarPreferencias, cotaDiaria, obterPreferencias } from './index';

describe('preferências (1.7)', () => {
  it('nascem com o padrão', async () => {
    const { repo } = await repositorioDeTeste();
    expect(await obterPreferencias(repo)).toMatchObject({ tema: 'sistema', retencaoSnapshots: 5 });
  });

  it('persistem após reabrir', async () => {
    const nomeBanco = `pref-${Math.random()}`;
    const a = await Repositorio.abrir({ nomeBanco });
    await alterarPreferencias(a, { tema: 'escuro', tamanhoFonte: 20 });
    a.fechar();
    const b = await Repositorio.abrir({ nomeBanco });
    expect(await obterPreferencias(b)).toMatchObject({ tema: 'escuro', tamanhoFonte: 20 });
  });

  it('rejeitam valor fora do tipo', async () => {
    const { repo } = await repositorioDeTeste();
    await expect(alterarPreferencias(repo, { retencaoSnapshots: 2 })).rejects.toThrow();
  });

  it('são recriadas se apagadas', async () => {
    const { repo } = await repositorioDeTeste();
    await repo.colecao('preferencias').excluir((await obterPreferencias(repo)).id);
    expect((await obterPreferencias(repo)).tema).toBe('sistema');
  });

  it('a preferência anterior à 9.8, sem `destacarCondicionantesEPrazos`, continua válida e muda sem migração', async () => {
    const { repo } = await repositorioDeTeste();
    const antiga = await obterPreferencias(repo);
    // O registro que já existe no aparelho não tem o campo: ausente é desligado.
    expect(antiga).not.toHaveProperty('destacarCondicionantesEPrazos');
    expect(Preferencias.safeParse(antiga).success).toBe(true);
    expect((await alterarPreferencias(repo, { tamanhoFonte: 20 })).tamanhoFonte).toBe(20);
    const ligada = await alterarPreferencias(repo, { destacarCondicionantesEPrazos: true });
    expect(ligada.destacarCondicionantesEPrazos).toBe(true);
    expect(
      Preferencias.safeParse({ ...ligada, destacarCondicionantesEPrazos: 'sim' }).success,
    ).toBe(false);
  });

  it('cota diária: ausente é 10, muda sem migração e só aceita inteiros de 5 a 100 (fatia 3)', async () => {
    const { repo } = await repositorioDeTeste();
    const antiga = await obterPreferencias(repo);
    expect(antiga).not.toHaveProperty('cotaDiaria');
    expect(cotaDiaria(antiga)).toBe(10);
    const nova = await alterarPreferencias(repo, { cotaDiaria: 25 });
    expect(cotaDiaria(nova)).toBe(25);
    for (const ruim of [4, 101, 7.5, '10'])
      expect(Preferencias.safeParse({ ...nova, cotaDiaria: ruim }).success).toBe(false);
    expect(Preferencias.safeParse({ ...nova, cotaDiaria: 5 }).success).toBe(true);
    expect(Preferencias.safeParse({ ...nova, cotaDiaria: 100 }).success).toBe(true);
  });

  it('régua de leitura: ausente é desligada, muda sem migração e só aceita booleano (fatia 4)', async () => {
    const { repo } = await repositorioDeTeste();
    const antiga = await obterPreferencias(repo);
    expect(antiga).not.toHaveProperty('reguaDeLeitura');
    const ligada = await alterarPreferencias(repo, { reguaDeLeitura: true });
    expect(ligada.reguaDeLeitura).toBe(true);
    expect(Preferencias.safeParse({ ...ligada, reguaDeLeitura: 'sim' }).success).toBe(false);
  });

  it('lente do foco e espiada dos vizinhos: ausentes são os padrões, mudam sem migração e validam (palco)', async () => {
    const { repo } = await repositorioDeTeste();
    const antiga = await obterPreferencias(repo);
    expect(antiga).not.toHaveProperty('lenteDoFoco');
    expect(antiga).not.toHaveProperty('espiadaDosVizinhos');
    const nova = await alterarPreferencias(repo, {
      lenteDoFoco: 'corrido',
      espiadaDosVizinhos: true,
    });
    expect(nova.lenteDoFoco).toBe('corrido');
    expect(nova.espiadaDosVizinhos).toBe(true);
    expect(Preferencias.safeParse({ ...nova, lenteDoFoco: 'janela' }).success).toBe(false);
    expect(Preferencias.safeParse({ ...nova, espiadaDosVizinhos: 'sim' }).success).toBe(false);
  });

  it('"Para lembrar": ausente é vazio, muda sem migração e respeita o tamanho máximo (P7b)', async () => {
    const { repo } = await repositorioDeTeste();
    const antiga = await obterPreferencias(repo);
    expect(antiga).not.toHaveProperty('lembrete');
    const nova = await alterarPreferencias(repo, { lembrete: 'Pedir o livro de Processo Penal' });
    expect(nova.lembrete).toBe('Pedir o livro de Processo Penal');
    const vazia = await alterarPreferencias(repo, { lembrete: '' });
    expect(vazia.lembrete).toBe('');
    expect(Preferencias.safeParse({ ...nova, lembrete: 'a'.repeat(LEMBRETE_MAX) }).success).toBe(
      true,
    );
    expect(
      Preferencias.safeParse({ ...nova, lembrete: 'a'.repeat(LEMBRETE_MAX + 1) }).success,
    ).toBe(false);
    expect(Preferencias.safeParse({ ...nova, lembrete: 12 }).success).toBe(false);
  });
});
