import { strFromU8, unzipSync } from 'fflate';
import { exportarPacote, PacoteRecusado, restaurarSnapshot } from '../../core/pacote';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  abrirCopiaDaNuvem,
  guardarCopiaNaNuvem,
  listarCopiasNaNuvem,
  MANTER_NA_NUVEM,
  nomeDaCopia,
  preverUsoDaCopia,
  separarCopiaDaNuvem,
  usarCopiaDaNuvem,
} from './backup-nuvem';
import { FalhaDeConta, ServicoDeContaFalso } from '.';

const UID = '77777777-7777-4777-8777-777777777777';
const FRASE = 'cavalo bateria grampo correto';
const CONHECIDA = 'Progressão de regime exige um sexto da pena cumprida.';
// Iterações mínimas aceitas pelo formato: o teste não precisa da lentidão de produção.
const RAPIDO = { iteracoes: 1_000 };

const ERRO = { resultado: 'errou' as const, oQueFoi: 'Prazo do art. 112', status: 'aberto' as const };

async function montar() {
  const ctx = await repositorioDeTeste({ usuarioId: UID });
  await ctx.repo.colecao('erros').criar({ ...ERRO, fraseCorreta: CONHECIDA });
  const servico = new ServicoDeContaFalso({ sessao: { uid: UID, email: 'a@exemplo.com' } });
  return { ...ctx, servico };
}

const frases = async (repo: Awaited<ReturnType<typeof montar>>['repo']) =>
  (await repo.colecao('erros').todosDoUsuario())
    .filter((e) => !e.excluidoEm)
    .map((e) => e.fraseCorreta)
    .sort();

function contem(bytes: Uint8Array, texto: string): boolean {
  return Buffer.from(bytes).includes(Buffer.from(texto, 'utf8'));
}

describe('cópia cifrada na nuvem (F4-A, A6)', () => {
  it('nome segue backups/<uid>/AAAA-MM-DDTHH-MM-SS-<hash8>.arretado', () => {
    expect(nomeDaCopia(new Date('2026-10-18T09:05:07.123Z'), 'abcdef0123456789')).toBe(
      '2026-10-18T09-05-07-abcdef01.arretado',
    );
  });

  it('bytes enviados não contêm texto claro do estudo nem a frase', async () => {
    const { repo, servico } = await montar();
    // Controle: sem cifra, a frase conhecida aparece no JSON de dentro do pacote.
    const aberto = unzipSync((await exportarPacote(repo)).bytes);
    expect(strFromU8(aberto['dados/erros.json']!)).toContain(CONHECIDA);

    const { nome } = await guardarCopiaNaNuvem(repo, servico, FRASE, RAPIDO);
    const enviados = servico.copias.get(`${UID}/${nome}`)!;
    expect(contem(enviados, CONHECIDA)).toBe(false);
    expect(contem(enviados, FRASE)).toBe(false);
    // O zip de fora tem só o cabeçalho da cifra e o conteúdo opaco (sem contagens nem identidade).
    const fora = unzipSync(enviados);
    expect(Object.keys(fora).sort()).toEqual(['conteudo.cifrado', 'manifesto.json']);
    const cabecalho = strFromU8(fora['manifesto.json']!);
    expect(cabecalho).not.toContain(UID);
    expect(cabecalho).not.toContain('contagens');
    expect(contem(fora['conteudo.cifrado']!, CONHECIDA)).toBe(false);
  });

  it('frase errada não aplica nada', async () => {
    const { repo, servico } = await montar();
    const { nome } = await guardarCopiaNaNuvem(repo, servico, FRASE, RAPIDO);
    await repo.colecao('erros').criar({ ...ERRO, fraseCorreta: 'Depois da cópia.' });
    const antes = await frases(repo);

    await expect(abrirCopiaDaNuvem(servico, nome, 'frase errada')).rejects.toMatchObject({
      motivo: 'senha_ou_arquivo_invalido',
    });
    await expect(abrirCopiaDaNuvem(servico, nome, 'frase errada')).rejects.toBeInstanceOf(
      PacoteRecusado,
    );
    expect(await frases(repo)).toEqual(antes);
    expect(await repo.colecao('snapshots').todosDoUsuario()).toHaveLength(0);
  });

  it('prévia antes de aplicar: prever não escreve; usar exige a prévia deste pacote', async () => {
    const { repo, servico } = await montar();
    const { nome } = await guardarCopiaNaNuvem(repo, servico, FRASE, RAPIDO);
    await repo.colecao('erros').criar({ ...ERRO, fraseCorreta: 'Depois da cópia.' });
    const antes = await frases(repo);

    const pacote = await abrirCopiaDaNuvem(servico, nome, FRASE);
    const previa = await preverUsoDaCopia(repo, pacote);
    expect(previa.modo).toBe(6);
    expect(previa.porColecao.erros?.excluir).toBe(1);
    expect(await frases(repo)).toEqual(antes);

    // Prévia de outro pacote não serve para este.
    const { nome: outro } = await guardarCopiaNaNuvem(repo, servico, FRASE, RAPIDO);
    const outroPacote = await abrirCopiaDaNuvem(servico, outro, FRASE);
    await expect(usarCopiaDaNuvem(repo, outroPacote, previa)).rejects.toThrow();
    expect(await frases(repo)).toEqual(antes);
  });

  it('usar a cópia da nuvem faz snapshot do local antes de substituir', async () => {
    const { repo, servico } = await montar();
    const { nome } = await guardarCopiaNaNuvem(repo, servico, FRASE, RAPIDO);
    await repo.colecao('erros').criar({ ...ERRO, fraseCorreta: 'Depois da cópia.' });
    const local = await frases(repo);

    const pacote = await abrirCopiaDaNuvem(servico, nome, FRASE);
    const resultado = await usarCopiaDaNuvem(repo, pacote, await preverUsoDaCopia(repo, pacote));
    expect(await frases(resultado.repo)).toEqual([CONHECIDA]);

    const snapshots = await resultado.repo.colecao('snapshots').todosDoUsuario();
    expect(snapshots).toHaveLength(1);
    expect(resultado.log.snapshotId).toBe(snapshots[0]!.id);
    // O snapshot guarda exatamente o local de antes: dá para voltar.
    const volta = await restaurarSnapshot(resultado.repo, snapshots[0]!.id);
    expect(await frases(volta.repo)).toEqual(local);
  });

  it('importar para espaço separado não toca no local', async () => {
    const { repo, servico } = await montar();
    const { nome } = await guardarCopiaNaNuvem(repo, servico, FRASE, RAPIDO);
    await repo.colecao('erros').criar({ ...ERRO, fraseCorreta: 'Depois da cópia.' });
    const antes = await frases(repo);

    const pacote = await abrirCopiaDaNuvem(servico, nome, FRASE);
    const { espaco } = await separarCopiaDaNuvem(repo, pacote, 'Cópia da nuvem');
    expect(espaco.nome).toBe('Cópia da nuvem');
    expect(await frases(repo)).toEqual(antes);
    expect(await repo.colecao('snapshots').todosDoUsuario()).toHaveLength(0);
  });

  it(`mantém só as ${String(MANTER_NA_NUVEM)} últimas e apaga a mais antiga depois do envio`, async () => {
    const { repo, relogio, servico } = await montar();
    const nomes: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      nomes.push((await guardarCopiaNaNuvem(repo, servico, FRASE, RAPIDO)).nome);
      relogio.avancar(60_000);
    }
    const lista = await listarCopiasNaNuvem(servico);
    expect(lista.map((c) => c.nome)).toEqual([nomes[3], nomes[2], nomes[1]]);
    // A mais antiga só sai depois que a nova foi confirmada.
    const ops = servico.operacoesDeCopia;
    expect(ops.indexOf(`apagar:${nomes[0]!}`)).toBeGreaterThan(ops.indexOf(`enviar:${nomes[3]!}`));
  });

  it('envio interrompido não apaga a anterior', async () => {
    const { repo, relogio, servico } = await montar();
    for (let i = 0; i < MANTER_NA_NUVEM; i += 1) {
      await guardarCopiaNaNuvem(repo, servico, FRASE, RAPIDO);
      relogio.avancar(60_000);
    }
    const antes = (await listarCopiasNaNuvem(servico)).map((c) => c.nome);

    servico.falharProximoEnvio = true;
    await expect(guardarCopiaNaNuvem(repo, servico, FRASE, RAPIDO)).rejects.toBeInstanceOf(
      FalhaDeConta,
    );
    expect((await listarCopiasNaNuvem(servico)).map((c) => c.nome)).toEqual(antes);
    expect(servico.operacoesDeCopia.some((o) => o.startsWith('apagar:'))).toBe(false);
  });

  it('sem rede: listar recusa como sem-rede, sem tocar no local', async () => {
    const { repo } = await montar();
    const servico = new ServicoDeContaFalso({
      sessao: { uid: UID, email: 'a@exemplo.com' },
      semRede: true,
    });
    await expect(listarCopiasNaNuvem(servico)).rejects.toMatchObject({ motivo: 'sem-rede' });
    await expect(guardarCopiaNaNuvem(repo, servico, FRASE, RAPIDO)).rejects.toMatchObject({
      motivo: 'sem-rede',
    });
  });

  it('frase vazia não sai do aparelho', async () => {
    const { repo, servico } = await montar();
    await expect(guardarCopiaNaNuvem(repo, servico, '', RAPIDO)).rejects.toThrow();
    expect(servico.operacoesDeCopia).toHaveLength(0);
  });
});
