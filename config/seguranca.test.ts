import { CSP, cabecalhosHospedagem, montarCSP } from './seguranca';

describe('cabeçalhos da hospedagem', () => {
  it('repetem a CSP da meta tag e acrescentam o que a meta não aceita', () => {
    const h = cabecalhosHospedagem();
    expect(h).toContain(`Content-Security-Policy: ${CSP}; frame-ancestors 'none'`);
    expect(h).toContain('X-Content-Type-Options: nosniff');
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
