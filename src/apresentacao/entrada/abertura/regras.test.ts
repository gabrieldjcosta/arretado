import { alterarPreferencias, alteracoesDoPerfil } from '../../../core/preferencias';
import type { Repositorio } from '../../../core/persistencia';
import { encerrarSessao, iniciarSessao } from '../../../dominios/sessao/servico';
import { simularMovimento } from '../../../testes/movimento';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { lembrarDaEscrita } from '../../componentes/escrita/frequencia';
import { decidirNaAberturaDoApp, decidirOndeEscrever } from './regras';

const CHAVE = 'arretado:escrita-do-nome:v1';
const HOJE = '2026-10-20T12:00:00.000Z';

beforeEach(() => {
  window.localStorage.clear();
  // O setup semeia o Dia no futuro (aparelho que já viu a Abertura); aqui o nome ainda não foi escrito.
  window.localStorage.removeItem(CHAVE);
  simularMovimento('normal');
});

const guardado = () => window.localStorage.getItem(CHAVE);

describe('onde o nome se escreve nesta abertura (M2 do Zé)', () => {
  it('primeira vez no aparelho: a tela cheia, com o nome inteiro, e o Dia fica guardado', async () => {
    const { repo } = await repositorioDeTeste({ inicio: HOJE });
    expect(await decidirOndeEscrever(repo)).toEqual({
      onde: 'tela',
      escrita: 'completa',
      calmo: false,
    });
    expect(JSON.parse(guardado() ?? 'null')).toEqual({ dia: '2026-10-20' });
  });

  it('primeira abertura de outro Dia: a tela cheia, no modo curto', async () => {
    lembrarDaEscrita(new Date('2026-10-19T12:00:00Z'));
    const { repo } = await repositorioDeTeste({ inicio: HOJE });
    expect(await decidirOndeEscrever(repo)).toEqual({
      onde: 'tela',
      escrita: 'curta',
      calmo: false,
    });
    expect(JSON.parse(guardado() ?? 'null')).toEqual({ dia: '2026-10-20' });
  });

  it('demais aberturas do Dia: o cabeçalho, parado, sem nem ler os dados', async () => {
    lembrarDaEscrita(new Date('2026-10-20T08:00:00Z'));
    const antes = guardado();
    // Um repositório que não lê nada: se a decisão tocasse nos dados, quebraria.
    const repo = {
      ctx: { agora: () => new Date(HOJE) },
      colecao: () => {
        throw new Error('não era para ler');
      },
    } as unknown as Repositorio;
    expect(await decidirOndeEscrever(repo)).toEqual({ onde: 'cabecalho', escrita: 'parada' });
    expect(guardado()).toBe(antes);
  });

  it('movimento reduzido do sistema: o cabeçalho, parado, e a primeira vez continua guardada', async () => {
    simularMovimento('reduzido');
    const { repo } = await repositorioDeTeste({ inicio: HOJE });
    expect(await decidirOndeEscrever(repo)).toEqual({ onde: 'cabecalho', escrita: 'parada' });
    expect(guardado()).toBeNull();
  });

  it('perfil Calmo: a tela cheia só esmaece', async () => {
    const { repo } = await repositorioDeTeste({ inicio: HOJE });
    await alterarPreferencias(repo, { perfilDeEstudo: 'calmo', modoSoEstudo: false });
    expect(await decidirOndeEscrever(repo)).toEqual({
      onde: 'tela',
      escrita: 'completa',
      calmo: true,
    });
  });

  it('"só estudo" ligado: a tela cheia não abre e o cabeçalho escreve como antes, sem gastar o Dia', async () => {
    const { repo } = await repositorioDeTeste({ inicio: HOJE });
    await alterarPreferencias(repo, { modoSoEstudo: true });
    expect(await decidirOndeEscrever(repo)).toEqual({ onde: 'cabecalho', escrita: 'completa' });
    // Quem guarda o Dia é quem escreve (o `Marca`, ao começar): a decisão só lê.
    expect(guardado()).toBeNull();
  });

  it('aplicar o perfil Calmo (Conta › Perfis) liga o "só estudo": então cai na regra do cabeçalho', async () => {
    const { repo } = await repositorioDeTeste({ inicio: HOJE });
    await alterarPreferencias(repo, alteracoesDoPerfil({}, 'calmo'));
    expect(await decidirOndeEscrever(repo)).toEqual({ onde: 'cabecalho', escrita: 'completa' });
  });

  it('Sessão aberta: a tela cheia não abre; encerrada a Sessão, abre', async () => {
    lembrarDaEscrita(new Date('2026-10-19T12:00:00Z'));
    const { repo } = await repositorioDeTeste({ inicio: HOJE });
    const sessao = await iniciarSessao(repo, {});
    expect(await decidirOndeEscrever(repo)).toEqual({ onde: 'cabecalho', escrita: 'curta' });
    expect(JSON.parse(guardado() ?? 'null')).toEqual({ dia: '2026-10-19' });
    await encerrarSessao(repo, sessao.id);
    expect(await decidirOndeEscrever(repo)).toEqual({
      onde: 'tela',
      escrita: 'curta',
      calmo: false,
    });
  });

  it('se os dados não leem: o cabeçalho, que sabe esmaecer; nunca derruba o uso', async () => {
    const repo = {
      ctx: { agora: () => new Date(HOJE) },
      colecao: () => {
        throw new Error('sem banco');
      },
    } as unknown as Repositorio;
    expect(await decidirOndeEscrever(repo)).toEqual({ onde: 'cabecalho', escrita: 'completa' });
    expect(guardado()).toBeNull();
  });

  it('a decisão é uma por repositório: a segunda pergunta (StrictMode) recebe a mesma resposta', async () => {
    const { repo } = await repositorioDeTeste({ inicio: HOJE });
    const primeira = decidirNaAberturaDoApp(repo);
    const segunda = decidirNaAberturaDoApp(repo);
    expect(segunda).toBe(primeira);
    expect(await primeira).toEqual({ onde: 'tela', escrita: 'completa', calmo: false });
    // Sem a memória, esta leitura já veria o Dia guardado pela primeira e diria "parada".
    expect(await decidirNaAberturaDoApp(repo)).toEqual({
      onde: 'tela',
      escrita: 'completa',
      calmo: false,
    });
  });

  it('a decisão não lê o histórico, só as Sessões de hoje; uma Sessão aberta de outro Dia não pesa', async () => {
    lembrarDaEscrita(new Date('2026-10-19T12:00:00Z'));
    const { repo, relogio } = await repositorioDeTeste({ inicio: '2026-10-19T12:00:00.000Z' });
    await iniciarSessao(repo, {});
    relogio.avancar(24 * 60 * 60 * 1000);
    const lidas = [
      vi.spyOn(repo.colecao('sessoes'), 'todosDoUsuario'),
      vi.spyOn(repo.colecao('revisoes'), 'todosDoUsuario'),
      vi.spyOn(repo.colecao('revisoesFrase'), 'todosDoUsuario'),
      vi.spyOn(repo.colecao('dias'), 'todosDoUsuario'),
    ];
    expect(await decidirOndeEscrever(repo)).toEqual({
      onde: 'tela',
      escrita: 'curta',
      calmo: false,
    });
    for (const lida of lidas) expect(lida).not.toHaveBeenCalled();
  });

  it('Sessão pausada hoje também impede a tela cheia', async () => {
    lembrarDaEscrita(new Date('2026-10-19T12:00:00Z'));
    const { repo } = await repositorioDeTeste({ inicio: HOJE });
    const sessao = await iniciarSessao(repo, {});
    await repo.colecao('sessoes').atualizar(sessao.id, { estado: 'pausada' });
    expect(await decidirOndeEscrever(repo)).toEqual({ onde: 'cabecalho', escrita: 'curta' });
  });

  it('outra aba gastou a escrita enquanto os dados eram lidos: vale o que ela guardou e nada abre', async () => {
    lembrarDaEscrita(new Date('2026-10-19T12:00:00Z'));
    const { repo } = await repositorioDeTeste({ inicio: HOJE });
    // A decisão já leu "curta" e foi aos dados; a outra aba escreve o nome neste instante.
    const decisao = decidirOndeEscrever(repo);
    lembrarDaEscrita(new Date(HOJE));
    expect(await decisao).toEqual({ onde: 'cabecalho', escrita: 'parada' });
    expect(JSON.parse(guardado() ?? 'null')).toEqual({ dia: '2026-10-20' });
  });
});
