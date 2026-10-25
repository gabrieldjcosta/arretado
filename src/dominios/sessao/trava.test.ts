// Trava de escrita (posse de outro aparelho, D17) nas escritas automáticas e no que é só do aparelho.
import { describe, expect, it } from 'vitest';
import { repositorioDeTeste } from '../../testes/repositorio';
import { iniciarSessao, restaurarSessao } from './servico';
import { alterarPreferencias } from '../../core/preferencias';
import { sincroniza } from '../../core/sincronizacao';

const DIA = 24 * 60 * 60 * 1000;

describe('trava de escrita', () => {
  it('com Sessão aberta de ontem, o aparelho em leitura ainda carrega as telas de Sessão e Hoje', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await iniciarSessao(repo, {}); // ontem, ficou aberta (esqueceu de fechar)
    relogio.avancar(DIA);
    repo.bloquearEscrita('Outro aparelho está editando agora.'); // posse de outro + rede
    // O carregador `sessaoAberta` (Atual, Iniciar, Fechar, FaixaDaSessao, Hoje › Agora) só lê: a
    // escrita da "interrompida" fica para quando a posse voltar.
    await expect(restaurarSessao(repo)).resolves.toBeUndefined();
  });

  it('tema e tamanho da letra são do aparelho (nunca sincronizam) e passam pela trava', async () => {
    const { repo } = await repositorioDeTeste();
    repo.bloquearEscrita('Outro aparelho está editando agora.', { isenta: (e) => !sincroniza(e) });
    await expect(alterarPreferencias(repo, { tamanhoFonte: 20 })).resolves.toMatchObject({
      tamanhoFonte: 20,
    });
    await expect(alterarPreferencias(repo, { cotaDiaria: 5 })).rejects.toMatchObject({
      name: 'EscritaBloqueada',
    });
  });
});
