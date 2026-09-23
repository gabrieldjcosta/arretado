import type { CabecalhoCifrado } from "./manifesto";

/**
 * Cifra opcional do pacote (T6, §12.1): AES-256-GCM com chave derivada da senha por PBKDF2.
 * O app **não guarda a senha**; sem ela não há recuperação — e isto é dito com clareza na interface.
 *
 * Tudo por WebCrypto (`crypto.subtle`): nada de biblioteca de criptografia em JavaScript.
 */
export const ITERACOES_PBKDF2 = 600_000;
const TAMANHO_DO_SAL = 16;
const TAMANHO_DO_IV = 12;

export class ErroDeCifra extends Error {
  override name = "ErroDeCifra";
}

async function derivarChave(senha: string, sal: Uint8Array, iteracoes: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: sal as BufferSource, iterations: iteracoes, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface ConteudoCifrado {
  cabecalho: Omit<CabecalhoCifrado, "formato" | "versaoDoFormato" | "versaoDoEsquema" | "cifrado">;
  dados: Uint8Array;
}

export async function cifrar(conteudo: Uint8Array, senha: string): Promise<ConteudoCifrado> {
  if (!senha) throw new ErroDeCifra("Senha vazia: escolha uma senha ou exporte sem cifra.");
  const sal = crypto.getRandomValues(new Uint8Array(TAMANHO_DO_SAL));
  const iv = crypto.getRandomValues(new Uint8Array(TAMANHO_DO_IV));
  const chave = await derivarChave(senha, sal, ITERACOES_PBKDF2);
  const cifrado = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    chave,
    conteudo as BufferSource,
  );
  return {
    cabecalho: {
      kdf: "PBKDF2-SHA-256",
      iteracoes: ITERACOES_PBKDF2,
      sal: paraBase64(sal),
      iv: paraBase64(iv),
    },
    dados: new Uint8Array(cifrado),
  };
}

export async function decifrar(
  dados: Uint8Array,
  senha: string,
  cabecalho: Pick<CabecalhoCifrado, "sal" | "iv" | "iteracoes">,
): Promise<Uint8Array> {
  const chave = await derivarChave(senha, deBase64(cabecalho.sal), cabecalho.iteracoes);
  try {
    const aberto = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: deBase64(cabecalho.iv) as BufferSource },
      chave,
      dados as BufferSource,
    );
    return new Uint8Array(aberto);
  } catch {
    // AES-GCM não distingue senha errada de arquivo adulterado: os dois falham na verificação.
    throw new ErroDeCifra("Senha incorreta ou arquivo alterado fora do aplicativo.");
  }
}

/** SHA-256 em hexadecimal — usado nos hashes por arquivo e no hash do conjunto (§12.1). */
export async function sha256(dados: Uint8Array | string): Promise<string> {
  const bytes = typeof dados === "string" ? new TextEncoder().encode(dados) : dados;
  const resumo = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(resumo)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function paraBase64(bytes: Uint8Array): string {
  let texto = "";
  for (const byte of bytes) texto += String.fromCharCode(byte);
  return btoa(texto);
}

export function deBase64(texto: string): Uint8Array {
  const binario = atob(texto);
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}
