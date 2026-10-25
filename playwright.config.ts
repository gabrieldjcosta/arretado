import { defineConfig, devices } from '@playwright/test';

const PORTA = 4173;
// Build próprio do E2E da conta (T30): VITE_CONTA=1 e serviço falso, sem tocar no build padrão.
const PORTA_CONTA = 4174;
const SAIDA_CONTA = 'node_modules/.arretado-e2e-conta';
const SPECS_DA_CONTA = /conta-.*\.spec\.ts$/;

// Tablet Android em retrato (712 × 1138, Chromium como os outros): logo acima do corte de
// 700 px, com a barra de cima do desktop e a coluna de leitura quase da largura da tela (11.1).
const APARELHOS = [
  ['desktop', devices['Desktop Chrome']],
  ['celular', devices['Pixel 7']],
  ['tablet', devices['Galaxy Tab S4']],
] as const;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Um reteste só no CI: os flakes de relógio no tablet (Leitor) passavam num rerun; o relatório marca o teste como "flaky".
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    // O service worker (AP-00) responderia do cache e passaria por cima de `page.route`; só a
    // `offline.spec.ts` o liga (`test.use({ serviceWorkers: 'allow' })`).
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    ...APARELHOS.map(([name, aparelho]) => ({
      name,
      testIgnore: SPECS_DA_CONTA,
      use: { ...aparelho, baseURL: `http://localhost:${String(PORTA)}` },
    })),
    ...APARELHOS.map(([name, aparelho]) => ({
      name: `conta-${name}`,
      testMatch: SPECS_DA_CONTA,
      use: { ...aparelho, baseURL: `http://localhost:${String(PORTA_CONTA)}` },
    })),
  ],
  webServer: [
    {
      command: `npm run build && npx vite preview --port ${String(PORTA)} --strictPort`,
      port: PORTA,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx vite build --mode e2e-conta --outDir ${SAIDA_CONTA} --emptyOutDir && npx vite preview --outDir ${SAIDA_CONTA} --port ${String(PORTA_CONTA)} --strictPort`,
      port: PORTA_CONTA,
      env: { VITE_CONTA: '1' },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
