// A busca única do alto do Varal (plano, "Dentro do Varal"): "112 LEP" abre o artigo, "711" lista a súmula, uma palavra lista
// as normas que a têm no nome. Só olha o que a pessoa guardou e não tirou do varal. As Frases entram com o folheto delas.
import type { Norma } from '../../../core/modelo';
import type { Repositorio } from '../../../core/persistencia';
import {
  analisarEndereco,
  consultaDeBusca,
  resolverEndereco,
} from '../../../dominios/legislacao/busca';
import { abrirNorma, normasPublicadas } from '../../../dominios/legislacao/leitor';
import { analisarSumula, analisarTese } from '../../../dominios/legislacao/sumulas';
import { referenciaDoNo } from '../../biblioteca/linhas';

export interface Achado {
  chave: string;
  nome: string;
  detalhe: string;
  /** A rota que abre (o Leitor, no artigo ou na súmula quando houver). */
  para: string;
}

/** O máximo de achados na lista: ela é um atalho, não um relatório. */
const LIMITE = 12;

const ehColecao = (n: Norma) => n.especie === 'sumulas' || n.especie === 'teses';

/** "art. 112 da lep" sem o título "lep" é "art. 112": o que sobra para ler como endereço. `undefined` se o título não está. */
function semOTitulo(consulta: string, titulo: string): string | undefined {
  if (titulo === '') return undefined;
  const cercado = ` ${consulta} `;
  if (!cercado.includes(` ${titulo} `)) return undefined;
  return (
    cercado
      .replace(` ${titulo} `, ' ')
      .trim()
      // "art. 112 da" (o "da" ficou sem o que vem depois): sai.
      .replace(/(?:^|\s)(?:d[oae]s?|n[oa]s?|em)$/u, '')
      .trim()
  );
}

/** "Art. 112" vira "art. 112", como se cita. */
const comoSeCita = (rotulo: string) =>
  rotulo.startsWith('Art.') ? `art.${rotulo.slice(4)}` : rotulo;

/**
 * O que o Varal acha para o que a pessoa digitou. Artigos primeiro ("112 LEP": o mais específico), depois súmulas e teses
 * pelo número, depois as normas pelo nome. `tirados` são os ids que a pessoa tirou do varal: não aparecem.
 */
export async function acharNoVaral(
  repo: Repositorio,
  texto: string,
  tirados: ReadonlySet<string>,
): Promise<Achado[]> {
  const consulta = consultaDeBusca(texto);
  if (consulta.length < 2) return [];
  const publicadas = (await normasPublicadas(repo)).filter((n) => !tirados.has(n.id));
  const normas = publicadas.filter((n) => !ehColecao(n));
  const colecoes = publicadas.filter(ehColecao);

  const achados: Achado[] = [];
  const vistos = new Set<string>();
  const pôr = (a: Achado) => {
    if (vistos.has(a.chave)) return;
    vistos.add(a.chave);
    achados.push(a);
  };

  // Um artigo numa norma: "112 LEP", "art. 112 da LEP", "LEP 112".
  for (const n of normas) {
    const resto = semOTitulo(consulta, consultaDeBusca(n.tituloCurto));
    if (resto === undefined || resto === '') continue;
    const possiveis = analisarEndereco(resto);
    if (possiveis.length === 0) continue;
    const aberta = await abrirNorma(repo, n.id).catch(() => undefined);
    if (!aberta) continue;
    const enderecos = new Set(aberta.nos.map((no) => no.dispositivo.endereco));
    const achado = resolverEndereco(possiveis, (e) => enderecos.has(e));
    if (!achado) continue;
    const indice = aberta.nos.findIndex((no) => no.dispositivo.endereco === achado.endereco);
    const rotulo = referenciaDoNo(aberta.nos, aberta.indiceDe, indice);
    pôr({
      chave: `${n.id}#${achado.endereco}`,
      nome: rotulo === '' ? n.tituloCurto : `${n.tituloCurto}, ${comoSeCita(rotulo)}`,
      detalhe: 'abre no Leitor',
      para: `/biblioteca/normas/${n.id}?ir=${achado.endereco}`,
    });
  }

  // Uma súmula ou uma tese pelo número: "711", "súmula 593", "SV 11", "tese 12".
  const deSumula = analisarSumula(texto);
  const deTese = analisarTese(texto);
  for (const c of colecoes) {
    const procurados = c.especie === 'teses' ? deTese : deSumula;
    if (procurados.length === 0) continue;
    const aberta = await abrirNorma(repo, c.id).catch(() => undefined);
    if (!aberta) continue;
    for (const endereco of procurados) {
      const no = aberta.nos.find((x) => x.dispositivo.endereco === endereco);
      if (!no) continue;
      pôr({
        chave: `${c.id}#${endereco}`,
        nome: no.dispositivo.rotulo ?? endereco,
        detalhe: c.tituloCurto,
        para: `/biblioteca/normas/${c.id}?ir=${endereco}`,
      });
    }
  }

  // As normas e coleções pelo nome.
  for (const n of publicadas) {
    if (!consultaDeBusca(n.tituloCurto).includes(consulta)) continue;
    pôr({
      chave: n.id,
      nome: n.tituloCurto,
      detalhe: n.especie === 'teses' ? 'teses' : n.especie === 'sumulas' ? 'súmulas' : 'norma',
      para: `/biblioteca/normas/${n.id}`,
    });
  }
  return achados.slice(0, LIMITE);
}
