// Fonte única da política de segurança do app publicado (D18, T9).

/** CSP estrita; também vai na meta tag (a meta não aceita frame-ancestors). */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  'trusted-types dompurify',
].join('; ');

/** Arquivo `_headers` da hospedagem (Cloudflare Workers, T18; mesmo formato do Pages e do Netlify). */
export function cabecalhosHospedagem(): string {
  return [
    '/*',
    `  Content-Security-Policy: ${CSP}; frame-ancestors 'none'`,
    '  X-Frame-Options: DENY',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: no-referrer',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Strict-Transport-Security: max-age=31536000',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '/index.html',
    '  Cache-Control: no-cache',
    '',
  ].join('\n');
}
