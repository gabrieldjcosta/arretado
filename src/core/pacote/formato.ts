// Esquema executável do pacote `.arretado` (docs/formato-pacote.md).
import { z } from 'zod';
import { Id, Instante, MODULOS } from '../modelo';

export const FORMATO = 'arretado-pacote';
export const VERSAO_FORMATO = 1;
export const EXTENSAO = '.arretado';
export const ARQUIVO_MANIFESTO = 'manifesto.json';
export const ARQUIVO_CIFRADO = 'conteudo.cifrado';
export const ARQUIVO_LOG = 'log.json';
export const PASTA_DADOS = 'dados/';
export const PASTA_ANEXOS = 'anexos/';

const Sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const Modulo = z.enum(MODULOS);

export const Escopo = z.discriminatedUnion('tipo', [
  z.strictObject({ tipo: z.literal('integral') }),
  z.strictObject({ tipo: z.literal('modulos'), modulos: z.array(Modulo).min(1) }),
]);
export type Escopo = z.infer<typeof Escopo>;

export const Manifesto = z.strictObject({
  formato: z.literal(FORMATO),
  versaoFormato: z.literal(VERSAO_FORMATO),
  versaoEsquema: z.int().min(1),
  versaoApp: z.string().max(50),
  criadoEm: Instante,
  usuarioId: Id,
  aparelhoId: Id,
  escopo: Escopo,
  modulos: z.array(Modulo),
  incluiLog: z.boolean(),
  incluiAnexos: z.boolean(),
  contagens: z.record(z.string(), z.int().min(0)),
  arquivos: z.record(z.string(), z.strictObject({ sha256: Sha256, bytes: z.int().min(0) })),
  hashConjunto: Sha256,
});
export type Manifesto = z.infer<typeof Manifesto>;

const Base64 = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/);

export const ManifestoCifrado = z.strictObject({
  formato: z.literal(FORMATO),
  versaoFormato: z.literal(VERSAO_FORMATO),
  cifra: z.strictObject({
    algoritmo: z.literal('AES-256-GCM'),
    kdf: z.literal('PBKDF2-SHA-256'),
    iteracoes: z.int().min(1_000).max(10_000_000),
    sal: Base64,
    iv: Base64,
  }),
});
export type ManifestoCifrado = z.infer<typeof ManifestoCifrado>;

/** Motivo de recusa de um pacote, com mensagem para o usuário (Parte 2 §12.4). */
export type MotivoRecusa =
  | 'nao_e_pacote'
  | 'formato_desconhecido'
  | 'senha_necessaria'
  | 'senha_ou_arquivo_invalido'
  | 'versao_posterior'
  | 'arquivo_alterado';

const MENSAGENS: Record<MotivoRecusa, string> = {
  nao_e_pacote: 'Este arquivo não é um pacote do Arretado.',
  formato_desconhecido: 'Este pacote usa um formato que esta versão do app não conhece.',
  senha_necessaria: 'Este pacote é protegido por senha. Informe a senha usada na exportação.',
  senha_ou_arquivo_invalido:
    'Não foi possível abrir o pacote: a senha está errada ou o arquivo foi alterado.',
  versao_posterior:
    'Este pacote foi gerado por uma versão mais nova do Arretado. Atualize o app para importá-lo.',
  arquivo_alterado:
    'O pacote foi alterado fora do aplicativo e não pode ser importado. Use o arquivo original.',
};

export class PacoteRecusado extends Error {
  constructor(
    readonly motivo: MotivoRecusa,
    readonly detalhe?: string,
  ) {
    super(MENSAGENS[motivo]);
    this.name = 'PacoteRecusado';
  }
}
