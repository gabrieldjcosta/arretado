// Destaque automático de condicionantes e prazos (F2, atividade 9.8; Parte 2 §10.6, Leitor;
// decisões de 24/09/2026). Calculado na leitura, nunca gravado: não é Marcação (grifo) nem
// Estrela. Casa na `chaveDeCasamento` (mesmo comprimento do texto), com a flag `i` e nunca com
// `toLowerCase` (que pode mudar o comprimento), para os índices valerem no texto exibido.
// Dicionário por categoria; as expressões compostas vêm antes das palavras soltas, e um trecho já
// destacado não se destaca de novo (sem sobreposição). Ficam fora os genéricos que acenderiam boa
// parte das linhas ("é", "pode", "não", "deve", "ainda", "desde" sozinho, "quando", "se").
// Medidas no corpus: `planos/F2.md` › "Fatos do destaque (9.8)".
import { chaveDeCasamento } from './normalizacao';

export type CategoriaDestaque = 'prazo' | 'condicao' | 'absoluto' | 'pena';

/** Na ordem da legenda. */
export const CATEGORIAS_DESTAQUE: readonly CategoriaDestaque[] = [
  'prazo',
  'condicao',
  'absoluto',
  'pena',
];

/** Um trecho aceso: `[inicio, fim)` em unidades de código, os mesmos índices do texto. */
export interface Destaque {
  inicio: number;
  fim: number;
  categoria: CategoriaDestaque;
}

// ── Peças ───────────────────────────────────────────────────────────────────
// Sem quantificador aninhado ambíguo: nenhuma regra pode ser quadrática (texto de até 10 milhões
// de caracteres, o limite do sanitizador; `desempenho.test.ts`).

/** Começo e fim de palavra (o `\b` do JavaScript não conhece letra acentuada). */
const INICIO = String.raw`(?<![\p{L}\p{N}])`;
const FIM = String.raw`(?![\p{L}\p{N}])`;
/** Espaço dentro da linha: um destaque nunca atravessa a quebra de linha ("Pena -⏎reclusão"). */
const E = String.raw`[^\S\n]+`;

/** Número por extenso, como a lei escreve ("trinta", "vinte e quatro", "cento e oitenta"). */
const EXTENSO_UNIDADE = [
  'um',
  'uma',
  'dois',
  'duas',
  'três',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'catorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'cinqüenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
  'cem',
  'cento',
  'duzentos',
  'duzentas',
  'trezentos',
  'trezentas',
  'quatrocentos',
  'quatrocentas',
  'quinhentos',
  'quinhentas',
  'seiscentos',
  'seiscentas',
  'setecentos',
  'setecentas',
  'oitocentos',
  'oitocentas',
  'novecentos',
  'novecentas',
  'mil',
].join('|');
// No máximo 5 "e" ("duzentos e cinquenta e seis mil e quinhentos"): sem limite, uma cadeia hostil
// ("um e um e um…") seria relida a cada começo.
const EXTENSO = String.raw`(?:${EXTENSO_UNIDADE})(?:${E}e${E}(?:${EXTENSO_UNIDADE})){0,5}`;
/** Algarismos ("30", "1.000", "2,5"), com o extenso entre parênteses que a lei repete. */
const ALGARISMOS = String.raw`(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?`;
const POR_EXTENSO_ENTRE_PARENTESES = String.raw`(?:[^\S\n]*\([^()\n]{1,60}\))?`;
const QUANTIDADE = String.raw`(?:${ALGARISMOS}${POR_EXTENSO_ENTRE_PARENTESES}|${EXTENSO})`;

/** Unidade de tempo ("dias úteis", "anos de idade"); "dias-multa" é pena e "horas-aula" não é prazo. */
const UNIDADE = String.raw`(?:dias?(?:${E}(?:úteis|corridos|consecutivos))?|mês|meses|anos?(?:${E}de${E}idade)?|horas?|minutos?|semanas?|quinzenas?|bimestres?|trimestres?|semestres?|biênios?|quinquênios?)${FIM}(?!-)`;
const TEMPO = String.raw`${QUANTIDADE}${E}${UNIDADE}`;
/** "de 2 (dois) a 5 (cinco) anos", "de seis meses a dois anos", "de quinze dias a um mês". */
const INTERVALO_DE_TEMPO = String.raw`${QUANTIDADE}(?:${E}${UNIDADE})?${E}(?:a|até)${E}${TEMPO}`;

/** Fração da pena ou do quórum ("um terço", "2/3 (dois terços)", "metade", "o dobro"). */
const FRACAO = String.raw`(?:\d+/\d+${POR_EXTENSO_ENTRE_PARENTESES}|(?:um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez)${E}(?:terços?|quartos?|quintos?|sextos?|sétimos?|oitavos?|nonos?|décimos?)|(?:a${E})?metade|(?:o${E})?(?:dobro|triplo|quádruplo|quíntuplo|décuplo))${FIM}`;

// ── Regras, em ordem de prioridade (compostas primeiro) ─────────────────────

interface Regra {
  categoria: CategoriaDestaque;
  fonte: string;
}

const pena = (fonte: string): Regra => ({ categoria: 'pena', fonte });
const prazo = (fonte: string): Regra => ({ categoria: 'prazo', fonte });
const condicao = (fonte: string): Regra => ({ categoria: 'condicao', fonte });
const absoluto = (fonte: string): Regra => ({ categoria: 'absoluto', fonte });

const REGRAS: readonly Regra[] = [
  // Penas, quóruns e frações: o intervalo da pena inteiro ("reclusão, de 2 (dois) a 8 (oito)
  // anos"), antes do tempo solto que está dentro dele.
  pena(
    String.raw`(?:reclusão|detenção|prisão(?:${E}simples)?)(?:[^\S\n]*,[^\S\n]*|${E})(?:de${E})?${INTERVALO_DE_TEMPO}`,
  ),
  pena(String.raw`(?:${QUANTIDADE}${E}(?:a${E}${QUANTIDADE}${E})?)?dias-multa`),
  pena(String.raw`(?:de${E})?${FRACAO}${E}(?:a|até)${E}${FRACAO}`),

  // Prazos e tempo: o prazo com a quantidade, depois a quantidade com o que a limita.
  prazo(
    String.raw`prazos?${E}(?:(?:máximo|mínimo|improrrogável)${E})?(?:(?:não${E})?(?:superior|inferior)${E}a${E}|de${E}(?:até${E}|no${E}(?:máximo|mínimo)${E})?|até${E})${QUANTIDADE}${E}${UNIDADE}`,
  ),
  prazo(
    String.raw`(?:até|no${E}máximo|no${E}mínimo|pelo${E}menos|ao${E}menos|mais${E}de|menos${E}de|(?:não${E})?(?:superior|inferior)${E}a|a${E}cada|(?:antecedência${E})?(?:mínim[oa]|máxim[oa])${E}de)${E}${TEMPO}`,
  ),
  prazo(INTERVALO_DE_TEMPO),
  prazo(TEMPO),
  prazo(
    String.raw`(?:im)?prorrogáve(?:l|is)(?:${E}(?:uma${E}(?:única${E})?vez${E})?por${E}igual${E}período)?`,
  ),
  prazo(String.raw`(?:por|em)${E}igual${E}período`),

  // Exceções e condições: as locuções antes das palavras soltas de "absoluto" que contêm.
  condicao(String.raw`(?:sempre|toda${E}vez|todas${E}as${E}vezes)${E}que`),
  condicao(String.raw`(?:desde|contanto|ainda|mesmo|a${E}menos|a${E}não${E}ser)${E}que`),
  // "a salvo de" (CF, art. 227) não é exceção. O olhar para trás vem depois da palavra e tem
  // tamanho limitado: antes dela, seria tentado em cada posição de um texto hostil.
  condicao(String.raw`salvo(?<!${INICIO}a[^\S\n]{1,3}salvo)`),
  condicao(String.raw`exceto`),
  condicao(String.raw`(?:excetuad|ressalvad)[oa]s?`),
  condicao(String.raw`(?:com|à)${E}exceção${E}d[eoa]s?`),
  condicao(String.raw`sem${E}prejuízo${E}d[eoa]s?`),
  condicao(String.raw`(?:em|no|nos)${E}casos?${E}(?:de|em${E}que|d[oa]s?)`),
  condicao(String.raw`(?:na|nas)${E}hipóteses?${E}(?:de|em${E}que|d[oa]s?)`),
  // "caso" conjunção, no começo da oração ("Caso o juiz…", ", caso não…"); o substantivo fica
  // ("no caso", ", caso em que").
  condicao(String.raw`caso(?<=(?:^|[,;:(\n])[^\S\n]{0,3}caso)(?=${E})(?!${E}em${E}que)`),
  condicao(String.raw`condicionad[oa]s?${E}(?:a|à|ao|às|aos)`),
  condicao(String.raw`sob${E}(?:a${E})?condição`),
  condicao(String.raw`a${E}critério${E}d[eoa]s?`),
  condicao(
    String.raw`mediante${E}(?:prévi[oa]${E})?(?:autorização|requerimento|ordem|decisão|parecer|aprovação|consentimento|anuência|concordância|homologação|deliberação|representação|requisição|provocação|solicitação|pedido)`,
  ),

  // Termos absolutos: as locuções antes das palavras soltas.
  absoluto(
    String.raw`em${E}(?:qualquer|nenhum[a]?)${E}(?:caso|hipótese|tempo|fase|circunstância|situação)`,
  ),
  absoluto(String.raw`em${E}(?:hipótese|caso)${E}algum[a]?`),
  absoluto(String.raw`a${E}(?:qualquer|todo)${E}tempo`),
  absoluto(String.raw`de${E}qualquer${E}(?:modo|forma|natureza|espécie)`),
  absoluto(String.raw`qualquer${E}que${E}sej(?:a|am)`),
  absoluto(String.raw`tão(?:-|${E})somente`),
  absoluto(String.raw`qualquer|quaisquer|sempre|nunca|jamais|nenhum|nenhuma`),
  absoluto(String.raw`independentemente`),
  // "no todo ou em parte" (CP, art. 298): o substantivo não é termo absoluto.
  absoluto(String.raw`tod[oa]s?(?<!${INICIO}n?o[^\S\n]{1,3}todo)`),
  absoluto(String.raw`somente|apenas|unicamente|só`),
  absoluto(
    String.raw`exclusiv(?:amente|[oa]s?)|privativamente|privativ[oa]s?(?!${E}de${E}liberdade)`,
  ),
  absoluto(String.raw`obrigatoriamente|obrigatóri[oa]s?|necessariamente`),
  absoluto(String.raw`vedad[oa]s?|proibid[oa]s?`),

  // As palavras soltas da pena e do quórum, depois das locuções.
  pena(String.raw`reclusão|detenção|prisão${E}simples`),
  pena(String.raw`(?:(?:e|ou)${E})?multas?`),
  // O percentual antes da fração: "4,5% (quatro inteiros e cinco décimos por cento)".
  pena(
    String.raw`${ALGARISMOS}[^\S\n]*%${POR_EXTENSO_ENTRE_PARENTESES}|${EXTENSO}${E}por${E}cento`,
  ),
  pena(FRACAO),
  pena(String.raw`maioria(?:${E}(?:absoluta|simples|relativa|qualificada))?|unanimidade|qu[óo]rum`),
];

const PADROES = REGRAS.map(({ categoria, fonte }) => ({
  categoria,
  padrao: new RegExp(`${INICIO}(?:${fonte})${FIM}`, 'giu'),
}));

/**
 * Os trechos acesos de um texto de dispositivo, em ordem e sem sobreposição. O texto é o vigente
 * (quem chama tira o tachado e as redações anteriores); os índices valem nele.
 */
export function detectarDestaques(texto: string): Destaque[] {
  if (texto.length === 0) return [];
  const chave = chaveDeCasamento(texto);
  const ocupado = new Uint8Array(chave.length);
  const achados: Destaque[] = [];
  for (const { categoria, padrao } of PADROES) {
    for (const m of chave.matchAll(padrao)) {
      const inicio = m.index;
      const fim = inicio + m[0].length;
      if (fim === inicio || ocupado.subarray(inicio, fim).includes(1)) continue;
      ocupado.fill(1, inicio, fim);
      achados.push({ inicio, fim, categoria });
    }
  }
  return achados.sort((a, b) => a.inicio - b.inicio);
}
