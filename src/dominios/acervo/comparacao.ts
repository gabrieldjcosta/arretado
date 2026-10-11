// Comparação de duas árvores por endereço (spec §9, Peça 6a): o que entrou, mudou, foi revogado,
// renumerado ou sumiu. Pura: não toca no banco, serve à prévia e à aplicação da atualização.
import type { Dispositivo, TextoDeDispositivo } from '../../core/modelo';
import type { NoDoItem } from './esquemas';

type Trechos = TextoDeDispositivo['trechos'];

/** O texto como o leitor o mede (os trechos juntos, o tachado inclusive; como a âncora dos grifos). */
export const textoDosTrechos = (trechos: Trechos): string => trechos.map((t) => t.texto).join('');

/** Chave de igualdade do texto: o texto e a forma (tachado, ênfase, link). */
const chaveDosTrechos = (trechos: Trechos): string =>
  JSON.stringify(
    trechos.map((t) => [t.texto, t.tachado === true, t.enfase === true, t.link ?? '']),
  );

export interface NoAntigo {
  endereco: string;
  status: Dispositivo['status'];
  rotulo?: string | undefined;
  trechos: Trechos;
}

export interface NoMudado {
  endereco: string;
  rotulo?: string | undefined;
}

export interface Renumerado extends NoMudado {
  /** O endereço de antes; `endereco` é o novo. */
  de: string;
}

export interface ComparacaoDeVersoes {
  incluidos: NoMudado[];
  alterados: NoMudado[];
  revogados: NoMudado[];
  renumerados: Renumerado[];
  /** Sem endereço na versão nova e sem renumeração que o explique: vão para as pendências. */
  removidos: NoMudado[];
  iguais: number;
  /** Endereço de antes → endereço de agora; `undefined` quando o endereço se perdeu. */
  novoEndereco: Map<string, string | undefined>;
}

const REVOGADO = new Set<Dispositivo['status']>(['revogado', 'eficacia_cessada']);

const mudado = (endereco: string, rotulo: string | undefined): NoMudado =>
  rotulo === undefined ? { endereco } : { endereco, rotulo };

export function compararArvores(
  antigos: readonly NoAntigo[],
  novos: readonly NoDoItem[],
): ComparacaoDeVersoes {
  const antigoPorEndereco = new Map(antigos.map((n) => [n.endereco, n]));
  const enderecosNovos = new Set(novos.map((n) => n.endereco));
  // Renumeração: o novo diz de onde veio (`renumeradoDe`), o endereço de antes sumiu e o de agora
  // não existia. Quem reivindica primeiro leva; o resto é inclusão.
  const renumeradoPara = new Map<string, string>();
  const reivindicados = new Set<string>();
  for (const n of novos) {
    const de = n.renumeradoDe;
    if (de === undefined || antigoPorEndereco.has(n.endereco)) continue;
    if (!antigoPorEndereco.has(de) || enderecosNovos.has(de) || reivindicados.has(de)) continue;
    reivindicados.add(de);
    renumeradoPara.set(n.endereco, de);
  }
  const saida: ComparacaoDeVersoes = {
    incluidos: [],
    alterados: [],
    revogados: [],
    renumerados: [],
    removidos: [],
    iguais: 0,
    novoEndereco: new Map(),
  };
  for (const n of novos) {
    const de = renumeradoPara.get(n.endereco);
    if (de !== undefined) {
      saida.renumerados.push({ ...mudado(n.endereco, n.rotulo), de });
      saida.novoEndereco.set(de, n.endereco);
      continue;
    }
    const antigo = antigoPorEndereco.get(n.endereco);
    if (!antigo) {
      saida.incluidos.push(mudado(n.endereco, n.rotulo));
      continue;
    }
    saida.novoEndereco.set(n.endereco, n.endereco);
    if (REVOGADO.has(n.status) && !REVOGADO.has(antigo.status)) {
      saida.revogados.push(mudado(n.endereco, n.rotulo));
    } else if (
      n.status !== antigo.status ||
      chaveDosTrechos(n.trechos) !== chaveDosTrechos(antigo.trechos)
    ) {
      saida.alterados.push(mudado(n.endereco, n.rotulo));
    } else {
      saida.iguais += 1;
    }
  }
  for (const a of antigos) {
    if (saida.novoEndereco.has(a.endereco)) continue;
    saida.novoEndereco.set(a.endereco, undefined);
    saida.removidos.push(mudado(a.endereco, a.rotulo));
  }
  return saida;
}

/** O que mudou, em números, para a tela mostrar antes de o usuário atualizar. */
export function resumoDaComparacao(c: ComparacaoDeVersoes) {
  return {
    incluidos: c.incluidos.length,
    alterados: c.alterados.length,
    revogados: c.revogados.length,
    renumerados: c.renumerados.length,
    removidos: c.removidos.length,
    iguais: c.iguais,
  };
}

/** Reancoragem por texto (exata → aproximada → pendente): fica no core, para a 11.7 usar também. */
export { reancorar } from '../../core/util/reancoragem';
