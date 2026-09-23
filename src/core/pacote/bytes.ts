import { strFromU8, strToU8 } from 'fflate';

export const paraBytes = (texto: string): Uint8Array => strToU8(texto);
export const deBytes = (bytes: Uint8Array): string => strFromU8(bytes);

/** SHA-256 em hexadecimal (WebCrypto). */
export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function paraBase64(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

export function deBase64(texto: string): Uint8Array {
  const binario = atob(texto);
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}
