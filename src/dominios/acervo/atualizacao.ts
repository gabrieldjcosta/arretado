// Atualização 6a (spec §9): aplica a versão nova de um item já adicionado. Compara a árvore por
// endereço, grava a versão nova como vigente e arquiva a anterior. O dispositivo mantém o id quando
// o endereço se mantém (ou renumera), então estrela, erro, vínculo, "lido até" e posição seguem
// valendo sem tocar neles; o que perdeu o endereço vai para as pendências de releitura. Grifos e
// notas são reancorados pelo texto. Sem rede de volta ao site oficial: a versão vem do acervo.
import type { Dispositivo, Marcacao, Norma, PendenciaDeReleitura } from '../../core/modelo';
import type { Dados, Repositorio } from '../../core/persistencia';
import { dispositivosDaNorma, todos } from './consultas';
import { baixarConferido } from './adesao';
import {
  compararArvores,
  reancorar,
  textoDosTrechos,
  type ComparacaoDeVersoes,
  type NoAntigo,
} from './comparacao';
import type { EntradaDoIndice, ItemDoAcervo } from './esquemas';
import type { FonteDoAcervo } from './fonte';

export type ResultadoDaAtualizacao =
  | { estado: 'em_dia'; normaId: string }
  | {
      estado: 'atualizada';
      normaId: string;
      versaoId: string;
      comparacao: ComparacaoDeVersoes;
      /** Pendências de releitura criadas. */
      pendencias: number;
      /** Grifos e notas que voltaram para o texto novo, por texto (`reancorada`). */
      reancoradas: number;
      /** Grifos e notas sem o texto na versão nova (`pendente`). */
      marcacoesPendentes: number;
    };

export class AtualizacaoRecusada extends Error {
  constructor(
    readonly itemId: string,
    readonly motivo: 'nao_adicionada',
  ) {
    super('Este item não foi adicionado do acervo.');
    this.name = 'AtualizacaoRecusada';
  }
}

/** Itens adicionados cujo índice traz versão maior que a aderida ("há versão nova"). */
export async function itensComVersaoNova(
  repo: Repositorio,
  entradas: readonly EntradaDoIndice[],
): Promise<{ normaId: string; entrada: EntradaDoIndice; versaoAderida: number }[]> {
  const normas = await repo.colecao('normas').todosDoUsuario();
  const porAcervo = new Map<string, Norma>();
  for (const n of normas) if (n.origemAcervo) porAcervo.set(n.origemAcervo.id, n);
  const saida: { normaId: string; entrada: EntradaDoIndice; versaoAderida: number }[] = [];
  for (const entrada of entradas) {
    const norma = porAcervo.get(entrada.id);
    if (norma?.origemAcervo && entrada.versao > norma.origemAcervo.versao) {
      saida.push({ normaId: norma.id, entrada, versaoAderida: norma.origemAcervo.versao });
    }
  }
  return saida;
}

async function normaDoAcervo(repo: Repositorio, acervoId: string) {
  const normas = await repo.colecao('normas').todosDoUsuario();
  const norma = normas.find((n) => n.origemAcervo?.id === acervoId);
  if (!norma?.origemAcervo || !norma.versaoVigenteId) {
    throw new AtualizacaoRecusada(acervoId, 'nao_adicionada');
  }
  return { norma, aderida: norma.origemAcervo, versaoVigenteId: norma.versaoVigenteId };
}

/** A árvore vigente: dispositivos na ordem de leitura e o texto de cada um na versão vigente. */
async function arvoreVigente(repo: Repositorio, normaId: string, versaoId: string) {
  const dispositivos = await dispositivosDaNorma(repo.colecao('dispositivos'), normaId);
  const textos = await todos(repo.colecao('textosDispositivo'), {
    indice: 'versaoId',
    de: versaoId,
    ate: versaoId,
  });
  const textoPorId = new Map(textos.map((t) => [t.dispositivoId, t]));
  const textoAntigoPorId = new Map(
    textos.map((t) => [t.dispositivoId, textoDosTrechos(t.trechos)]),
  );
  const antigos: NoAntigo[] = dispositivos.map((d) => ({
    endereco: d.endereco,
    status: d.status,
    rotulo: d.rotulo,
    trechos: textoPorId.get(d.id)?.trechos ?? [],
  }));
  return { dispositivos, antigos, textoAntigoPorId };
}

/** Prévia: o que a atualização mudaria, sem gravar nada. */
export async function compararComAtual(
  repo: Repositorio,
  fonte: FonteDoAcervo,
  entrada: EntradaDoIndice,
): Promise<ComparacaoDeVersoes> {
  const { norma, versaoVigenteId } = await normaDoAcervo(repo, entrada.id);
  const item = await baixarConferido(fonte, entrada);
  const { antigos } = await arvoreVigente(repo, norma.id, versaoVigenteId);
  return compararArvores(antigos, item.nos);
}

const OPCIONAIS_DA_NORMA = [
  'tituloOficial',
  'referencia',
  'tipo',
  'esfera',
  'epigrafe',
  'ementa',
  'preambulo',
  'urlOficial',
  'fonteConsultadaEm',
] as const;

/** Aplica a versão nova do item. Idempotente: sem versão maior que a aderida, não faz nada. */
export async function atualizarItem(
  repo: Repositorio,
  fonte: FonteDoAcervo,
  entrada: EntradaDoIndice,
): Promise<ResultadoDaAtualizacao> {
  const previa = await normaDoAcervo(repo, entrada.id);
  if (entrada.versao <= previa.aderida.versao)
    return { estado: 'em_dia', normaId: previa.norma.id };
  const item = await baixarConferido(fonte, entrada);
  const resultado = await repo.transacao(async (): Promise<ResultadoDaAtualizacao> => {
    // Relido na transação: duas abas atualizando o mesmo item terminam com uma versão só.
    const { norma, aderida, versaoVigenteId } = await normaDoAcervo(repo, entrada.id);
    if (entrada.versao <= aderida.versao) return { estado: 'em_dia', normaId: norma.id };
    return aplicar(repo, entrada, item, norma, versaoVigenteId);
  });
  if (resultado.estado === 'atualizada') {
    repo.eventos.emitir('versao.publicada', {
      normaId: resultado.normaId,
      versaoId: resultado.versaoId,
    });
  }
  return resultado;
}

async function aplicar(
  repo: Repositorio,
  entrada: EntradaDoIndice,
  item: ItemDoAcervo,
  norma: Norma,
  versaoAntigaId: string,
): Promise<ResultadoDaAtualizacao> {
  const normaId = norma.id;
  const { dispositivos, antigos, textoAntigoPorId } = await arvoreVigente(
    repo,
    normaId,
    versaoAntigaId,
  );
  const comparacao = compararArvores(antigos, item.nos);
  const agora = repo.ctx.agora().toISOString();
  const versaoId = repo.ctx.novoId();

  await repo.colecao('versoesNorma').atualizar(versaoAntigaId, { status: 'arquivada' });
  await repo.colecao('versoesNorma').criar(
    {
      normaId,
      status: 'vigente',
      capturadaEm: agora,
      origemEntrada: 'arquivo',
      hash: entrada.hash,
      fonte: 'Acervo do Arretado',
    },
    { id: versaoId, origem: 'importacao' },
  );

  // Árvore: o dispositivo mantém o id pelo endereço (ou pelo de antes, se renumerou).
  const idPorEnderecoAntigo = new Map(dispositivos.map((d) => [d.endereco, d]));
  const enderecoAntigoDoNovo = new Map(comparacao.renumerados.map((r) => [r.endereco, r.de]));
  const idPorEnderecoNovo = new Map<string, string>();
  const novos: { id: string; dados: Dados<'dispositivos'> }[] = [];
  const textos: { dados: Dados<'textosDispositivo'> }[] = [];
  const textoNovoPorId = new Map<string, string>();
  const idsMantidos = new Set<string>();
  for (const [k, no] of item.nos.entries()) {
    const existente = idPorEnderecoAntigo.get(enderecoAntigoDoNovo.get(no.endereco) ?? no.endereco);
    const id = existente?.id ?? repo.ctx.novoId();
    if (existente) idsMantidos.add(id);
    idPorEnderecoNovo.set(no.endereco, id);
    const paiId = no.pai === undefined ? undefined : idPorEnderecoNovo.get(no.pai);
    const campos: Dados<'dispositivos'> = {
      normaId,
      endereco: no.endereco,
      categoria: no.categoria,
      tipo: no.tipo,
      ordem: k + 1,
      status: no.status,
      confianca: no.confianca,
      ...(paiId === undefined ? {} : { paiId }),
      ...(no.rotulo === undefined ? {} : { rotulo: no.rotulo }),
      ...(no.renumeradoDe === undefined ? {} : { renumeradoDe: no.renumeradoDe }),
    };
    if (existente) {
      if (mudou(existente, campos)) {
        await repo.colecao('dispositivos').atualizar(id, {
          endereco: campos.endereco,
          categoria: campos.categoria,
          tipo: campos.tipo,
          ordem: campos.ordem,
          status: campos.status,
          confianca: campos.confianca,
          paiId: campos.paiId,
          rotulo: campos.rotulo,
          renumeradoDe: campos.renumeradoDe,
        });
      }
    } else {
      novos.push({ id, dados: campos });
    }
    textoNovoPorId.set(id, textoDosTrechos(no.trechos));
    textos.push({
      dados: {
        versaoId,
        dispositivoId: id,
        normaId,
        trechos: no.trechos,
        ...(no.notasVigencia === undefined ? {} : { notasVigencia: no.notasVigencia }),
        ...(no.procedencia === undefined ? {} : { procedencia: no.procedencia }),
        ...(no.redacoesAnteriores === undefined
          ? {}
          : { redacoesAnteriores: no.redacoesAnteriores }),
      },
    });
  }
  await repo.colecao('dispositivos').criarLote(novos, { origem: 'importacao' });
  await repo.colecao('textosDispositivo').criarLote(textos, { origem: 'importacao' });

  // O que perdeu o endereço sai da árvore (exclusão lógica), mas o registro e as referências ficam.
  const perdidos = dispositivos.filter((d) => !idsMantidos.has(d.id));
  for (const d of perdidos) await repo.colecao('dispositivos').excluir(d.id);
  const perdidoPorId = new Map(perdidos.map((d) => [d.id, d]));
  const anteriorMantido = anterioresMantidos(dispositivos, idsMantidos);

  const pendencias: Dados<'pendenciasReleitura'>[] = [];
  const pendenciaDe = (
    tipo: PendenciaDeReleitura['tipo'],
    d: Dispositivo,
    referenciaId: string,
  ): void => {
    pendencias.push({
      normaId,
      versaoId,
      tipo,
      enderecoAntigo: d.endereco,
      ...(d.rotulo === undefined ? {} : { rotulo: d.rotulo }),
      referenciaId,
    });
  };

  if (perdidos.length > 0) {
    for (const e of await todos(repo.colecao('estrelas'), {
      indice: 'normaId',
      de: normaId,
      ate: normaId,
    })) {
      const d = perdidoPorId.get(e.alvoId);
      if (d) pendenciaDe('estrela', d, e.id);
    }
    for (const d of perdidos) {
      const erros = await todos(repo.colecao('erros'), {
        indice: 'dispositivoId',
        de: d.id,
        ate: d.id,
      });
      for (const erro of erros) pendenciaDe('erro', d, erro.id);
    }
  }

  // Vínculos de precedente (F3-C): o dispositivo perdido deixa o vínculo pendente; a pessoa o relê.
  for (const d of perdidos) {
    const vinculos = await todos(repo.colecao('vinculosPrecedenteDispositivo'), {
      indice: 'dispositivoId',
      de: d.id,
      ate: d.id,
    });
    for (const v of vinculos) {
      pendenciaDe('precedente', d, v.id);
      await repo.colecao('vinculosPrecedenteDispositivo').atualizar(v.id, { status: 'pendente' });
    }
  }

  // "Lido até" e posição: o dispositivo perdido cede ao anterior que continua na árvore.
  const leituras = await todos(repo.colecao('leituras'), {
    indice: '[usuarioId+normaId]',
    de: [repo.ctx.usuarioId, normaId],
    ate: [repo.ctx.usuarioId, normaId],
  });
  for (const leitura of leituras) {
    const alteracoes: { lidoAteId?: string | undefined; posicaoId?: string | undefined } = {};
    for (const [campo, tipo] of [
      ['lidoAteId', 'lido_ate'],
      ['posicaoId', 'posicao'],
    ] as const) {
      const d = perdidoPorId.get(leitura[campo] ?? '');
      if (!d) continue;
      pendenciaDe(tipo, d, leitura.id);
      alteracoes[campo] = anteriorMantido.get(d.id);
    }
    if (Object.keys(alteracoes).length > 0) {
      await repo.colecao('leituras').atualizar(leitura.id, alteracoes);
    }
  }

  // Vínculos com trecho: os endereços seguem a renumeração; o que sumiu perde o trecho (o vínculo
  // com a norma fica) e vira pendência.
  const vinculos = await todos(repo.colecao('vinculosDisciplina'), {
    indice: 'normaId',
    de: normaId,
    ate: normaId,
  });
  for (const v of vinculos) {
    if (!v.trecho) continue;
    const inicio = comparacao.novoEndereco.get(v.trecho.inicioEndereco);
    const fim = comparacao.novoEndereco.get(v.trecho.fimEndereco);
    if (inicio === undefined || fim === undefined) {
      const perdido = inicio === undefined ? v.trecho.inicioEndereco : v.trecho.fimEndereco;
      pendencias.push({
        normaId,
        versaoId,
        tipo: 'vinculo',
        enderecoAntigo: perdido,
        referenciaId: v.id,
      });
      await repo.colecao('vinculosDisciplina').atualizar(v.id, { trecho: undefined });
    } else if (inicio !== v.trecho.inicioEndereco || fim !== v.trecho.fimEndereco) {
      await repo
        .colecao('vinculosDisciplina')
        .atualizar(v.id, { trecho: { inicioEndereco: inicio, fimEndereco: fim } });
    }
  }

  await repo.colecao('pendenciasReleitura').criarLote(
    pendencias.map((dados) => ({ dados })),
    { origem: 'importacao' },
  );

  // Grifos e notas da versão arquivada: voltam ao texto novo por texto (exato ou parecido); sem
  // texto, pendentes. As já pendentes (de qualquer versão) tentam de novo, como na correção.
  let reancoradas = 0;
  let marcacoesPendentes = 0;
  const marcacoes = await todos(repo.colecao('marcacoes'), {
    indice: 'normaId',
    de: normaId,
    ate: normaId,
  });
  for (const m of marcacoes) {
    if (m.versaoId !== versaoAntigaId && m.status !== 'pendente') continue;
    const textoNovo = textoNovoPorId.get(m.dispositivoId);
    const r =
      textoNovo === undefined
        ? undefined
        : reancorar(
            m.ancora,
            textoNovo,
            m.status === 'pendente' ? undefined : textoAntigoPorId.get(m.dispositivoId),
          );
    if (r === undefined || r.status === 'pendente') {
      marcacoesPendentes += 1;
      if (m.status !== 'pendente') {
        await repo.colecao('marcacoes').atualizar(m.id, { status: 'pendente' });
      }
      continue;
    }
    if (r.status === 'reancorada') reancoradas += 1;
    const status: Marcacao['status'] =
      r.status === 'reancorada' ? 'reancorada' : m.status === 'pendente' ? 'valida' : m.status;
    await repo.colecao('marcacoes').atualizar(m.id, {
      versaoId,
      status,
      ancora: { texto: r.texto, inicio: r.inicio, fim: r.fim },
    });
  }

  // Frases enviadas da versão arquivada (Frases 3): o link de volta segue o texto, como o grifo.
  // O texto da Frase é da pessoa e nunca muda; sem o trecho no texto novo, o link fica como estava.
  const frases = await todos(repo.colecao('frases'), {});
  for (const f of frases) {
    const t = f.trecho;
    if (t?.versaoId !== versaoAntigaId) continue;
    const textoNovo = textoNovoPorId.get(t.dispositivoId);
    if (textoNovo === undefined) continue;
    const r = reancorar(
      { texto: t.texto, inicio: t.inicio, fim: t.fim },
      textoNovo,
      textoAntigoPorId.get(t.dispositivoId),
    );
    if (r.status === 'pendente') continue;
    await repo.colecao('frases').atualizar(f.id, {
      trecho: {
        dispositivoId: t.dispositivoId,
        versaoId,
        texto: r.texto,
        inicio: r.inicio,
        fim: r.fim,
      },
    });
  }

  const novaNorma: Partial<Dados<'normas'>> = {
    versaoVigenteId: versaoId,
    origemAcervo: { id: item.id, versao: item.versao, hash: entrada.hash },
  };
  for (const campo of OPCIONAIS_DA_NORMA) {
    const valor = item.norma[campo];
    if (valor !== undefined) Object.assign(novaNorma, { [campo]: valor });
  }
  await repo.colecao('normas').atualizar(normaId, novaNorma);

  return {
    estado: 'atualizada',
    normaId,
    versaoId,
    comparacao,
    pendencias: pendencias.length,
    reancoradas,
    marcacoesPendentes,
  };
}

const mudou = (atual: Dispositivo, novo: Dados<'dispositivos'>): boolean =>
  atual.endereco !== novo.endereco ||
  atual.categoria !== novo.categoria ||
  atual.tipo !== novo.tipo ||
  atual.ordem !== novo.ordem ||
  atual.status !== novo.status ||
  atual.confianca !== novo.confianca ||
  atual.paiId !== novo.paiId ||
  atual.rotulo !== novo.rotulo ||
  atual.renumeradoDe !== novo.renumeradoDe;

/** Para cada dispositivo perdido, o último anterior (na ordem de leitura) que continua na árvore. */
function anterioresMantidos(
  dispositivos: readonly Dispositivo[],
  mantidos: ReadonlySet<string>,
): Map<string, string | undefined> {
  const saida = new Map<string, string | undefined>();
  let ultimo: string | undefined;
  for (const d of dispositivos) {
    if (mantidos.has(d.id)) ultimo = d.id;
    else saida.set(d.id, ultimo);
  }
  return saida;
}
