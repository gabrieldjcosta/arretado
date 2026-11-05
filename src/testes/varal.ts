// O que os testes do Varal e dos folhetos guardam: duas leis (a LEP, com endereço oficial, e a ECA), duas coleções (súmulas e
// teses do STJ) e uma terceira lei só no acervo, para ter uma disciplina que a pessoa ainda não usou.
import type { Repositorio } from '../core/persistencia';
import { aderirAoItem } from '../dominios/acervo/adesao';
import type { ItemDoAcervo } from '../dominios/acervo/esquemas';
import { FonteEmMemoria } from '../dominios/acervo/fonte-em-memoria';
import { FonteDeIncidencia } from '../dominios/legislacao/incidencia-fonte';

/** O endereço oficial da LEP: só a norma que tem endereço oferece "Atualizar com o Planalto". */
export const OFICIAL_DA_LEP = 'https://www.planalto.gov.br/ccivil_03/leis/l7210.htm';

const no = (endereco: string, rotulo: string, tipo: 'artigo' | 'sumula') => ({
  endereco,
  categoria: 'normativo' as const,
  tipo,
  rotulo,
  status: 'vigente' as const,
  confianca: 'alta' as const,
  trechos: [{ texto: `Texto de ${rotulo}.` }],
});

const lei = (id: string, tituloCurto: string, urlOficial?: string): ItemDoAcervo => ({
  id,
  versao: 1,
  norma: { tituloCurto, tipo: 'Lei', esfera: 'federal', ...(urlOficial ? { urlOficial } : {}) },
  nos: [no('art1', 'Art. 1º', 'artigo'), no('art2', 'Art. 2º', 'artigo')],
});

const colecao = (id: string, tituloCurto: string, especie: 'sumulas' | 'teses'): ItemDoAcervo => ({
  id,
  versao: 1,
  norma: { tituloCurto, tipo: 'Súmulas', esfera: 'federal', especie },
  nos: [no('s593', 'Súmula 593', 'sumula'), no('s594', 'Súmula 594', 'sumula')],
});

/**
 * O acervo do teste e, a menos que `vazio`, tudo puxado dele para o app, menos a CTN (só no acervo). `ids` leva o id de cada
 * item no app (`lei-a` é a LEP, `lei-b` a ECA, `sumulas-stj` e `teses-stj` as coleções).
 */
export async function guardarNoVaral(
  repo: Repositorio,
  opcoes: { vazio?: boolean } = {},
): Promise<{ fonte: FonteEmMemoria; ids: Readonly<Record<string, string>> }> {
  const fonte = await FonteEmMemoria.criar([
    {
      item: lei('lei-a', 'LEP', OFICIAL_DA_LEP),
      vinculos: [{ disciplina: 'Execução Penal' }, { disciplina: 'Penal' }],
    },
    { item: lei('lei-b', 'ECA'), vinculos: [{ disciplina: 'Infância e Juventude' }] },
    { item: lei('lei-c', 'CTN'), vinculos: [{ disciplina: 'Tributário' }] },
    { item: colecao('sumulas-stj', 'Súmulas STJ', 'sumulas') },
    { item: colecao('teses-stj', 'Teses STJ', 'teses') },
  ]);
  const ids: Record<string, string> = {};
  if (!opcoes.vazio) {
    for (const entrada of (await fonte.listar()).itens) {
      if (entrada.id === 'lei-c') continue;
      const r = await aderirAoItem(repo, fonte, entrada);
      if (r.estado === 'adicionada') ids[entrada.id] = r.normaId;
    }
  }
  return { fonte, ids };
}

/** O Mapa: a LEP tem dois artigos que caem (e um que não); a ECA não está no recorte. */
export function fonteDoMapaDoVaral(): FonteDeIncidencia {
  const arquivos: Record<string, unknown> = {
    '/incidencia/indice.json': {
      versao: 1,
      recortes: [{ id: 'fcc-dp', titulo: 'FCC × Defensor', normas: ['lei-a'] }],
    },
    '/incidencia/fcc-dp/lei-a.json': {
      versao: 1,
      recorte: 'fcc-dp',
      norma: 'lei-a',
      artigos: [
        ['1', 3, 'altissima'],
        ['2', 1, 'baixa'],
        ['3', 2, 'media'],
      ],
    },
  };
  const buscar: typeof fetch = (entrada) => {
    const url =
      typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    const corpo = arquivos[url];
    return Promise.resolve(
      corpo === undefined
        ? new Response('não', { status: 404 })
        : new Response(JSON.stringify(corpo), { status: 200 }),
    );
  };
  return new FonteDeIncidencia('/incidencia', buscar, () => Promise.resolve(undefined));
}
