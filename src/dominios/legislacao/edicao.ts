// Edição do rascunho por linha (F2, 10.2; Parte 2 §10.6, "Editor de rascunho/correção"):
// "converter linha em…", "juntar com anterior" e "dividir aqui", mais o salvamento do texto sem
// confirmar (o salvamento automático da tela). Cada operação lê a árvore gravada como linhas,
// aplica a mudança, reconstrói a árvore (pai, endereço, número e ordem feitos pelo sistema) e grava
// só a diferença, numa transação. O rascunho editado à mão é marcado (`+manual` em
// `versaoAdaptador`) e `retomarRascunho` deixa de refazer a árvore pela fonte: a edição sobrevive.
import type { Dispositivo, TextoDeDispositivo } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { textoParaBlocos } from '../../core/seguranca/sanitizador';
import { dispositivosDaNorma, todos } from './consultas';
import {
  converterNaLista,
  dividirNaLista,
  juntarNaLista,
  linhasDoRascunho,
  reconstruir,
  segmentoDoRotulo,
  trechosSimples,
  EdicaoInvalida,
  type ConverterEm,
  type DispositivoDeSaida,
  type LinhaDeEdicao,
} from './edicao-arvore';
import { juntarTexto, reorganizar, textoIntegral, type ResumoIntegral } from './edicao-integral';
import { criarRascunho, marcarEditadoAMao, rascunhoGravado } from './servico';

export { EdicaoInvalida, OPCOES_DE_CONVERSAO, type ConverterEm } from './edicao-arvore';
export type { ResumoIntegral } from './edicao-integral';

type Estado = {
  linhas: LinhaDeEdicao[];
  dispositivos: Dispositivo[];
  textos: Map<string, TextoDeDispositivo>;
};

async function lerEstado(repo: Repositorio, normaId: string, versaoId: string): Promise<Estado> {
  const dispositivos = await dispositivosDaNorma(repo.colecao('dispositivos'), normaId, false);
  const textos = new Map(
    (
      await todos(repo.colecao('textosDispositivo'), {
        indice: 'versaoId',
        de: versaoId,
        ate: versaoId,
      })
    ).map((t) => [t.dispositivoId, t]),
  );
  return { linhas: linhasDoRascunho(dispositivos, textos), dispositivos, textos };
}

const mesmo = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Grava a diferença entre a árvore gravada e a reconstruída; devolve quantos dispositivos mudaram. */
async function gravarDiferenca(
  repo: Repositorio,
  normaId: string,
  versaoId: string,
  estado: Estado,
  saida: readonly DispositivoDeSaida[],
): Promise<void> {
  const dispositivos = repo.colecao('dispositivos');
  const colecaoTextos = repo.colecao('textosDispositivo');
  const gravados = new Map(estado.dispositivos.map((d) => [d.id, d]));
  const mantidos = new Set(saida.map((s) => s.id));
  const removidos = estado.dispositivos.filter((d) => !mantidos.has(d.id));
  await colecaoTextos.removerFisico(
    removidos.flatMap((d) => {
      const t = estado.textos.get(d.id);
      return t ? [t.id] : [];
    }),
  );
  await dispositivos.removerFisico(removidos.map((d) => d.id));
  for (const s of saida) {
    const d = gravados.get(s.id);
    const dados = { ...s.dados };
    if (!d) {
      await dispositivos.criar({ normaId, ...dados }, { id: s.id, origem: 'manual' });
      await colecaoTextos.criar(
        {
          versaoId,
          dispositivoId: s.id,
          normaId,
          trechos: s.texto.trechos,
          ...(s.texto.notas.length > 0 ? { notasVigencia: s.texto.notas } : {}),
          ...(s.texto.redacoes.length > 0 ? { redacoesAnteriores: s.texto.redacoes } : {}),
        },
        { origem: 'manual' },
      );
      continue;
    }
    const alteracoes: Record<string, unknown> = {};
    for (const campo of [
      'endereco',
      'categoria',
      'tipo',
      'ordem',
      'paiId',
      'rotulo',
      'status',
      'renumeradoDe',
      'confianca',
    ] as const) {
      if (!mesmo(d[campo], dados[campo])) alteracoes[campo] = dados[campo];
    }
    if (Object.keys(alteracoes).length > 0) {
      await dispositivos.atualizar(s.id, alteracoes);
    }
    const t = estado.textos.get(s.id);
    if (!t) continue;
    const novo = {
      trechos: s.texto.trechos,
      notasVigencia: s.texto.notas.length > 0 ? s.texto.notas : undefined,
      redacoesAnteriores: s.texto.redacoes.length > 0 ? s.texto.redacoes : undefined,
    };
    const mudancas: Record<string, unknown> = {};
    if (!mesmo(t.trechos, novo.trechos)) mudancas.trechos = novo.trechos;
    if (!mesmo(t.notasVigencia, novo.notasVigencia)) mudancas.notasVigencia = novo.notasVigencia;
    if (!mesmo(t.redacoesAnteriores, novo.redacoesAnteriores)) {
      mudancas.redacoesAnteriores = novo.redacoesAnteriores;
    }
    if (Object.keys(mudancas).length > 0) {
      await colecaoTextos.atualizar(t.id, mudancas);
    }
  }
}

/**
 * Lê, opera, reconstrói e grava, numa transação. `operar` recebe as linhas (na ordem do texto) e
 * devolve as novas. Marca o rascunho como editado à mão.
 */
export async function aplicar(
  repo: Repositorio,
  versaoId: string,
  operar: (linhas: LinhaDeEdicao[]) => LinhaDeEdicao[],
): Promise<void> {
  await repo.transacao(async () => {
    const { norma, versao } = await rascunhoGravado(repo, versaoId);
    const estado = await lerEstado(repo, norma.id, versaoId);
    const saida = reconstruir(operar(estado.linhas));
    await gravarDiferenca(repo, norma.id, versaoId, estado, saida);
    await marcarEditadoAMao(repo, versao);
  });
}

/** Troca o tipo da linha ("converter linha em…"); o sistema dá o número e acerta o recuo. */
export function converterLinha(
  repo: Repositorio,
  versaoId: string,
  dispositivoId: string,
  para: ConverterEm,
): Promise<void> {
  return aplicar(repo, versaoId, (linhas) =>
    converterNaLista(linhas, dispositivoId, para, repo.ctx.novoId),
  );
}

/** Junta a linha à de cima: o texto se une; notas e redações vão juntas. */
export function juntarComAnterior(
  repo: Repositorio,
  versaoId: string,
  dispositivoId: string,
): Promise<void> {
  return aplicar(repo, versaoId, (linhas) => juntarNaLista(linhas, dispositivoId));
}

/**
 * Divide a linha em `posicao` do `texto` (o que está na tela): a segunda parte é uma linha nova do
 * mesmo tipo, "a confirmar", com número do sistema. O texto das duas partes é o da tela.
 */
export async function dividirAqui(
  repo: Repositorio,
  versaoId: string,
  dispositivoId: string,
  texto: string,
  posicao: number,
): Promise<string> {
  let novaId = '';
  await aplicar(repo, versaoId, (linhas) => {
    const antes = new Set(linhas.map((l) => l.id));
    const saida = dividirNaLista(linhas, dispositivoId, texto, posicao, repo.ctx.novoId);
    novaId = saida.find((l) => !antes.has(l.id))?.id ?? '';
    return saida;
  });
  return novaId;
}

export interface TextoSalvo {
  texto: string;
  /** Ausente, o rótulo fica como está. */
  rotulo?: string;
}

/**
 * Salva o texto (e o rótulo) sem confirmar: é o que o salvamento automático grava enquanto se
 * digita. Rótulo que o sistema reconhece ("Art. 6º", "§ 3º", "IV", "b)") muda também o número do
 * endereço, e os filhos o acompanham; o que não reconhece muda só o que está escrito.
 */
export async function salvarTexto(
  repo: Repositorio,
  versaoId: string,
  dispositivoId: string,
  salvo: TextoSalvo,
): Promise<void> {
  const trechos = trechosSimples(salvo.texto);
  const rotulo = salvo.rotulo?.trim();
  if (rotulo !== undefined && rotulo.length > 500)
    throw new EdicaoInvalida('O rótulo passou do limite.');
  // Caminho curto (o salvamento automático roda a cada pausa na digitação): se o número não muda,
  // só o texto e o que está escrito no rótulo são gravados, sem reconstruir a árvore.
  const atual = await repo.colecao('dispositivos').obter(dispositivoId);
  const segmentoNovo = rotulo && atual ? segmentoDoRotulo(atual.tipo, rotulo) : undefined;
  const segmentoAtual = atual?.endereco.slice(atual.endereco.lastIndexOf('.') + 1);
  if (atual && (segmentoNovo === undefined || segmentoNovo === segmentoAtual)) {
    await repo.transacao(async () => {
      const { norma, versao } = await rascunhoGravado(repo, versaoId);
      const [t] = await repo
        .colecao('textosDispositivo')
        .obterPorChaves('[versaoId+dispositivoId]', [[versaoId, dispositivoId]]);
      if (atual.normaId !== norma.id || !t) throw new EdicaoInvalida('Dispositivo não encontrado.');
      await repo.colecao('textosDispositivo').atualizar(t.id, { trechos });
      if (rotulo && rotulo !== atual.rotulo) {
        await repo.colecao('dispositivos').atualizar(atual.id, { rotulo });
      }
      await marcarEditadoAMao(repo, versao);
    });
    return;
  }
  await aplicar(repo, versaoId, (linhas) => {
    const l = linhas.find((x) => x.id === dispositivoId || x.nome?.id === dispositivoId);
    if (!l) throw new EdicaoInvalida('Dispositivo não encontrado.');
    if (l.nome) l.nome.trechos = trechos;
    else l.trechos = trechos;
    if (rotulo && rotulo !== l.rotulo) {
      const segmento = segmentoDoRotulo(l.tipo, rotulo);
      l.rotulo = rotulo;
      if (segmento !== undefined) l.segmento = segmento;
    }
    return linhas;
  });
}

// ── Edição integral (10.4) ──────────────────────────────────────────────────

/** O texto integral do rascunho (uma linha por dispositivo, com o rótulo na frente). */
export async function lerTextoIntegral(repo: Repositorio, versaoId: string): Promise<string> {
  return repo.transacao(async () => {
    const { norma } = await rascunhoGravado(repo, versaoId);
    const { linhas } = await lerEstado(repo, norma.id, versaoId);
    return juntarTexto(textoIntegral(linhas));
  });
}

export interface OpcoesTextoIntegral {
  /**
   * O texto de partida (o que `lerTextoIntegral` deu quando a edição abriu). Se o rascunho mudou
   * desde então (outra aba), nada é gravado: a comparação seria com um texto que a pessoa não viu.
   */
  base: string;
  /** Só calcula o resumo, sem gravar (a tela avisa antes de tirar o que já foi conferido). */
  simular?: boolean;
}

export const MENSAGEM_TEXTO_MUDOU =
  'O rascunho mudou desde que o texto foi aberto (outra aba?). Copie o que escreveu, abra o texto de novo e refaça a mudança.';

/**
 * Salva o texto integral: reorganiza em dispositivos preservando o que não mudou (regras em
 * `edicao-integral.ts`), reconstrói a árvore e grava só a diferença, numa transação. Devolve o
 * resumo do que ficou, mudou, entrou e saiu.
 */
export async function salvarTextoIntegral(
  repo: Repositorio,
  versaoId: string,
  texto: string,
  opcoes: OpcoesTextoIntegral,
): Promise<ResumoIntegral> {
  let resumo: ResumoIntegral | undefined;
  const operar = (linhas: LinhaDeEdicao[]) => {
    if (juntarTexto(textoIntegral(linhas)) !== opcoes.base) {
      throw new EdicaoInvalida(MENSAGEM_TEXTO_MUDOU);
    }
    const reorganizado = reorganizar(linhas, texto, repo.ctx.novoId);
    resumo = reorganizado.resumo;
    return reorganizado.linhas;
  };
  if (opcoes.simular) {
    await repo.transacao(async () => {
      const { norma } = await rascunhoGravado(repo, versaoId);
      operar((await lerEstado(repo, norma.id, versaoId)).linhas);
    });
  } else {
    await aplicar(repo, versaoId, operar);
  }
  if (!resumo) throw new EdicaoInvalida('Nada a salvar.');
  return resumo;
}

/** O texto de partida da norma escrita do zero: um artigo vazio. */
export const TEXTO_DO_ARTIGO_VAZIO = 'Art. 1º';

/**
 * Inserção manual (Parte 2 §10.6: súmula, enunciado, norma pequena): um rascunho com um artigo
 * vazio, para ser escrito no editor integral. Entra como texto puro (tudo "a confirmar") e já
 * marcado como editado à mão, para a árvore nunca ser refeita pela fonte.
 */
export async function escreverNorma(
  repo: Repositorio,
  tituloCurto: string,
): Promise<{ normaId: string; versaoId: string }> {
  const titulo = tituloCurto.trim();
  if (titulo === '') throw new EdicaoInvalida('Dê um título curto à norma.');
  if (titulo.length > 500) throw new EdicaoInvalida('O título passou do limite.');
  const criado = await criarRascunho(repo, {
    blocos: textoParaBlocos(TEXTO_DO_ARTIGO_VAZIO),
    origemEntrada: 'texto',
    tituloCurto: titulo,
  });
  await repo.transacao(async () => {
    const { versao } = await rascunhoGravado(repo, criado.versao.id);
    await marcarEditadoAMao(repo, versao);
  });
  return { normaId: criado.norma.id, versaoId: criado.versao.id };
}
