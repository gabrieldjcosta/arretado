import { defineConfig, devices } from '@playwright/test';

const PORTA = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORTA}`,
    trace: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
    // Tablet Android em retrato (712 × 1138, Chromium como os outros): logo acima do corte de
    // 700 px, com a barra de cima do desktop e a coluna de leitura quase da largura da tela (11.1).
    { name: 'tablet', use: { ...devices['Galaxy Tab S4'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORTA} --strictPort`,
    port: PORTA,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
