// Edição integral (10.4): o que já foi conferido sobrevive à reorganização do texto. A regra de
// preservação está no topo de `edicao-integral.ts`.
import { textoParaBlocos } from '../../core/seguranca/sanitizador';
import type { Repositorio } from '../../core/persistencia';
import { repositorioDeTeste } from '../../testes/repositorio';
import { confirmarBloco, converterBloco, trocarNoBloco } from './bloco';
import { dispositivosDaNorma, todos } from './consultas';
import {
  converterLinha,
  dividirAqui,
  EdicaoInvalida,
  escreverNorma,
  lerTextoIntegral,
  MENSAGEM_TEXTO_MUDOU,
  salvarTexto,
  salvarTextoIntegral,
} from './edicao';
import { casarLinhas, lerLinhaDigitada } from './edicao-integral';
import { confirmarDispositivos } from './revisao';
import {
  criarRascunho,
  editadoAMao,
  publicarVersao,
  retomarRascunho,
  verificarPublicacao,
} from './servico';

const TEXTO = [
  'LEI Nº 1.234, DE 5 DE MAIO DE 2020.',
  'CAPÍTULO I',
  'DAS DISPOSIÇÕES GERAIS',
  'Art. 1º Esta Lei trata do teste.',
  'Parágrafo único. O teste é contínuo.',
  'Art. 2º São deveres: (Redação dada pela Lei nº 9.999, de 2019)',
  'I - estudar;',
  'II - revisar.',
  'CAPÍTULO II',
  'DO FIM',
  'Art. 3º Esta Lei entra em vigor na data da publicação.',
].join('\n');

async function rascunho(texto = TEXTO) {
  const { repo } = await repositorioDeTeste();
  const criado = await criarRascunho(repo, {
    blocos: textoParaBlocos(texto),
    origemEntrada: 'texto',
  });
  return { repo, versaoId: criado.versao.id, normaId: criado.norma.id };
}

interface Linha {
  id: string;
  endereco: string;
  tipo: string;
  rotulo?: string;
  texto: string;
  pai?: string;
  confianca: string;
  notas: number;
}

async function ler(repo: Repositorio, normaId: string, versaoId: string): Promise<Linha[]> {
  const ds = await dispositivosDaNorma(repo.colecao('dispositivos'), normaId, false);
  const textos = new Map(
    (
      await todos(repo.colecao('textosDispositivo'), {
        indice: 'versaoId',
        de: versaoId,
        ate: versaoId,
      })
    ).map((t) => [t.dispositivoId, t]),
  );
  const porId = new Map(ds.map((d) => [d.id, d]));
  return ds.map((d) => {
    const t = textos.get(d.id);
    return {
      id: d.id,
      endereco: d.endereco,
      tipo: d.tipo,
      ...(d.rotulo === undefined ? {} : { rotulo: d.rotulo }),
      texto: (t?.trechos ?? []).map((x) => x.texto).join(''),
      ...(d.paiId ? { pai: porId.get(d.paiId)?.endereco ?? '?' } : {}),
      confianca: d.confianca,
      notas: t?.notasVigencia?.length ?? 0,
    };
  });
}

/** Os registros crus (dispositivos e textos), para ver que nada foi regravado. */
async function crus(repo: Repositorio, normaId: string, versaoId: string) {
  const ds = await dispositivosDaNorma(repo.colecao('dispositivos'), normaId, false);
  const ts = await todos(repo.colecao('textosDispositivo'), {
    indice: 'versaoId',
    de: versaoId,
    ate: versaoId,
  });
  return JSON.stringify([ds, ts.sort((a, b) => (a.id < b.id ? -1 : 1))]);
}

const por = (linhas: Linha[], endereco: string) => {
  const l = linhas.find((x) => x.endereco === endereco);
  if (!l) throw new Error(`sem ${endereco}`);
  return l;
};

/** Edita o texto integral: `mudar` recebe as linhas do texto e devolve as novas. */
async function editar(
  repo: Repositorio,
  versaoId: string,
  mudar: (linhas: string[]) => string[],
  simular = false,
) {
  const base = await lerTextoIntegral(repo, versaoId);
  return salvarTextoIntegral(repo, versaoId, mudar(base.split('\n')).join('\n'), {
    base,
    simular,
  });
}

describe('texto integral (10.4)', () => {
  it('uma linha por dispositivo, com o rótulo na frente e o nome do capítulo embaixo', async () => {
    const { repo, versaoId } = await rascunho();
    expect((await lerTextoIntegral(repo, versaoId)).split('\n')).toEqual([
      'CAPÍTULO I',
      'DAS DISPOSIÇÕES GERAIS',
      'Art. 1º Esta Lei trata do teste.',
      'Parágrafo único O teste é contínuo.',
      'Art. 2º São deveres:',
      'I - estudar;',
      'II - revisar.',
      'CAPÍTULO II',
      'DO FIM',
      'Art. 3º Esta Lei entra em vigor na data da publicação.',
    ]);
  });

  it('salvar sem mudar nada não regrava nada', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await crus(repo, normaId, versaoId);
    const resumo = await editar(repo, versaoId, (l) => l);
    expect(resumo).toMatchObject({ mantidos: 8, alterados: 0, novos: 0, removidos: 0 });
    expect(await crus(repo, normaId, versaoId)).toBe(antes);
  });

  it('o confirmado sobrevive à inserção de um artigo no meio', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    await confirmarDispositivos(repo, versaoId);
    const antes = await ler(repo, normaId, versaoId);
    const resumo = await editar(repo, versaoId, (l) => [
      ...l.slice(0, 4),
      'Art. 1º-A O estudo é diário.',
      ...l.slice(4),
    ]);
    expect(resumo).toMatchObject({ mantidos: 8, novos: 1, removidos: 0 });
    const depois = await ler(repo, normaId, versaoId);
    for (const a of antes) expect(depois.find((d) => d.id === a.id)).toEqual(a);
    expect(por(depois, 'art1A')).toMatchObject({
      tipo: 'artigo',
      rotulo: 'Art. 1º-A',
      texto: 'O estudo é diário.',
      confianca: 'a_confirmar',
      pai: 'cap1',
    });
  });

  it('linha mudada no lugar: o mesmo dispositivo, texto novo, nota mantida, volta a confirmar', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    await confirmarDispositivos(repo, versaoId);
    const art2 = por(await ler(repo, normaId, versaoId), 'art2');
    expect(art2.notas).toBe(1);
    const resumo = await editar(repo, versaoId, (l) =>
      l.map((x) => (x === 'Art. 2º São deveres:' ? 'Art. 2º São deveres do estudante:' : x)),
    );
    expect(resumo).toMatchObject({ mantidos: 7, alterados: 1, conferidosAlterados: 1 });
    const depois = por(await ler(repo, normaId, versaoId), 'art2');
    expect(depois).toMatchObject({
      id: art2.id,
      texto: 'São deveres do estudante:',
      notas: 1,
      confianca: 'a_confirmar',
    });
    expect(por(await ler(repo, normaId, versaoId), 'art2.incI').confianca).toBe('alta');
  });

  it('renumerar à mão: mesmo dispositivo, confiança mantida, endereço novo com os filhos', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    await confirmarDispositivos(repo, versaoId);
    const antes = await ler(repo, normaId, versaoId);
    await editar(repo, versaoId, (l) =>
      l.map((x) =>
        x.startsWith('Art. 3º')
          ? x.replace('Art. 3º', 'Art. 4º')
          : x.startsWith('Art. 2º')
            ? x.replace('Art. 2º', 'Art. 3º')
            : x,
      ),
    );
    const depois = await ler(repo, normaId, versaoId);
    const art2 = por(antes, 'art2');
    expect(por(depois, 'art3')).toMatchObject({
      id: art2.id,
      rotulo: 'Art. 3º',
      confianca: 'alta',
    });
    expect(por(depois, 'art3.incI')).toMatchObject({
      id: por(antes, 'art2.incI').id,
      pai: 'art3',
      confianca: 'alta',
    });
    expect(por(depois, 'art4')).toMatchObject({ id: por(antes, 'art3').id, confianca: 'alta' });
    expect(depois.map((d) => d.endereco)).not.toContain('art2');
  });

  it('artigo mudado de lugar continua o mesmo, com o confirmado', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    await confirmarDispositivos(repo, versaoId);
    const antes = await ler(repo, normaId, versaoId);
    // O art. 1º (com o parágrafo) vai para depois do art. 2º.
    await editar(repo, versaoId, (l) => [l[0], l[1], ...l.slice(4, 7), l[2], l[3], ...l.slice(7)]);
    const depois = await ler(repo, normaId, versaoId);
    expect(depois).toHaveLength(antes.length);
    for (const a of antes) {
      expect(depois.find((d) => d.id === a.id)).toMatchObject({
        endereco: a.endereco,
        texto: a.texto,
        confianca: 'alta',
      });
    }
    expect(depois.filter((d) => d.tipo === 'artigo').map((d) => d.endereco)).toEqual([
      'art2',
      'art1',
      'art3',
    ]);
    // A ordem fora de sequência é aviso, não conflito.
    expect((await verificarPublicacao(repo, versaoId)).conflitos).toEqual([]);
  });

  it('apagar linhas: simular avisa quantas conferidas saem e não grava', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    await confirmarDispositivos(repo, versaoId);
    const antes = await crus(repo, normaId, versaoId);
    const tirar = (l: string[]) => l.filter((x) => !x.startsWith('II -'));
    const simulado = await editar(repo, versaoId, tirar, true);
    expect(simulado).toMatchObject({ removidos: 1, conferidosRemovidos: 1 });
    expect(await crus(repo, normaId, versaoId)).toBe(antes);
    await editar(repo, versaoId, tirar);
    expect((await ler(repo, normaId, versaoId)).map((d) => d.endereco)).not.toContain('art2.incII');
  });

  it('número repetido não se funde: vira conflito para corrigir', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    await editar(repo, versaoId, (l) => [...l, 'Art. 3º Outro texto.']);
    expect((await ler(repo, normaId, versaoId)).filter((d) => d.endereco === 'art3')).toHaveLength(
      2,
    );
    const { conflitos } = await verificarPublicacao(repo, versaoId);
    expect(conflitos.map((c) => c.tipo)).toContain('endereco_duplicado');
  });

  it('capítulo novo, rubrica e continuação do texto', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    await editar(repo, versaoId, (l) => [
      ...l.slice(0, 4),
      'Seção I',
      'Do Estudo',
      'Dever de estudar',
      ...l.slice(4, 5),
      'Pena - nenhuma.',
      ...l.slice(5),
    ]);
    const depois = await ler(repo, normaId, versaoId);
    expect(por(depois, 'cap1.sec1')).toMatchObject({ rotulo: 'SEÇÃO I', pai: 'cap1' });
    expect(por(depois, 'cap1.sec1.nome').texto).toBe('Do Estudo');
    expect(por(depois, 'art2.nome')).toMatchObject({ tipo: 'nome', texto: 'Dever de estudar' });
    expect(por(depois, 'art2')).toMatchObject({
      texto: 'São deveres:\nPena - nenhuma.',
      pai: 'cap1.sec1',
    });
  });

  it('o rascunho que mudou em outra aba não é sobrescrito', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const base = await lerTextoIntegral(repo, versaoId);
    await confirmarDispositivos(repo, versaoId);
    await salvarTexto(repo, versaoId, por(await ler(repo, normaId, versaoId), 'art3').id, {
      texto: 'Vigora já.',
    });
    const antes = await crus(repo, normaId, versaoId);
    await expect(
      salvarTextoIntegral(repo, versaoId, `${base}\nArt. 4º X.`, { base }),
    ).rejects.toThrow(MENSAGEM_TEXTO_MUDOU);
    expect(await crus(repo, normaId, versaoId)).toBe(antes);
  });

  it('texto vazio não apaga o rascunho', async () => {
    const { repo, versaoId } = await rascunho();
    const base = await lerTextoIntegral(repo, versaoId);
    await expect(salvarTextoIntegral(repo, versaoId, '  \n ', { base })).rejects.toBeInstanceOf(
      EdicaoInvalida,
    );
  });

  it('as edições da 10.2 e da 10.3 sobrevivem à reorganização', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const inicio = await ler(repo, normaId, versaoId);
    // 10.2: corrigir o texto, converter uma linha e dividir outra.
    await salvarTexto(repo, versaoId, por(inicio, 'art1').id, {
      texto: 'Esta Lei trata do estudo.',
    });
    await converterLinha(repo, versaoId, por(inicio, 'art1.parUnico').id, 'inciso');
    await dividirAqui(
      repo,
      versaoId,
      por(inicio, 'art3').id,
      'Esta Lei entra em vigor na data da publicação.',
      'Esta Lei entra em vigor'.length,
    );
    // 10.3: trocar no bloco e confirmar o bloco do capítulo I.
    await trocarNoBloco(repo, versaoId, { de: '2', ate: '2' }, 'revisar', 'reler');
    const capI = por(inicio, 'cap1').id;
    await converterBloco(repo, versaoId, { de: '2', ate: '2' }, 'inciso', 'inciso');
    await confirmarBloco(repo, versaoId, { noId: capI });
    const editado = await ler(repo, normaId, versaoId);
    expect(por(editado, 'art2.incII').texto).toBe('reler.');
    expect(por(editado, 'art1.incI').confianca).toBe('alta');

    // Edição integral longe dali: um artigo novo no fim.
    await editar(repo, versaoId, (l) => [...l, 'Art. 5º Revoga-se o que for contrário.']);
    const depois = await ler(repo, normaId, versaoId);
    for (const e of editado) expect(depois.find((d) => d.id === e.id)).toEqual(e);
    expect(por(depois, 'art5').confianca).toBe('a_confirmar');
    expect(editadoAMao((await retomarRascunho(repo, versaoId)).versao)).toBe(true);
    expect((await ler(repo, normaId, versaoId)).length).toBe(depois.length);
  });

  it('nó estrutural: o nome mudado no lugar mantém o capítulo', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    await confirmarDispositivos(repo, versaoId);
    const cap2 = por(await ler(repo, normaId, versaoId), 'cap2');
    await editar(repo, versaoId, (l) =>
      l.map((x) => (x === 'DO FIM' ? 'DAS DISPOSIÇÕES FINAIS' : x)),
    );
    const depois = await ler(repo, normaId, versaoId);
    expect(por(depois, 'cap2')).toMatchObject({ id: cap2.id, confianca: 'alta' });
    expect(por(depois, 'cap2.nome')).toMatchObject({
      texto: 'DAS DISPOSIÇÕES FINAIS',
      confianca: 'a_confirmar',
    });
    expect(por(depois, 'art3').pai).toBe('cap2');
  });
});

describe('inserção manual (10.4)', () => {
  it('começa com um artigo vazio, recebe o texto e publica', async () => {
    const { repo } = await repositorioDeTeste();
    const { versaoId, normaId } = await escreverNorma(repo, 'Súmula 1 do Tribunal');
    expect(await lerTextoIntegral(repo, versaoId)).toBe('Art. 1º');
    await editar(repo, versaoId, () => [
      'Art. 1º A súmula vale para todos.',
      'Art. 2º O enunciado é curto.',
    ]);
    const linhas = await ler(repo, normaId, versaoId);
    expect(linhas.map((l) => [l.endereco, l.texto])).toEqual([
      ['art1', 'A súmula vale para todos.'],
      ['art2', 'O enunciado é curto.'],
    ]);
    const publicada = await publicarVersao(repo, versaoId, { aceitarAConfirmar: true });
    expect(publicada.norma.tituloCurto).toBe('Súmula 1 do Tribunal');
  });

  it('texto sem rótulo vira artigo numerado pelo sistema', async () => {
    const { repo } = await repositorioDeTeste();
    const { versaoId, normaId } = await escreverNorma(repo, 'Enunciado');
    await editar(repo, versaoId, () => ['O enunciado inteiro, sem número.']);
    expect(await ler(repo, normaId, versaoId)).toMatchObject([
      { endereco: 'art1', rotulo: 'Art. 1º', texto: 'O enunciado inteiro, sem número.' },
    ]);
  });

  it('título em branco não cria nada', async () => {
    const { repo } = await repositorioDeTeste();
    await expect(escreverNorma(repo, '  ')).rejects.toBeInstanceOf(EdicaoInvalida);
  });
});

describe('leitura da linha digitada', () => {
  it.each([
    ['Art. 5o Todos.', 'artigo', 'art5', 'Todos.'],
    ['Art. 10. Texto', 'artigo', 'art10', 'Texto'],
    ['§ 2º Texto', 'paragrafo', 'par2', 'Texto'],
    ['Parágrafo único. Texto', 'paragrafo', 'parUnico', 'Texto'],
    ['IV - texto', 'inciso', 'incIV', 'texto'],
    ['b) texto', 'alinea', 'alB', 'texto'],
    ['Capítulo III', 'capitulo', 'cap3', ''],
  ])('%s', (linha, tipo, segmento, resto) => {
    expect(lerLinhaDigitada(linha)).toMatchObject({ tipo, segmento, resto });
  });

  it('texto comum não é rótulo', () => {
    expect(lerLinhaDigitada('Dever de estudar')).toBeUndefined();
  });
});

describe('casarLinhas', () => {
  it('casa as iguais em ordem, também num texto grande (âncoras)', () => {
    const antigas = Array.from({ length: 3000 }, (_, k) => `linha ${String(k)}`);
    const novas = [...antigas];
    novas.splice(10, 1, 'mudada');
    novas.splice(1500, 0, 'nova', 'outra');
    novas.splice(2900, 5);
    // Começo e fim diferentes: força o caminho das âncoras.
    novas[0] = 'x';
    novas[novas.length - 1] = 'y';
    const par = casarLinhas(antigas, novas);
    let ultimo = -1;
    let casadas = 0;
    par.forEach((a, j) => {
      if (a < 0) return;
      expect(antigas[a]).toBe(novas[j]);
      expect(a).toBeGreaterThan(ultimo);
      ultimo = a;
      casadas++;
    });
    expect(casadas).toBe(novas.length - 5);
  });
});
