import type { Bloco } from '../../core/seguranca/sanitizador';
import type { Repositorio } from '../../core/persistencia';
import { repositorioDeTeste } from '../../testes/repositorio';
import { abrirNorma, lerJanela } from './leitor';
import {
  ancorar,
  criarGrifo,
  criarNota,
  editarNota,
  MarcacaoInvalida,
  marcacoesDaNorma,
  mudarCor,
  removerMarcacao,
} from './marcacoes';
import { criarRascunho, publicarVersao } from './servico';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha('Art. 1º A execução penal tem por objetivo efetivar as disposições de sentença.'),
  linha('Art. 2º A jurisdição penal será exercida.'),
];

async function publicada(repo: Repositorio) {
  const { versao, norma } = await criarRascunho(repo, {
    blocos: LEI,
    origemEntrada: 'html',
    tituloCurto: 'LEP',
  });
  await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
  const aberta = await abrirNorma(repo, norma.id);
  const itens = await lerJanela(repo, aberta, { inicio: 0, quantidade: 50 });
  const doEndereco = (endereco: string) => {
    const item = itens.find((i) => i.dispositivo.endereco === endereco);
    if (!item?.texto) throw new Error(`sem ${endereco}`);
    return {
      dispositivoId: item.dispositivo.id,
      texto: item.texto.trechos.map((t) => t.texto).join(''),
    };
  };
  return { normaId: norma.id, versaoId: aberta.versao.id, doEndereco };
}

describe('marcações: grifos e notas (11.4)', () => {
  it('grifa pelo texto gravado: offsets, texto da âncora e status "valida"', async () => {
    const { repo } = await repositorioDeTeste();
    const { normaId, versaoId, doEndereco } = await publicada(repo);
    const art1 = doEndereco('art1');
    const inicio = art1.texto.indexOf('execução penal');
    const grifo = await criarGrifo(
      repo,
      { normaId, versaoId, dispositivoId: art1.dispositivoId, inicio, fim: inicio + 14 },
      2,
    );
    expect(grifo).toMatchObject({
      tipo: 'grifo',
      cor: 2,
      versaoId,
      status: 'valida',
      ancora: { texto: 'execução penal', inicio, fim: inicio + 14 },
    });
    expect(grifo.nota).toBeUndefined();
  });

  it('tira os espaços das pontas, aceita a seleção de trás para frente e recusa o vazio', () => {
    const texto = 'A execução penal tem';
    expect(ancorar(texto, 1, 11)).toEqual({ texto: 'execução', inicio: 2, fim: 10 });
    expect(ancorar(texto, 10, 2)).toEqual({ texto: 'execução', inicio: 2, fim: 10 });
    // Fora do texto: corta nele.
    expect(ancorar(texto, 17, 99)).toEqual({ texto: 'tem', inicio: 17, fim: 20 });
    expect(() => ancorar(texto, 1, 2)).toThrow(MarcacaoInvalida);
    expect(() => ancorar(texto, 5, 5)).toThrow('Selecione um trecho do texto.');
    expect(() => ancorar('a'.repeat(6000), 0, 5001)).toThrow(/longo demais/);
    expect(ancorar('a'.repeat(6000), 0, 5000).fim).toBe(5000);
  });

  it('nota: cria, edita e recusa vazia; a cor é só do grifo e a nota só da nota', async () => {
    const { repo } = await repositorioDeTeste();
    const { normaId, versaoId, doEndereco } = await publicada(repo);
    const art2 = doEndereco('art2');
    const trecho = { normaId, versaoId, dispositivoId: art2.dispositivoId, inicio: 0, fim: 13 };
    await expect(criarNota(repo, trecho, '   ')).rejects.toThrow('Escreva a nota.');
    const nota = await criarNota(repo, trecho, '  Competência: art. 65.  ');
    expect(nota).toMatchObject({ tipo: 'nota', nota: 'Competência: art. 65.' });
    expect(nota.cor).toBeUndefined();
    expect(nota.ancora.texto).toBe('A jurisdição');

    expect((await editarNota(repo, nota.id, 'Juiz da execução')).nota).toBe('Juiz da execução');
    await expect(editarNota(repo, nota.id, '')).rejects.toThrow('Escreva a nota.');
    await expect(mudarCor(repo, nota.id, 1)).rejects.toMatchObject({ motivo: 'tipo_errado' });

    const grifo = await criarGrifo(repo, trecho, 1);
    expect((await mudarCor(repo, grifo.id, 3)).cor).toBe(3);
    await expect(editarNota(repo, grifo.id, 'x')).rejects.toMatchObject({ motivo: 'tipo_errado' });
  });

  it('remove (exclusão lógica) e lê por norma e versão, por dispositivo, na ordem de criação', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const { normaId, versaoId, doEndereco } = await publicada(repo);
    const art1 = doEndereco('art1');
    const art2 = doEndereco('art2');
    const t1 = { normaId, versaoId, dispositivoId: art1.dispositivoId, inicio: 0, fim: 10 };
    const primeiro = await criarGrifo(repo, t1, 1);
    relogio.avancar(1000);
    const segundo = await criarGrifo(repo, { ...t1, inicio: 4, fim: 20 }, 3);
    relogio.avancar(1000);
    const nota = await criarNota(repo, { ...t1, dispositivoId: art2.dispositivoId }, 'n');
    // Mudar a cor do mais antigo não o põe por cima.
    relogio.avancar(1000);
    await mudarCor(repo, primeiro.id, 2);

    const porDispositivo = await marcacoesDaNorma(repo, normaId, versaoId);
    expect(porDispositivo.get(art1.dispositivoId)?.map((m) => m.id)).toEqual([
      primeiro.id,
      segundo.id,
    ]);
    expect(porDispositivo.get(art2.dispositivoId)?.map((m) => m.id)).toEqual([nota.id]);
    // De outra versão (à espera da reancoragem, 11.7): fora.
    expect((await marcacoesDaNorma(repo, normaId, crypto.randomUUID())).size).toBe(0);
    expect((await marcacoesDaNorma(repo, normaId)).size).toBe(2);

    await removerMarcacao(repo, segundo.id);
    expect(
      (await marcacoesDaNorma(repo, normaId, versaoId)).get(art1.dispositivoId)?.map((m) => m.id),
    ).toEqual([primeiro.id]);
    expect(await repo.colecao('marcacoes').obter(segundo.id, { incluirExcluidos: true })).toEqual(
      expect.objectContaining({ excluidoEm: expect.any(String) as unknown }),
    );
    await expect(removerMarcacao(repo, segundo.id)).rejects.toMatchObject({
      motivo: 'inexistente',
    });
  });

  it('recusa dispositivo sem texto na versão', async () => {
    const { repo } = await repositorioDeTeste();
    const { normaId, versaoId } = await publicada(repo);
    await expect(
      criarGrifo(
        repo,
        { normaId, versaoId, dispositivoId: crypto.randomUUID(), inicio: 0, fim: 3 },
        1,
      ),
    ).rejects.toMatchObject({ motivo: 'sem_texto' });
  });
});
