import { strFromU8, strToU8 } from 'fflate';

export { sha256 } from '../util/sha256';

export const paraBytes = (texto: string): Uint8Array => strToU8(texto);
export const deBytes = (bytes: Uint8Array): string => strFromU8(bytes);

export function paraBase64(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

export function deBase64(texto: string): Uint8Array {
  const binario = atob(texto);
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}
