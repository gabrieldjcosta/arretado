import type { CapacitorConfig } from '@capacitor/cli';

// Casca Android (Fase 1 do plano de apps). O app é o mesmo `dist/`; nada de regra de negócio aqui.
const config: CapacitorConfig = {
  appId: 'cc.arretado.app',
  appName: 'Arretado',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: {
    // O app já usa `viewport-fit=cover` e `env(safe-area-inset-*)`; o Capacitor só repassa os valores certos.
    SystemBars: { insetsHandling: 'native', initialViewportFitValueHint: 'cover' },
  },
};

export default config;
