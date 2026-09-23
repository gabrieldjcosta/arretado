import { CSP, cabecalhosHospedagem } from './seguranca';

describe('cabeçalhos da hospedagem', () => {
  it('repetem a CSP da meta tag e acrescentam o que a meta não aceita', () => {
    const h = cabecalhosHospedagem();
    expect(h).toContain(`Content-Security-Policy: ${CSP}; frame-ancestors 'none'`);
    expect(h).toContain('X-Content-Type-Options: nosniff');
    expect(h).toMatch(/^\/\*\n/);
  });
});
