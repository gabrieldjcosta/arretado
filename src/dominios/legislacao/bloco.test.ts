import { textoParaBlocos } from '../../core/seguranca/sanitizador';
import type { Repositorio } from '../../core/persistencia';
import { repositorioDeTeste } from '../../testes/repositorio';
import { dispositivosDaNorma, todos } from './consultas';
import {
  confirmarBloco,
  converterBloco,
  listarDoBloco,
  listarNos,
  resumirBloco,
  segmentoDoArtigoDigitado,
  trocarNoBloco,
} from './bloco';
import { EdicaoInvalida } from './edicao';
import { confirmarDispositivos, listarAConfirmar } from './revisao';
import { criarRascunho, editadoAMao } from './servico';

const TEXTO = [
  'LEI Nº 1.234, DE 5 DE MAIO DE 2020.',
  'CAPÍTULO I',
  'Dos deveres',
  'Art. 1º Esta Lei trata do teste.',
  'Art. 2º São deveres:',
  'I - estudar;',
  'II - revisar.',
  'CAPÍTULO II',
  'Dos direitos',
  'Art. 3º São direitos:',
  'I - descansar;',
  'II - estudar com calma.',
  'Art. 4º Os deveres do art. 2º valem sempre.',
  'Parágrafo único. O estudo é contínuo.',
].join('\n');

async function rascunho() {
  const { repo } = await repositorioDeTeste();
  const criado = await criarRascunho(repo, {
    blocos: textoParaBlocos(TEXTO),
    origemEntrada: 'texto',
  });
  return { repo, versaoId: criado.versao.id, normaId: criado.norma.id };
}

async function enderecos(repo: Repositorio, normaId: string) {
  const ds = await dispositivosDaNorma(repo.colecao('dispositivos'), normaId, false);
  return ds.map((d) => d.endereco);
}

async function no(repo: Repositorio, versaoId: string, inicio: string) {
  const achado = (await listarNos(repo, versaoId)).find((n) => n.rotulo.startsWith(inicio));
  if (!achado) throw new Error(`sem nó ${inicio}`);
  return { noId: achado.id };
}

describe('segmentoDoArtigoDigitado', () => {
  it.each([
    ['5', 'art5'],
    ['5º', 'art5'],
    ['art. 12', 'art12'],
    ['9-A', 'art9A'],
    ['9º-A', 'art9A'],
    ['Artigo 112', 'art112'],
  ])('%s → %s', (digitado, esperado) => {
    expect(segmentoDoArtigoDigitado(digitado)).toBe(esperado);
  });
  it('lixo não vira artigo', () => {
    expect(segmentoDoArtigoDigitado('')).toBeUndefined();
    expect(segmentoDoArtigoDigitado('abc')).toBeUndefined();
  });
});

describe('correção por bloco (10.3)', () => {
  it('lista os nós para escolher, com o nome do capítulo', async () => {
    const { repo, versaoId } = await rascunho();
    const nos = await listarNos(repo, versaoId);
    expect(nos.map((n) => n.rotulo)).toEqual([
      'CAPÍTULO I — Dos deveres',
      'CAPÍTULO II — Dos direitos',
    ]);
  });

  it('bloco por nó: o capítulo com tudo o que há dentro, e só ele', async () => {
    const { repo, versaoId } = await rascunho();
    const bloco = await no(repo, versaoId, 'CAPÍTULO II');
    const lista = await listarDoBloco(repo, versaoId, bloco);
    expect(lista.itens.map((i) => i.rotulo ?? i.endereco)).toEqual(
      expect.arrayContaining(['CAPÍTULO II', 'Art. 3º', 'I', 'II', 'Art. 4º', 'Parágrafo único']),
    );
    expect(lista.itens.some((i) => i.rotulo === 'Art. 1º')).toBe(false);
    const resumo = await resumirBloco(repo, versaoId, bloco);
    expect(resumo.descricao).toBe('CAPÍTULO II');
    expect(resumo.porTipo.artigo).toBe(2);
    expect(resumo.porTipo.inciso).toBe(2);
  });

  it('bloco por intervalo de artigos: de 2 a 3, sem os capítulos', async () => {
    const { repo, versaoId } = await rascunho();
    const bloco = { de: '2', ate: '3º' };
    const resumo = await resumirBloco(repo, versaoId, bloco);
    expect(resumo.descricao).toBe('Art. 2º a Art. 3º');
    expect(resumo.porTipo.artigo).toBe(2);
    expect(resumo.porTipo.inciso).toBe(4);
    expect(resumo.porTipo.capitulo).toBeUndefined();
    const lista = await listarDoBloco(repo, versaoId, bloco);
    expect(lista.itens.every((i) => i.tipo !== 'capitulo' && i.rotulo !== 'Art. 4º')).toBe(true);
  });

  it('intervalo inválido avisa em palavras simples', async () => {
    const { repo, versaoId } = await rascunho();
    await expect(resumirBloco(repo, versaoId, { de: '3', ate: '2' })).rejects.toThrow(/vem depois/);
    await expect(resumirBloco(repo, versaoId, { de: '1', ate: '99' })).rejects.toThrow(
      /Não há o artigo "99"/,
    );
    await expect(resumirBloco(repo, versaoId, { de: 'x', ate: '2' })).rejects.toBeInstanceOf(
      EdicaoInvalida,
    );
    await expect(resumirBloco(repo, versaoId, { noId: 'nao-existe' })).rejects.toBeInstanceOf(
      EdicaoInvalida,
    );
  });

  it('paginação do bloco', async () => {
    const { repo, versaoId } = await rascunho();
    const bloco = { de: '1', ate: '4' };
    const total = (await listarDoBloco(repo, versaoId, bloco)).total;
    const p1 = await listarDoBloco(repo, versaoId, bloco, { desde: 0, quantidade: 3 });
    const p2 = await listarDoBloco(repo, versaoId, bloco, { desde: 3, quantidade: 3 });
    expect(p1.total).toBe(total);
    expect(p1.itens).toHaveLength(3);
    expect(p2.itens[0]?.dispositivoId).not.toBe(p1.itens[0]?.dispositivoId);
  });

  it('confirmar o bloco confirma só as linhas dele', async () => {
    const { repo, versaoId } = await rascunho();
    const antes = (await listarAConfirmar(repo, versaoId)).total;
    const bloco = { de: '2', ate: '2' };
    const resumo = await resumirBloco(repo, versaoId, bloco);
    const n = await confirmarBloco(repo, versaoId, bloco);
    expect(n).toBe(resumo.aConfirmar);
    expect(n).toBeGreaterThan(0);
    expect((await listarAConfirmar(repo, versaoId)).total).toBe(antes - n);
    expect((await resumirBloco(repo, versaoId, bloco)).aConfirmar).toBe(0);
    expect(await confirmarBloco(repo, versaoId, bloco)).toBe(0);
    const versao = await repo.colecao('versoesNorma').obter(versaoId);
    expect(versao && editadoAMao(versao)).toBe(true);
  });

  it('converter o bloco: os incisos do capítulo II viram parágrafos, numerados pelo sistema', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const bloco = await no(repo, versaoId, 'CAPÍTULO II');
    const n = await converterBloco(repo, versaoId, bloco, 'inciso', 'paragrafo');
    expect(n).toBe(2);
    const fim = await enderecos(repo, normaId);
    expect(fim).toEqual(expect.arrayContaining(['art3.par1', 'art3.par2']));
    expect(fim).not.toContain('art3.incI');
    // O capítulo I ficou como estava.
    expect(fim).toEqual(expect.arrayContaining(['art2.incI', 'art2.incII']));
  });

  it('converter sem nada do tipo no bloco não faz nada', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await enderecos(repo, normaId);
    expect(await converterBloco(repo, versaoId, { de: '1', ate: '1' }, 'inciso', 'alinea')).toBe(0);
    expect(await enderecos(repo, normaId)).toEqual(antes);
  });

  it('trocar no bloco muda só o texto das linhas do bloco', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const n = await trocarNoBloco(
      repo,
      versaoId,
      { noId: (await no(repo, versaoId, 'CAPÍTULO I')).noId },
      'estud',
      'aprend',
    );
    expect(n).toBe(1);
    const texto = async (endereco: string) => {
      const ds = await dispositivosDaNorma(repo.colecao('dispositivos'), normaId, false);
      const textos = await todos(repo.colecao('textosDispositivo'), {
        indice: 'versaoId',
        de: versaoId,
        ate: versaoId,
      });
      const d = ds.find((x) => x.endereco === endereco);
      return textos
        .find((t) => t.dispositivoId === d?.id)
        ?.trechos.map((t) => t.texto)
        .join('');
    };
    expect(await texto('art2.incI')).toBe('aprendar;');
    expect(await texto('art3.incII')).toBe('estudar com calma.');
    // Não diferencia maiúscula de minúscula e conta cada linha uma vez.
    expect(await trocarNoBloco(repo, versaoId, { de: '3', ate: '3' }, 'ESTUDAR', 'ler')).toBe(1);
    expect(await texto('art3.incII')).toBe('ler com calma.');
    await expect(
      trocarNoBloco(repo, versaoId, { de: '3', ate: '3' }, '', 'x'),
    ).rejects.toBeInstanceOf(EdicaoInvalida);
  });

  it('trocar com caracteres de expressão regular procura o texto literal', async () => {
    const { repo, versaoId } = await rascunho();
    expect(await trocarNoBloco(repo, versaoId, { de: '1', ate: '4' }, '(.*)', 'x')).toBe(0);
  });

  it('a troca no nome do capítulo vale quando o nó está no bloco', async () => {
    const { repo, versaoId } = await rascunho();
    const bloco = await no(repo, versaoId, 'CAPÍTULO I');
    expect(await trocarNoBloco(repo, versaoId, bloco, 'Dos deveres', 'Das obrigações')).toBe(1);
    expect((await listarNos(repo, versaoId))[0]?.rotulo).toBe('CAPÍTULO I — Das obrigações');
  });

  it('o confirmado de fora do bloco segue confirmado', async () => {
    const { repo, versaoId } = await rascunho();
    const fora = (await listarAConfirmar(repo, versaoId, { quantidade: 200 })).itens.find(
      (i) => i.rotulo === 'Art. 1º',
    );
    await confirmarDispositivos(repo, versaoId, [fora?.dispositivoId ?? '']);
    await converterBloco(repo, versaoId, { de: '3', ate: '4' }, 'inciso', 'alinea');
    const aindaPendente = (await listarAConfirmar(repo, versaoId, { quantidade: 200 })).itens.some(
      (i) => i.rotulo === 'Art. 1º',
    );
    expect(aindaPendente).toBe(false);
  });
});
