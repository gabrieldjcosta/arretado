import { URL_SUPABASE } from '../src/integracoes/conta/projeto';
import { CSP, cabecalhosHospedagem, montarCSP, origensDoBuild } from './seguranca';

describe('cabeçalhos da hospedagem', () => {
  it('repetem a CSP da meta tag e acrescentam o que a meta não aceita', () => {
    const h = cabecalhosHospedagem();
    expect(h).toContain(`Content-Security-Policy: ${CSP}; frame-ancestors 'none'`);
    expect(h).toContain('X-Content-Type-Options: nosniff');
    expect(h).toContain('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    expect(h).toMatch(/^\/\*\n/);
  });
});

describe('montarCSP', () => {
  it('hoje só permite o próprio site', () => {
    expect(CSP).toContain("connect-src 'self';");
  });

  it('amplia só o connect-src com origens https exatas', () => {
    const csp = montarCSP(['https://abc.supabase.co']);
    expect(csp).toContain("connect-src 'self' https://abc.supabase.co;");
    expect(csp.replace(/connect-src [^;]*/, '')).toBe(CSP.replace(/connect-src [^;]*/, ''));
  });

  it.each(['http://x.com', 'https://*.x.com', 'https://x.com/api', 'x.com', '*'])(
    'recusa %s',
    (origem) => {
      expect(() => montarCSP([origem])).toThrow();
    },
  );
});

describe('origensDoBuild (F4-A)', () => {
  it('com a chave desligada a CSP é a de hoje', () => {
    expect(montarCSP(origensDoBuild(false))).toBe(CSP);
  });

  it('com a chave ligada o connect-src ganha só a origem exata do projeto Supabase', () => {
    const csp = montarCSP(origensDoBuild(true));
    expect(csp).toContain(`connect-src 'self' ${URL_SUPABASE};`);
    expect(csp).toContain("require-trusted-types-for 'script'");
    expect(csp.replace(/connect-src [^;]*/, '')).toBe(CSP.replace(/connect-src [^;]*/, ''));
  });

  it('cabeçalhos aceitam a CSP do build', () => {
    const csp = montarCSP(origensDoBuild(true));
    expect(cabecalhosHospedagem(csp)).toContain(`Content-Security-Policy: ${csp};`);
  });
});
