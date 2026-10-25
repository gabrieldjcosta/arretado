// Contrato dos arquivos do acervo (spec 10/10/2026 §4): índice e um item por norma. Dado externo:
// tudo passa por estes esquemas, com limites de tamanho, antes de tocar o banco.
import { z } from 'zod';
import { DataCivil, Dispositivo, Norma, TextoCurto, TextoDeDispositivo } from '../../core/modelo';

export const IdDoAcervo = z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/);
export const HashDoAcervo = z.string().regex(/^[0-9a-f]{64}$/);
export const TipoDoAcervo = z.enum(['norma', 'sumulas', 'teses']);
export type TipoDoAcervo = z.infer<typeof TipoDoAcervo>;

export const MAX_NOS = 50_000;
export const MAX_ITENS = 2_000;

/** Sugestão de vínculo com disciplina, pelo nome (o app casa com as disciplinas do edital). */
export const VinculoSugerido = z.strictObject({
  disciplina: TextoCurto,
  subtitulo: TextoCurto.optional(),
  trecho: z
    .strictObject({ inicioEndereco: z.string().max(200), fimEndereco: z.string().max(200) })
    .optional(),
});
export type VinculoSugerido = z.infer<typeof VinculoSugerido>;

export const EntradaDoIndice = z.strictObject({
  id: IdDoAcervo,
  tipo: TipoDoAcervo,
  titulo: TextoCurto,
  /** Grupo da lista por tipo ("Leis federais", "Resoluções do CNJ"…). */
  grupo: TextoCurto,
  vinculos: z.array(VinculoSugerido).max(20),
  /** Avisos do curador, mostrados antes de adicionar ("divergente do edital", "revogada"…). */
  avisos: z.array(z.string().max(500)).max(10),
  /** Bytes do arquivo do item, para mostrar o que será baixado. */
  tamanho: z.int().min(0),
  versao: z.int().min(1),
  /** SHA-256 do JSON canônico do item (`hashDoItem`). */
  hash: HashDoAcervo,
  urlOficial: z.url({ protocol: /^https?$/ }).optional(),
  coletadoEm: DataCivil,
});
export type EntradaDoIndice = z.infer<typeof EntradaDoIndice>;

export const IndiceDoAcervo = z.strictObject({
  formato: z.literal('arretado-acervo'),
  versaoIndice: z.literal(1),
  geradoEm: DataCivil,
  itens: z.array(EntradaDoIndice).max(MAX_ITENS),
});
export type IndiceDoAcervo = z.infer<typeof IndiceDoAcervo>;

/** Nó da árvore do item, em ordem de leitura; `pai` é o endereço do nó pai. */
export const NoDoItem = z.strictObject({
  endereco: Dispositivo.shape.endereco,
  categoria: Dispositivo.shape.categoria,
  tipo: Dispositivo.shape.tipo,
  rotulo: Dispositivo.shape.rotulo,
  status: Dispositivo.shape.status,
  renumeradoDe: Dispositivo.shape.renumeradoDe,
  confianca: Dispositivo.shape.confianca,
  pai: Dispositivo.shape.endereco.optional(),
  trechos: TextoDeDispositivo.shape.trechos,
  notasVigencia: TextoDeDispositivo.shape.notasVigencia,
  procedencia: TextoDeDispositivo.shape.procedencia,
  redacoesAnteriores: TextoDeDispositivo.shape.redacoesAnteriores,
});
export type NoDoItem = z.infer<typeof NoDoItem>;

export const ItemDoAcervo = z.strictObject({
  id: IdDoAcervo,
  versao: z.int().min(1),
  norma: z.strictObject({
    tituloCurto: Norma.shape.tituloCurto,
    tituloOficial: Norma.shape.tituloOficial,
    referencia: Norma.shape.referencia,
    tipo: Norma.shape.tipo,
    esfera: Norma.shape.esfera,
    especie: Norma.shape.especie,
    epigrafe: Norma.shape.epigrafe,
    ementa: Norma.shape.ementa,
    preambulo: Norma.shape.preambulo,
    urlOficial: Norma.shape.urlOficial,
    fonteConsultadaEm: Norma.shape.fonteConsultadaEm,
  }),
  nos: z.array(NoDoItem).min(1).max(MAX_NOS),
});
export type ItemDoAcervo = z.infer<typeof ItemDoAcervo>;

/**
 * O pacote de partida (Onda 1, 25/10/2026): por carreira do catálogo, as normas do acervo que mais
 * aparecem nos assuntos dos editais dela. Curadoria revisada por Gabriel; fica ao lado do índice
 * (`public/acervo/pacote-de-partida.json`) e a verificação do acervo confere que cada id existe nele.
 */
export const NormaDoPacote = z.strictObject({
  /** O id do item no acervo. */
  id: IdDoAcervo,
  titulo: TextoCurto,
  /** Em quantos dos editais com texto a norma é citada. */
  editaisQueCitam: z.int().min(1),
  /** `editaisQueCitam` em % de `editaisComTexto`, arredondado. */
  porcentagem: z.int().min(0).max(100),
});
export type NormaDoPacote = z.infer<typeof NormaDoPacote>;

export const CarreiraDoPacote = z.strictObject({
  nome: TextoCurto,
  /** Editais da carreira no catálogo que têm o texto dos assuntos. */
  editaisComTexto: z.int().min(1),
  normas: z.array(NormaDoPacote).min(1).max(8),
});
export type CarreiraDoPacote = z.infer<typeof CarreiraDoPacote>;

export const PacoteDePartida = z.strictObject({
  versao: z.literal(1),
  aprovadoEm: DataCivil,
  aprovadoPor: TextoCurto,
  /** Como a lista foi tirada (para quem for refazê-la). */
  regra: z.string().max(1000),
  /** Pelo slug da carreira no catálogo (`corpus/catalogo/index.json`). */
  carreiras: z.record(z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/), CarreiraDoPacote),
});
export type PacoteDePartida = z.infer<typeof PacoteDePartida>;
