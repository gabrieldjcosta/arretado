// Rascunho do estruturador (F2, atividade 8.1; Parte 2 §10.6, regras 1–13): a árvore que o
// estruturador devolve antes de gravar. Só em memória, sem zod: a 9.2 a converte em Dispositivo +
// TextoDeDispositivo de uma VersaoDeNorma com status 'rascunho', e a gravação passa pelos esquemas
// do core. Os tipos do core entram por acesso indexado, para acompanhar o modelo sem cópia.
import type {
  Dispositivo,
  Norma,
  TextoDeDispositivo,
  TipoDispositivo,
  VersaoDeNorma,
} from '../../core/modelo';
import type { Trecho } from '../../core/seguranca/sanitizador';
import type { RelatorioNormalizacao } from './normalizacao';

/** HTML sanitizado (colar, URL, arquivo) ou texto puro (`textoParaBlocos`; regra 12: "a confirmar"). */
export type FormatoEntrada = 'html' | 'texto';

/**
 * Do modelo. O estruturador não produz 'novo' (diferença entre versões, 11.7 e F6) nem
 * 'eficacia_cessada'. 'vetado' (74 dispositivos no gabarito do corpus) ainda não existe: a 8.6
 * decide como gravá-lo (glossário §12).
 */
export type StatusDispositivo = Dispositivo['status'];

/**
 * Regra 12: `alta` = HTML e regra única; `media` = ambiguidade resolvida por heurística;
 * `a_confirmar` = texto puro ou conflito. Não confundir com `Achado.confianca`.
 */
export type Confianca = Dispositivo['confianca'];

/**
 * Linhas da entrada que originaram um elemento: índices (base 0) no `Bloco[]` recebido, `fim`
 * inclusivo. A normalização mantém os índices (bloco que fica vazio continua na lista), e a 9.2
 * guarda esse mesmo `Bloco[]` como fonte. Não é a linha do arquivo: `textoParaBlocos` descarta
 * linhas vazias.
 */
export interface FaixaDeLinhas {
  inicio: number;
  fim: number;
}

type NotaDoModelo = NonNullable<TextoDeDispositivo['notasVigencia']>[number];
type RedacaoDoModelo = NonNullable<TextoDeDispositivo['redacoesAnteriores']>[number];

/** Espécie da nota (regra 7): decide as regras 9 e 10 e alimenta a F6. A 8.5 fecha a lista. */
export type TipoNotaDeVigencia =
  | 'redacao_dada'
  | 'incluido'
  | 'revogado'
  | 'renumerado'
  | 'vide'
  | 'vigencia'
  | 'regulamento'
  | 'nr'
  | 'outra';

/**
 * Nota de vigência (regra 7): `texto` como aparece, com os parênteses quando há ("(Incluído pela
 * Lei nº 12.654, de 2012)", "Vigência" solto) e sem o "- " da linha própria da ALESP; até 2.000
 * caracteres. `lei` é TextoCurto; `ano`, de 1800 a 2100; `link`, o http(s) do sanitizador.
 */
export interface NotaDeVigencia extends NotaDoModelo {
  tipo: TipoNotaDeVigencia;
  linha: number;
}

/**
 * Redação anterior (regras 8 e 9): a linha substituída como veio (rótulo, texto e notas em
 * linha), com o tachado. `tachado` nasce confirmada; `heuristica` (texto puro, duplicata sem
 * tachado) nasce não confirmada. `nota` (até 2.000): nota em linha própria que descreve esta
 * redação (ALESP, tachada).
 */
export interface RedacaoAnterior extends Pick<
  RedacaoDoModelo,
  'nota' | 'origemDeteccao' | 'confirmada'
> {
  trechos: Trecho[];
  /** Endereço lido quando a redação foi para o ancestral (não há nó com esse endereço). */
  enderecoLido?: string;
  linhas: FaixaDeLinhas;
}

/** Nó da árvore; vira um Dispositivo (D11) e o TextoDeDispositivo dele nesta versão. */
export interface NoRascunho {
  tipo: TipoDispositivo;
  /**
   * Endereço canônico no formato de `Dispositivo.endereco` (segmentos [a-zA-Z0-9] separados por
   * ponto). Estrutura (8.2): o caminho dos nós (`parteEspecial.tit6.cap1`; `parte`, `liv`, `tit`,
   * `cap`, `sec`, `subsec` + número, com sufixo: `cap2A`); nome: `<endereço do pai>.nome`;
   * `preambulo`; `anexo`. Dispositivos: 8.4. Repetido = anomalia.
   */
  endereco: string;
  /** Rótulo de exibição ("Art. 9º-A", "§ 1º", "Parágrafo único", "VI-A", "a)", "TÍTULO II"); TextoCurto. */
  rotulo?: string;
  /** Rótulo como veio, já normalizado, com o separador ("Art. 1º -", "Artigo 4º -"): para a 8.9 e o editor. */
  rotuloLido?: string;
  /**
   * Texto vigente, normalizado, sem rótulo e sem notas. Vazio no nó estrutural (o nome é um filho
   * `nome`) e no revogado. A forma da continuação em outra linha ("Pena - …") é da 8.4.
   */
  trechos: Trecho[];
  notas: NotaDeVigencia[];
  redacoesAnteriores: RedacaoAnterior[];
  status: StatusDispositivo;
  /**
   * Endereço antigo (regra 10), até 200 caracteres. O status que o acompanha é da 8.6: a regra 10
   * fala em `renumerado`, mas no gabarito o renumerado segue vigente (ou revogado: LEP, art. 124, § 2º).
   */
  renumeradoDe?: string;
  confianca: Confianca;
  /** Na ordem do texto; o `nome` (rubrica) vem primeiro. A posição dá `paiId` e `ordem` na 9.2. */
  filhos: NoRascunho[];
  linhas: FaixaDeLinhas;
}

/**
 * Regra 2 (epígrafe, ementa, preâmbulo) e o que se deduz da epígrafe; mesmos limites de Norma.
 * `tituloOficial`: linha em caixa alta entre o preâmbulo e o corpo ("CÓDIGO PENAL").
 */
export type MetadadosNorma = Partial<
  Pick<Norma, 'epigrafe' | 'ementa' | 'preambulo' | 'tipo' | 'referencia' | 'tituloOficial'>
>;

/**
 * Linha que não entra na norma: cabeçalho do portal; fecho (local, data, assinaturas, aviso do DOU);
 * sobra da fonte; `redacao_anterior`: linha tachada que a 8.6 ainda vai anexar ao dispositivo
 * (salvaguarda da leitura antecipada: tachado nunca vira texto vigente).
 */
export type MotivoDescarte = 'cabecalho' | 'fecho' | 'sobra' | 'redacao_anterior';

export interface Descarte {
  motivo: MotivoDescarte;
  linhas: FaixaDeLinhas;
}

/** Conflito bloqueia a publicação (9.3) e deixa o nó "a confirmar"; aviso só informa. */
export type GravidadeAnomalia = 'conflito' | 'aviso';

/** Tipos previstos (regras 12–13 e casos do gabarito da 7.3); a 8.7 fecha a lista e a gravidade de cada um. */
export type TipoAnomalia =
  // Validação estrutural (regra 13)
  | 'sem_artigos'
  | 'artigo_fora_de_ordem'
  | 'artigo_ausente'
  | 'endereco_duplicado'
  | 'alinea_sem_inciso'
  | 'item_sem_alinea'
  | 'sem_pai'
  | 'paragrafo_unico_com_numerado'
  | 'paragrafo_1_sem_2'
  | 'a_confirmar_acima_do_limite'
  // Leitura (regras 1–10)
  | 'caractere_perdido'
  | 'fora_de_artigo'
  | 'linha_solta'
  | 'linha_continuada'
  | 'sem_texto'
  | 'duplicata'
  | 'artigo_so_tachado'
  | 'estrutural_substituido'
  | 'tachado_parcial'
  | 'tachado_sem_dispositivo'
  | 'nota_sem_dispositivo'
  // Até a 8.6: linhas tachadas fora da norma (descarte `redacao_anterior`), uma por norma
  | 'redacao_anterior_nao_tratada';

export interface Anomalia {
  tipo: TipoAnomalia;
  gravidade: GravidadeAnomalia;
  /** Ausente quando é da norma inteira ou de linha sem nó. */
  endereco?: string;
  /** Primeira linha envolvida, para o editor abrir no lugar. */
  linha?: number;
  /** Frase de interface ("O § 2º do art. 141 aparece duas vezes; ficou a última."). */
  mensagem: string;
}

/** Saída do estruturador. Toda linha da entrada cai num nó, nota, redação, metadado ou descarte. */
export interface Rascunho {
  /** Vai para `VersaoDeNorma.versaoAdaptador` (até 50 caracteres). */
  versaoEstruturador: string;
  formatoEntrada: FormatoEntrada;
  totalLinhas: number;
  /** O que a regra 1 trocou na entrada (entidades, hífens suaves, ordinais, caracteres perdidos). */
  normalizacao: RelatorioNormalizacao;
  metadados: MetadadosNorma;
  /** Notas da norma inteira, entre a epígrafe e a ementa ("(Vide Decreto nº 6.049, de 2007)"; "(Última atualização: …)" da ALESP). */
  notasDaNorma: NotaDeVigencia[];
  /** Nota com lei e ano mais recente (8.5), para a pré-checagem da F6 (D16). */
  notaVigenciaMaisRecente?: VersaoDeNorma['notaVigenciaMaisRecente'];
  /** Raízes, na ordem do texto: preâmbulo, estrutura (ou artigos, se não houver), anexo. */
  nos: NoRascunho[];
  descartes: Descarte[];
  anomalias: Anomalia[];
}
