import { z } from "zod";
import { EsquemaEntidadeBase } from "../persistencia/modelo";

/**
 * Entidades usadas por vários domínios e que não pertencem a nenhum deles (§5.1). Ficam no Core
 * porque domínios não podem depender uns dos outros (§6); nenhuma tem comportamento próprio.
 */

/** Tipo de item referenciável por vínculo, anexo ou tag. Texto livre com os nomes das entidades. */
export const TipoDeItem = z.enum([
  "Ponto",
  "Dispositivo",
  "Norma",
  "Erro",
  "Cartao",
  "Precedente",
  "Nota",
  "Achado",
  "Sessao",
  "Concurso",
]);
export type TipoDeItem = z.infer<typeof TipoDeItem>;

/**
 * Vínculo N:N entre itens de domínios diferentes (§5.1 "Vínculo"). Vínculos 1:N que a Parte 1
 * declara como campo (por exemplo `Erro.pontoId`) continuam campos; esta tabela cobre o resto.
 * `origem` acompanha a regra da Estrela: marcar um nó propaga aos descendentes como herdado (§8.2).
 */
/**
 * A Parte 1 chama isto de "origem" da Estrela e do vínculo. Aqui o campo se chama `propagacao`
 * porque `origem` já é, em toda entidade, a procedência do registro (app / importação / sync).
 */
export const Propagacao = z.enum(["direta", "herdada", "pacote", "excecaoNegativa"]);
export type Propagacao = z.infer<typeof Propagacao>;

export const EsquemaVinculo = EsquemaEntidadeBase.extend({
  deTipo: TipoDeItem,
  deId: z.string(),
  paraTipo: TipoDeItem,
  paraId: z.string(),
  propagacao: Propagacao,
  /** Quando herdado ou vindo de pacote: o nó ou o pacote que o originou. */
  propagadoDe: z.string().nullable(),
});
export type Vinculo = z.infer<typeof EsquemaVinculo>;

/** Procedência de um Erro, de uma Norma ou de um Precedente (banca, prova, ano, número, URL). */
export const EsquemaFonte = EsquemaEntidadeBase.extend({
  titulo: z.string(),
  banca: z.string().optional(),
  ano: z.number().int().optional(),
  numero: z.string().optional(),
  url: z.string().optional(),
  consultadaEm: z.string().optional(),
});
export type Fonte = z.infer<typeof EsquemaFonte>;

/** Tag opcional e controlada (D15: sem tags favoritas, sem favorito genérico). */
export const EsquemaTag = EsquemaEntidadeBase.extend({
  nome: z.string(),
});
export type Tag = z.infer<typeof EsquemaTag>;

/** Anexo local (blob); o envio ao Storage remoto é opcional e só existe a partir da F4 (§14.4). */
export const EsquemaAnexo = EsquemaEntidadeBase.extend({
  deTipo: TipoDeItem,
  deId: z.string(),
  nome: z.string(),
  tipoMime: z.string(),
  tamanho: z.number().int(),
  /** Conteúdo local. Fora do pacote padrão: só entra no "integral com anexos" (§12.1). */
  conteudo: z.instanceof(Blob).optional(),
  enviadoEm: z.string().nullable(),
});
export type Anexo = z.infer<typeof EsquemaAnexo>;
