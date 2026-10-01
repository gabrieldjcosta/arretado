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
 * Do modelo, mais `vetado` (8.6: "(VETADO)" sozinho no texto; 121 no gabarito do corpus), que o
 * modelo ainda não tem: até a subida do esquema, a gravação (`registros.ts`) o grava `vigente`,
 * com o texto "(VETADO)" (glossário §12). O estruturador não produz 'novo' (diferença entre
 * versões, 11.7 e F6) nem 'eficacia_cessada'.
 */
export type StatusDispositivo = Dispositivo['status'] | 'vetado';

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

/**
 * Espécie da nota (regra 7; lista fechada na 8.5): decide as regras 9 e 10 e alimenta a F6.
 * `vigencia` inclui "Produção de efeito(s)" (CF); `expressao`, "Expressão substituída (declarada,
 * suprimida…) pela Lei…" (ECA); `revogado` inclui "Suprimido"; `nr`, o "(NR)" da ALESP; `outra`:
 * promulgação, conversão, declaração de inconstitucionalidade, suspensão, "Última atualização"
 * (ALESP), o número solto que é link para outro ato (LEP, art. 18-A, § 3º: "7.627").
 */
export type TipoNotaDeVigencia =
  | 'redacao_dada'
  | 'incluido'
  | 'revogado'
  | 'renumerado'
  | 'vide'
  | 'vigencia'
  | 'regulamento'
  | 'expressao'
  | 'nr'
  | 'outra';

/**
 * Nota de vigência (regra 7): `texto` como aparece, com os parênteses quando há ("(Incluído pela
 * Lei nº 12.654, de 2012)", "Vigência" solto) e sem o "- " da linha própria da ALESP; até 2.000
 * caracteres. `lei` (8.5): o primeiro ato normativo citado, na forma canônica ("Lei nº 13.964",
 * "Lei Complementar nº 132", "Emenda Constitucional nº 132", "Decreto-Lei nº 2.848", "Medida
 * Provisória nº 2.180-35"; ADI, ADPF e MI não são ato); `ano`, o do ato ("de 2019", "de
 * 11.7.1984", "de 25.7.90", "de 25 de setembro de 2009"), de 1800 a 2100; `link`, o http(s) do
 * sanitizador.
 */
export interface NotaDeVigencia extends NotaDoModelo {
  tipo: TipoNotaDeVigencia;
  linha: number;
}

/**
 * Redação anterior (regras 8 e 9): a linha substituída como veio (rótulo, texto e notas em
 * linha), com o tachado. `tachado` nasce confirmada; `heuristica` (texto puro, duplicata sem
 * tachado, nó estrutural substituído) nasce não confirmada, e o nó dela, no HTML, fica com
 * confiança média (regra 12, 8.7). `nota` (até 2.000): nota em linha própria que descreve esta
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
   * `preambulo`; anexo (8.7): `anexo` + número, romano como na lei (`anexo`, `anexoII`,
   * `anexo1`, `anexoUnico`). Artigo (8.3): `art9A`, `art1000`, `artUnico`; no bloco com numeração
   * própria (8.4), com o prefixo dele (`adct.art1`, `dt.art21`); o nó do bloco é o prefixo
   * (`adct`). Regra 6 (8.4): o do pai + segmento, `par2`, `par2A`, `parUnico`, `incIII`,
   * `incVIA`, `alB`, `it1`; o inciso do caput fica direto no artigo (`art5.incIII`, sem
   * `caput`). Artigo, dispositivo ou anexo repetido funde (vale o último); nó estrutural repetido
   * com artigo no meio fica, e a 8.7 o acusa.
   */
  endereco: string;
  /** Rótulo de exibição ("Art. 9º-A", "§ 1º", "Parágrafo único", "VI-A", "a)", "TÍTULO II"); TextoCurto. */
  rotulo?: string;
  /** Rótulo como veio, já normalizado, com o separador ("Art. 1º -", "Artigo 4º -"): para a 8.9 e o editor. */
  rotuloLido?: string;
  /**
   * Texto vigente, normalizado, sem rótulo e sem notas. No artigo, é o caput. Vazio no nó
   * estrutural (o nome é um filho `nome`) e no revogado. Continuação em outra linha (8.4): "Pena -
   * …", citação entre aspas e rubrica que não chegou a dispositivo entram depois de um trecho `{
   * texto: '\n' }` (quebra de linha); a linha partida pela fonte (minúscula depois de texto sem
   * ponto final), depois de um espaço. No anexo (regra 11, 8.7), o texto bruto: o resto da linha
   * do cabeçalho e as linhas seguintes, cada uma depois de uma quebra de linha, sem estruturar.
   */
  trechos: Trecho[];
  /**
   * Regra 7 (8.5): as notas do fim de cada linha do texto (a do rótulo e as emendadas, na ordem) e
   * as das linhas só de notas logo depois dele. No `nome`, as da rubrica.
   */
  notas: NotaDeVigencia[];
  redacoesAnteriores: RedacaoAnterior[];
  /**
   * Regra 9 (8.6): `revogado` com texto vazio ("(Revogado)" sozinho, ou rótulo, texto tachado e nota
   * de revogação fora do tachado); o artigo só tachado também. Regra 10: `renumerado` (o vigente
   * com nota "Renumerado…" ou rótulo antigo tachado; o revogado continua revogado).
   */
  status: StatusDispositivo;
  /**
   * Endereço antigo (regra 10), até 200 caracteres, quando a nota o traz ("Renumerado do parágrafo
   * único…" → `art9.parUnico`; "Inciso X renumerado para inciso XI" → `art134.incX`).
   */
  renumeradoDe?: string;
  confianca: Confianca;
  /**
   * Na ordem do texto; o `nome` (rubrica) vem primeiro. A posição dá `paiId` e `ordem` na 9.2
   * (`emOrdemDeLeitura`, em `ordem.ts`).
   */
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
 * sobra da fonte. Desde a 8.6 a linha tachada não é descarte: é redação anterior (ou nó revogado).
 */
export type MotivoDescarte = 'cabecalho' | 'fecho' | 'sobra';

export interface Descarte {
  motivo: MotivoDescarte;
  linhas: FaixaDeLinhas;
}

/**
 * Conflito bloqueia a publicação (9.3) e deixa o nó "a confirmar" (regra 12); aviso só informa.
 * Cada tipo tem uma gravidade só (`GRAVIDADE`, em `validacao.ts`).
 */
export type GravidadeAnomalia = 'conflito' | 'aviso';

/**
 * Lista fechada na 8.7, nesta ordem (a do relatório de anomalias do sumário, 9.5). Leitura
 * (regras 1–12, no estruturador), todos avisos: a ambiguidade já baixou a confiança do nó.
 * Validação (regra 13, `validarNos`, sobre o rascunho e sobre os registros gravados): conflito
 * só `sem_artigos` e `endereco_duplicado` (repetido com ao menos um nó não estrutural);
 * `estrutural_repetido` (todos estruturais: LC 80, duas "SEÇÃO IV") só avisa.
 */
export type TipoAnomalia =
  // Leitura (regras 1–12)
  | 'caractere_perdido'
  | 'linha_solta'
  | 'linha_continuada'
  | 'duplicata'
  | 'artigo_so_tachado'
  | 'estrutural_substituido'
  | 'tachado_sem_dispositivo'
  | 'sem_pai'
  // Validação estrutural (regra 13)
  | 'sem_artigos'
  | 'endereco_duplicado'
  | 'estrutural_repetido'
  | 'artigo_fora_de_ordem'
  | 'artigo_ausente'
  | 'alinea_sem_inciso'
  | 'item_sem_alinea'
  | 'paragrafo_unico_com_numerado'
  | 'paragrafo_1_sem_2'
  | 'a_confirmar_acima_do_limite';

/** Criada por `anomalia` (`validacao.ts`), que tira a gravidade de `GRAVIDADE`. */
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
  /**
   * Nota com lei e ano mais recente (8.5; `notaVigenciaMaisRecente` em `notas.ts`), entre as da
   * norma, dos nós e dos dispositivos, para a pré-checagem da F6 (D16).
   */
  notaVigenciaMaisRecente?: VersaoDeNorma['notaVigenciaMaisRecente'];
  /** Raízes, na ordem do texto: preâmbulo, estrutura (ou artigos, se não houver), anexos. */
  nos: NoRascunho[];
  descartes: Descarte[];
  anomalias: Anomalia[];
  /**
   * Linhas tachadas inteiras (redação anterior ou nó revogado, 8.6; a sobra "CÓDIGO PENAL" do CP
   * também), fora o cabeçalho e o fecho; desde a 8.7, também as do anexo tachado, que viram a
   * redação anterior dele (a linha tachada no texto bruto de um anexo vigente fica com a marca e
   * só conta se o anexo for revogado, quando vira a redação anterior dele). Zero numa página HTML:
   * parece a compilada (sumário da 9.5).
   */
  linhasTachadas: number;
}
