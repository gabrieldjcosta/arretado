// Validação estrutural (F2, 8.7; Parte 2 §10.6, regra 13) e a gravidade de cada anomalia (regra
// 12). Roda sobre a árvore do rascunho (`validarEstrutura`, no fim do estruturador) e sobre os
// registros gravados (`validarNos`, na verificação da publicação, 9.3: o editor da etapa 10 muda os
// registros, não a fonte). As frases não têm número de linha e são as mesmas nos dois caminhos: a
// tela (9.5) junta as duas listas e tira as repetidas pela mensagem. Puro, sem banco, linear.
import type { TipoDispositivo } from '../../core/modelo';
import { acrescentar } from './linhas';
import { emOrdemDeLeitura } from './ordem';
import type {
  Anomalia,
  Confianca,
  FormatoEntrada,
  GravidadeAnomalia,
  NoRascunho,
  Rascunho,
  StatusDispositivo,
  TipoAnomalia,
} from './rascunho';
import { categoriaDe, rotuloDoModelo } from './registros';

/** Regra 12: acima desta fração de nós "a confirmar", a fonte pode ter mudado de formato. */
export const LIMITE_A_CONFIRMAR = 0.2;

/**
 * Uma gravidade por tipo, na ordem da lista fechada (a do relatório de anomalias do sumário).
 * Conflito bloqueia a publicação; o resto só informa.
 */
export const GRAVIDADE: Readonly<Record<TipoAnomalia, GravidadeAnomalia>> = {
  // Leitura (regras 1–12): a ambiguidade já deixou o nó com confiança média.
  caractere_perdido: 'aviso',
  linha_solta: 'aviso',
  linha_continuada: 'aviso',
  duplicata: 'aviso',
  artigo_so_tachado: 'aviso',
  estrutural_substituido: 'aviso',
  tachado_sem_dispositivo: 'aviso',
  sem_pai: 'aviso',
  // Validação (regra 13). O estrutural repetido (LC 80, duas "SEÇÃO IV") só avisa: o artigo é
  // único, o leitor lê a norma e a revisão (etapa 10) corrige o rótulo (decisão da 9.3, mantida).
  sem_artigos: 'conflito',
  endereco_duplicado: 'conflito',
  estrutural_repetido: 'aviso',
  artigo_fora_de_ordem: 'aviso',
  artigo_ausente: 'aviso',
  alinea_sem_inciso: 'aviso',
  item_sem_alinea: 'aviso',
  paragrafo_unico_com_numerado: 'aviso',
  paragrafo_1_sem_2: 'aviso',
  a_confirmar_acima_do_limite: 'aviso',
};

/** Os tipos na ordem da lista fechada. */
export const TIPOS_DE_ANOMALIA = Object.keys(GRAVIDADE) as readonly TipoAnomalia[];

/** Toda anomalia nasce aqui: a gravidade sai de `GRAVIDADE`, nunca de quem a cria. */
export function anomalia(
  tipo: TipoAnomalia,
  mensagem: string,
  onde: { endereco?: string | undefined; linha?: number | undefined } = {},
): Anomalia {
  return {
    tipo,
    gravidade: GRAVIDADE[tipo],
    ...(onde.endereco === undefined ? {} : { endereco: onde.endereco }),
    ...(onde.linha === undefined ? {} : { linha: onde.linha }),
    mensagem,
  };
}

/** O que a regra 13 lê de cada nó, venha do rascunho ou dos registros gravados. */
export interface NoValidado {
  tipo: TipoDispositivo;
  endereco: string;
  rotulo?: string;
  status: StatusDispositivo;
  confianca: Confianca;
  /** `categoriaDe` (parte a subseção, bloco e o nome deles), como a gravação. */
  estrutural: boolean;
  /** Índice do pai nesta mesma lista, que vem em ordem de leitura. */
  pai?: number;
  /** Primeira linha na entrada (só no rascunho), para o editor abrir no lugar. */
  linha?: number;
}

/** Os nós do rascunho em ordem de leitura, com o rótulo e a categoria que a gravação dá. */
export function nosDoRascunho(nos: readonly NoRascunho[]): NoValidado[] {
  const indice = new Map<NoRascunho, number>();
  return emOrdemDeLeitura(nos).map(({ no, pai }, k) => {
    indice.set(no, k);
    const p = pai && indice.get(pai);
    return {
      tipo: no.tipo,
      endereco: no.endereco,
      rotulo: rotuloDoModelo(no.rotulo),
      status: no.status,
      confianca: no.confianca,
      estrutural: categoriaDe(no, pai) === 'estrutural',
      ...(p === undefined ? {} : { pai: p }),
      linha: no.linhas.inicio,
    };
  });
}

/**
 * Regra 12: o nó de endereço em conflito fica "a confirmar" (o estruturador, antes de devolver o
 * rascunho; a gravação guarda a confiança, e a publicação conta os gravados).
 */
export function marcarConflitos(nos: readonly NoRascunho[], anomalias: readonly Anomalia[]): void {
  const emConflito = new Set(
    anomalias.flatMap((a) =>
      a.gravidade === 'conflito' && a.endereco !== undefined ? [a.endereco] : [],
    ),
  );
  if (emConflito.size === 0) return;
  for (const { no } of emOrdemDeLeitura(nos))
    if (emConflito.has(no.endereco)) no.confianca = 'a_confirmar';
}

export function validarEstrutura(rascunho: Pick<Rascunho, 'nos' | 'formatoEntrada'>): Anomalia[] {
  return validarNos(nosDoRascunho(rascunho.nos), rascunho.formatoEntrada);
}

/** Artigo lido do endereço: numeração (o prefixo do bloco: '', `adct`, `dt`), número e sufixo. */
interface ArtigoNumerado {
  no: NoValidado;
  numeracao: string;
  numero: number;
  sufixo: string;
}

/** Último segmento do endereço do artigo (`art9A`, `art359MA`, `artUnico`). */
const SEGMENTO_DO_ARTIGO = /^art(\d+|Unico)([A-Z]*)$/;

function numerado(no: NoValidado): ArtigoNumerado | undefined {
  const ponto = no.endereco.lastIndexOf('.');
  const m = SEGMENTO_DO_ARTIGO.exec(no.endereco.slice(ponto + 1));
  if (!m) return undefined;
  const [, numero = '', sufixo = ''] = m;
  return {
    no,
    numeracao: ponto < 0 ? '' : no.endereco.slice(0, ponto),
    numero: numero === 'Unico' ? 1 : Number(numero),
    sufixo,
  };
}

/** Número, depois sufixo, com o prefixo mais curto antes ('' < 'A' < 'AA' < 'B'). */
function comparar(a: ArtigoNumerado, b: ArtigoNumerado): number {
  if (a.numero !== b.numero) return a.numero - b.numero;
  return a.sufixo < b.sufixo ? -1 : a.sufixo > b.sufixo ? 1 : 0;
}

/** O sufixo de uma letra que segue `sufixo` ('' → 'A'; 'A' e 'AZ' → 'B'). */
const letraSeguinte = (sufixo: string): string =>
  sufixo === '' ? 'A' : String.fromCharCode(sufixo.charCodeAt(0) + 1);

/**
 * Falta artigo entre o maior já lido e o seguinte: salto de número (art5 → art8), sufixo sem o
 * número-base (art8 → art9A) ou salto de sufixo de uma letra ('' → 'B', 'A' → 'C').
 */
function faltaEntre(maior: ArtigoNumerado, seguinte: ArtigoNumerado): boolean {
  if (seguinte.numero > maior.numero + 1) return true;
  if (seguinte.numero === maior.numero + 1) return seguinte.sufixo !== '';
  return seguinte.sufixo.length === 1 && seguinte.sufixo > letraSeguinte(maior.sufixo);
}

/** Prefixo do bloco com numeração própria no endereço do artigo (`adct.art2`, `dt.art5.par1`). */
const BLOCO_DO_ARTIGO = /^(\w+)\.art/;

/**
 * "Art. 92" → "art. 92", para o meio da frase; sem rótulo, o endereço. No bloco com numeração
 * própria, o prefixo do endereço vai depois do rótulo, em maiúsculas ("art. 2º (ADCT)"): o art. 2º
 * do corpo e o do ADCT dão frases diferentes, e iguais no rascunho e nos registros.
 */
function naFrase(no: NoValidado): string {
  if (no.rotulo === undefined) return no.endereco;
  const rotulo = no.rotulo.startsWith('Art.') ? `art.${no.rotulo.slice(4)}` : no.rotulo;
  const bloco = BLOCO_DO_ARTIGO.exec(no.endereco)?.[1];
  return bloco === undefined ? rotulo : `${rotulo} (${bloco.toUpperCase()})`;
}

const quantos = (n: number) => n.toLocaleString('pt-BR');

const ALINEA_SEM_INCISO =
  'Há alíneas direto no parágrafo ou no caput, sem inciso (comum em lei anterior à LC 95/1998); ficaram como estão.';
const ITEM_SEM_ALINEA =
  'Há itens direto no inciso, no parágrafo ou no caput, sem alínea (comum em lei estadual ou anterior à LC 95/1998); ficaram como estão.';

/** Os parágrafos de um nó: parágrafo único e numerado que não estão revogados, § 1º e § 2º. */
interface Paragrafos {
  unico: boolean;
  /** O primeiro numerado não revogado (o rótulo vai na frase). */
  numerado?: NoValidado;
  par1: boolean;
  par2: boolean;
}

/**
 * Regra 13 sobre os nós em ordem de leitura (o pai antes do filho), numa passada: norma sem
 * artigo e endereço repetido (conflitos, salvo o repetido só de estruturais), artigos fora de
 * ordem e ausentes por numeração, alínea sem inciso e item sem alínea (um por nó, com a mesma
 * frase), parágrafo único com numerado e § 1º sem § 2º, e o aviso dos 20% "a confirmar".
 */
export function validarNos(nos: readonly NoValidado[], formato: FormatoEntrada): Anomalia[] {
  const saida: Anomalia[] = [];
  const porEndereco = new Map<string, number[]>();
  const numeracoes = new Map<string, { anterior: ArtigoNumerado; maior: ArtigoNumerado }>();
  const artigos: Anomalia[] = [];
  const alineas: Anomalia[] = [];
  const itens: Anomalia[] = [];
  const paragrafos = new Map<number, Paragrafos>();
  let totalDeArtigos = 0;
  let aConfirmar = 0;
  for (let k = 0; k < nos.length; k++) {
    const no = nos[k] as NoValidado;
    const onde = { endereco: no.endereco, linha: no.linha };
    const pai = no.pai === undefined ? undefined : nos[no.pai];
    if (no.confianca === 'a_confirmar') aConfirmar += 1;
    const mesmos = porEndereco.get(no.endereco);
    if (mesmos) mesmos.push(k);
    else porEndereco.set(no.endereco, [k]);
    if (no.tipo === 'artigo') {
      totalDeArtigos += 1;
      const lido = numerado(no);
      if (!lido) continue;
      const estado = numeracoes.get(lido.numeracao);
      if (!estado) {
        numeracoes.set(lido.numeracao, { anterior: lido, maior: lido });
        if (lido.numero !== 1 || lido.sufixo !== '')
          artigos.push(
            anomalia(
              'artigo_ausente',
              `Antes do ${naFrase(no)} faltam artigos: confira se a página veio inteira.`,
              onde,
            ),
          );
        continue;
      }
      // Comparado com o anterior, a volta da numeração aparece uma vez (a citação de outra lei no
      // meio); a falta, com o maior já lido, não se repete depois dela.
      if (comparar(lido, estado.anterior) < 0)
        artigos.push(
          anomalia(
            'artigo_fora_de_ordem',
            `O ${naFrase(no)} vem depois do ${naFrase(estado.anterior.no)}: a numeração volta; confira se não é citação de outra lei.`,
            onde,
          ),
        );
      else if (comparar(lido, estado.maior) > 0) {
        if (faltaEntre(estado.maior, lido))
          artigos.push(
            anomalia(
              'artigo_ausente',
              `Entre o ${naFrase(estado.maior.no)} e o ${naFrase(no)} faltam artigos: confira se a página veio inteira.`,
              onde,
            ),
          );
        estado.maior = lido;
      }
      estado.anterior = lido;
    } else if (no.tipo === 'alinea') {
      if (pai?.tipo !== 'inciso')
        alineas.push(anomalia('alinea_sem_inciso', ALINEA_SEM_INCISO, onde));
    } else if (no.tipo === 'item') {
      if (pai?.tipo !== 'alinea') itens.push(anomalia('item_sem_alinea', ITEM_SEM_ALINEA, onde));
    } else if (no.tipo === 'paragrafo' && no.pai !== undefined) {
      let p = paragrafos.get(no.pai);
      if (!p) {
        p = { unico: false, par1: false, par2: false };
        paragrafos.set(no.pai, p);
      }
      const segmento = no.endereco.slice(no.endereco.lastIndexOf('.') + 1);
      // O vetado conta (o veto mantém o número); a gravação ainda o grava vigente.
      const vivo = no.status !== 'revogado';
      if (segmento === 'parUnico') p.unico ||= vivo;
      else if (vivo && !p.numerado && /^par\d/.test(segmento)) p.numerado = no;
      if (segmento === 'par1') p.par1 = true;
      if (segmento === 'par2') p.par2 = true;
    }
  }

  if (totalDeArtigos === 0)
    saida.push(anomalia('sem_artigos', 'Não consegui identificar artigos.'));
  const emConflito = new Set<string>();
  for (const [endereco, indices] of porEndereco) {
    if (indices.length < 2) continue;
    const repetidos = indices.map((i) => nos[i] as NoValidado);
    const rotulos = [...new Set(repetidos.map((n) => n.rotulo ?? endereco))].join(', ');
    const frase = `O endereço ${endereco} aparece ${String(indices.length)} vezes (${rotulos})`;
    const onde = { endereco, linha: repetidos[0]?.linha };
    if (repetidos.every((n) => n.estrutural)) {
      saida.push(
        anomalia(
          'estrutural_repetido',
          `${frase}: a fonte repete a numeração. Dá para publicar; corrija o rótulo na revisão.`,
          onde,
        ),
      );
    } else {
      emConflito.add(endereco);
      for (const n of repetidos) if (n.confianca !== 'a_confirmar') aConfirmar += 1;
      saida.push(anomalia('endereco_duplicado', `${frase}. Corrija antes de publicar.`, onde));
    }
  }
  acrescentar(saida, artigos);
  acrescentar(saida, alineas);
  acrescentar(saida, itens);
  for (const [k, p] of paragrafos) {
    const pai = nos[k] as NoValidado;
    if (p.unico && p.numerado)
      saida.push(
        anomalia(
          'paragrafo_unico_com_numerado',
          `O ${naFrase(pai)} tem parágrafo único e ${p.numerado.rotulo ?? p.numerado.endereco}: confira se um deles não é redação antiga ou citação.`,
          { endereco: pai.endereco, linha: pai.linha },
        ),
      );
  }
  for (const [k, p] of paragrafos) {
    const pai = nos[k] as NoValidado;
    if (p.par1 && !p.par2)
      saida.push(
        anomalia(
          'paragrafo_1_sem_2',
          `O ${naFrase(pai)} tem § 1º sem § 2º: confira se não é parágrafo único.`,
          { endereco: pai.endereco, linha: pai.linha },
        ),
      );
  }
  // Regra 12: conta só "a confirmar" (texto puro ou conflito desta validação); a média não conta.
  if (nos.length > 0 && aConfirmar / nos.length > LIMITE_A_CONFIRMAR) {
    const conta = `${quantos(aConfirmar)} de ${quantos(nos.length)} dispositivos (${String(Math.round((100 * aConfirmar) / nos.length))}%) ficaram a confirmar`;
    saida.push(
      anomalia(
        'a_confirmar_acima_do_limite',
        formato === 'html'
          ? `A fonte pode ter mudado de formato: ${conta}. Cole de novo pela página da norma; se continuar, avise.`
          : `O texto chegou sem formatação: ${conta}.`,
      ),
    );
  }
  return saida;
}
