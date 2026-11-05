// O que o Varal e os folhetos leem do app: as contagens e as linhas de verdade, no lugar dos números de enfeite do mockup.
// O mockup tem sete normas e cinco súmulas de exemplo; aqui as normas são as que a pessoa guardou, e "Súmulas e teses" são
// as coleções que ela puxou do acervo (o app só conhece coleções, não súmula solta).
import type { Norma } from '../../../core/modelo';
import type { Repositorio } from '../../../core/persistencia';
import { obterPreferencias } from '../../../core/preferencias';
import type { FonteDeIncidencia } from '../../../dominios/legislacao/incidencia-fonte';
import { dispositivosDaNorma } from '../../../dominios/legislacao/consultas';
import { normasPublicadas } from '../../../dominios/legislacao/leitor';
import { leiturasPorNorma, lidaEm } from '../../../dominios/legislacao/leituras';
import { listarResumos } from '../../../dominios/notas/resumos';
import { contarFrasesVencidas, contarVencidos } from '../../../dominios/recall/servico';
import { pontoDaLeitura, ultimaLida } from '../../biblioteca/ponto-da-leitura';
import { contar, haQuantoTempo, type LinhaDoFolheto } from './varal-lista';

/** O quanto se espera o arquivo do Mapa de uma norma antes de seguir sem ele (como o Destino). */
const ESPERA_DO_MAPA_MS = 1200;

const ehColecao = (n: Norma) => n.especie === 'sumulas' || n.especie === 'teses';

/** O que o Varal mostra em cada folheto: o número miúdo e a linha de estado. */
export interface DadosDoVaral {
  /** Os ids, para o Varal descontar o que a pessoa tirou deste aparelho. */
  normaIds: readonly string[];
  colecaoIds: readonly string[];
  /** "LEP, art. 112": a norma lida por último e o ponto dela; `undefined` se nenhuma foi aberta. */
  retomar: string | undefined;
  textos: number;
  frases: number;
  frasesVencidas: number;
  cartoes: number;
  cartoesVencidos: number;
  lembrete: boolean;
}

/** "Art. 112" vira "art. 112", como se cita; "TÍTULO I" fica como está. */
const comoSeCita = (referencia: string) =>
  referencia.startsWith('Art.') ? `art.${referencia.slice(4)}` : referencia;

export async function carregarDadosDoVaral(repo: Repositorio): Promise<DadosDoVaral> {
  const [
    publicadas,
    leituras,
    resumos,
    precedentes,
    frases,
    frasesVencidas,
    cartoes,
    cartoesVencidos,
    preferencias,
  ] = await Promise.all([
    normasPublicadas(repo),
    leiturasPorNorma(repo),
    listarResumos(repo),
    repo.colecao('precedentes').contar(),
    // As arquivadas não estão no Caderno: o número do folheto é o das Frases que ele mostra.
    repo.colecao('frases').contar({ filtro: (f) => f.estado === 'ativa' }),
    contarFrasesVencidas(repo),
    repo.colecao('cartoes').contar(),
    contarVencidos(repo),
    obterPreferencias(repo),
  ]);
  const normas = publicadas.filter((n) => !ehColecao(n));
  const ultima = ultimaLida(normas, leituras);
  const ponto = ultima && (await pontoDaLeitura(repo, ultima.id, leituras));
  return {
    normaIds: normas.map((n) => n.id),
    colecaoIds: publicadas.filter(ehColecao).map((n) => n.id),
    retomar: ultima
      ? ponto
        ? `${ultima.tituloCurto}, ${comoSeCita(ponto.referencia)}`
        : ultima.tituloCurto
      : undefined,
    textos: resumos.length + precedentes,
    frases,
    frasesVencidas,
    cartoes,
    cartoesVencidos,
    lembrete: (preferencias.lembrete ?? '').trim() !== '',
  };
}

/** Os nomes das disciplinas de cada norma (vínculos vivos), em ordem alfabética; "Outros" não entra. */
async function disciplinasPorNorma(repo: Repositorio): Promise<Map<string, string[]>> {
  const [vinculos, disciplinas] = await Promise.all([
    repo.colecao('vinculosDisciplina').todosDoUsuario(),
    repo.colecao('disciplinas').todosDoUsuario(),
  ]);
  const nomeDe = new Map(
    disciplinas.filter((d) => d.excluidoEm === null).map((d) => [d.id, d.nome]),
  );
  const porNorma = new Map<string, Set<string>>();
  for (const v of vinculos) {
    if (v.excluidoEm !== null) continue;
    const nome =
      (v.disciplinaId === undefined ? undefined : nomeDe.get(v.disciplinaId)) ?? v.sugestao;
    if (nome === undefined) continue;
    const nomes = porNorma.get(v.normaId) ?? new Set<string>();
    nomes.add(nome);
    porNorma.set(v.normaId, nomes);
  }
  return new Map(
    [...porNorma].map(([id, nomes]) => [
      id,
      [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    ]),
  );
}

/** Quantos artigos do Mapa caem (da faixa média para cima); `undefined` se a norma não tem Mapa ou ele não chega a tempo. */
async function artigosQueCaem(
  fonte: Pick<FonteDeIncidencia, 'mapaDaNorma'>,
  norma: Norma,
  limite: Promise<undefined>,
): Promise<number | undefined> {
  const acervoId = norma.origemAcervo?.id;
  if (acervoId === undefined) return undefined;
  const carregado = await Promise.race([
    fonte.mapaDaNorma(acervoId).catch(() => undefined),
    limite,
  ]);
  return carregado?.dados.artigos.filter(([, , faixa]) => faixa !== 'baixa').length;
}

async function dataDaVersao(repo: Repositorio, norma: Norma): Promise<string | undefined> {
  if (norma.versaoVigenteId === undefined) return undefined;
  return (await repo.colecao('versoesNorma').obter(norma.versaoVigenteId))?.capturadaEm;
}

/** "26 artigos que caem". */
const textoDoMapa = (n: number) => contar(n, 'artigo que cai', 'artigos que caem');

/** As linhas do folheto das Normas: as que a pessoa guardou (menos as coleções), com o Mapa e a leitura de cada uma. */
export async function carregarLinhasDeNormas(
  repo: Repositorio,
  fonte: Pick<FonteDeIncidencia, 'mapaDaNorma'>,
  agora: Date = new Date(),
  esperaDoMapaMs: number = ESPERA_DO_MAPA_MS,
): Promise<LinhaDoFolheto[]> {
  const [publicadas, leituras, disciplinas] = await Promise.all([
    normasPublicadas(repo),
    leiturasPorNorma(repo),
    disciplinasPorNorma(repo),
  ]);
  const normas = publicadas.filter((n) => !ehColecao(n));
  const vez = ultimaLida(normas, leituras)?.id;
  let relogio: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<undefined>((resolver) => {
    relogio = setTimeout(() => {
      resolver(undefined);
    }, esperaDoMapaMs);
  });
  try {
    return await Promise.all(
      normas.map(async (n): Promise<LinhaDoFolheto> => {
        const [cai, capturada] = await Promise.all([
          artigosQueCaem(fonte, n, limite),
          dataDaVersao(repo, n),
        ]);
        const leitura = leituras.get(n.id);
        const faz = haQuantoTempo(capturada, agora);
        return {
          id: n.id,
          nome: n.tituloCurto,
          disciplinas: disciplinas.get(n.id) ?? [],
          cai,
          textoCai: cai === undefined ? undefined : textoDoMapa(cai),
          recencia: leitura ? Date.parse(lidaEm(leitura)) || 0 : 0,
          textoData: faz === undefined ? 'guardada' : `guardada ${faz}`,
          versaoNova: false,
          vez: n.id === vez,
          oficial: n.urlOficial !== undefined,
          para: `/biblioteca/normas/${n.id}`,
        };
      }),
    );
  } finally {
    clearTimeout(relogio);
  }
}

/** As linhas do folheto "Súmulas e teses": as coleções que a pessoa puxou, com quantos itens cada uma tem. */
export async function carregarLinhasDeColecoes(
  repo: Repositorio,
  agora: Date = new Date(),
): Promise<LinhaDoFolheto[]> {
  const [publicadas, leituras, disciplinas] = await Promise.all([
    normasPublicadas(repo),
    leiturasPorNorma(repo),
    disciplinasPorNorma(repo),
  ]);
  const colecoes = publicadas.filter(ehColecao);
  const vez = ultimaLida(colecoes, leituras)?.id;
  return Promise.all(
    colecoes.map(async (n): Promise<LinhaDoFolheto> => {
      const [dispositivos, capturada] = await Promise.all([
        dispositivosDaNorma(repo.colecao('dispositivos'), n.id, false),
        dataDaVersao(repo, n),
      ]);
      const itens = dispositivos.filter((d) => d.tipo === 'sumula' || d.tipo === 'tese').length;
      const leitura = leituras.get(n.id);
      const faz = haQuantoTempo(capturada, agora);
      return {
        id: n.id,
        nome: n.tituloCurto,
        disciplinas: disciplinas.get(n.id) ?? [],
        cai: itens,
        textoCai:
          n.especie === 'teses'
            ? contar(itens, 'tese', 'teses')
            : contar(itens, 'súmula', 'súmulas'),
        recencia: leitura ? Date.parse(lidaEm(leitura)) || 0 : 0,
        textoData: faz === undefined ? 'guardada' : `guardada ${faz}`,
        versaoNova: false,
        vez: n.id === vez,
        oficial: false,
        para: `/biblioteca/normas/${n.id}`,
      };
    }),
  );
}
