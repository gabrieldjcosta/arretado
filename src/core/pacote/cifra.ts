// Cifra opcional do pacote: AES-256-GCM com chave PBKDF2-SHA-256 (T8). Só WebCrypto nativo.
import { deBase64, paraBase64 } from './bytes';
import type { ManifestoCifrado } from './formato';

export const ITERACOES_PADRAO = 600_000;

type ParametrosCifra = ManifestoCifrado['cifra'];

async function derivarChave(senha: string, sal: Uint8Array, iteracoes: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(senha),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: sal as Uint8Array<ArrayBuffer>,
      iterations: iteracoes,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function cifrar(
  dados: Uint8Array,
  senha: string,
  iteracoes = ITERACOES_PADRAO,
): Promise<{ cifra: ParametrosCifra; conteudo: Uint8Array }> {
  if (senha.length === 0) throw new Error('Senha vazia.');
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const chave = await derivarChave(senha, sal, iteracoes);
  const conteudo = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, dados as Uint8Array<ArrayBuffer>),
  );
  return {
    cifra: {
      algoritmo: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA-256',
      iteracoes,
      sal: paraBase64(sal),
      iv: paraBase64(iv),
    },
    conteudo,
  };
}

/** Lança se a senha estiver errada ou o conteúdo tiver sido alterado (autenticação do GCM). */
export async function decifrar(
  conteudo: Uint8Array,
  senha: string,
  cifra: ParametrosCifra,
): Promise<Uint8Array> {
  const chave = await derivarChave(senha, deBase64(cifra.sal), cifra.iteracoes);
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: deBase64(cifra.iv) as Uint8Array<ArrayBuffer> },
      chave,
      conteudo as Uint8Array<ArrayBuffer>,
    ),
  );
}
