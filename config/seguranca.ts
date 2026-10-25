// Fonte única da política de segurança do app publicado (D18, T9).
import { URL_SUPABASE } from '../src/integracoes/conta/projeto';

/**
 * Origens externas que o app pode chamar (F4: Supabase, provedor de login, Worker de IA).
 * Vazia hoje: o app só fala com o próprio site. Cada entrada é uma origem https exata, sem curinga;
 * acrescentar uma é decisão registrada (T-nova), não ajuste solto.
 */
export const ORIGENS_DE_CONEXAO: readonly string[] = [];

/**
 * Origens do build: com `VITE_CONTA=1` (F4-A, T27) entra só a do projeto Supabase; com qualquer outro
 * valor a lista é a de hoje e a CSP não muda.
 */
export function origensDoBuild(contas: boolean): readonly string[] {
  return contas ? [...ORIGENS_DE_CONEXAO, URL_SUPABASE] : ORIGENS_DE_CONEXAO;
}

/** Monta a CSP estrita; `origens` só amplia o `connect-src` (nada mais). */
export function montarCSP(origens: readonly string[] = ORIGENS_DE_CONEXAO): string {
  for (const origem of origens) {
    let url: URL;
    try {
      url = new URL(origem);
    } catch {
      throw new Error(`Origem de conexão inválida: ${origem}`);
    }
    if (url.protocol !== 'https:' || url.origin !== origem || origem.includes('*')) {
      throw new Error(`Origem de conexão deve ser https exata, sem curinga nem caminho: ${origem}`);
    }
  }
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    ['connect-src', "'self'", ...origens].join(' '),
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "require-trusted-types-for 'script'",
    'trusted-types dompurify',
  ].join('; ');
}

/** CSP estrita; também vai na meta tag (a meta não aceita frame-ancestors). */
export const CSP = montarCSP();

/** Arquivo `_headers` da hospedagem (Cloudflare Workers, T18; mesmo formato do Pages e do Netlify). */
export function cabecalhosHospedagem(csp: string = CSP): string {
  return [
    '/*',
    `  Content-Security-Policy: ${csp}; frame-ancestors 'none'`,
    '  X-Frame-Options: DENY',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: no-referrer',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '/index.html',
    '  Cache-Control: no-cache',
    '',
  ].join('\n');
}
