import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { pedirArmazenamentoPersistente } from './core/persistencia';
import { App } from './apresentacao/App';
import { contasHabilitadas, criarServicoDeConta, tratarRetornoDoLogin } from './integracoes/conta';
import { registrarServiceWorker } from './offline/registro';
import { ouvirRetornoDoLogin } from './integracoes/conta/casca';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz ausente em index.html');

void pedirArmazenamentoPersistente();
// Abrir sem rede (AP-00): o service worker guarda o app no aparelho; sem ele, nada muda.
void registrarServiceWorker();

/** Com a F4-A ligada, o retorno do login (`?code=`) é tratado antes do roteador por hash. */
async function iniciar(elemento: HTMLElement) {
  if (contasHabilitadas()) {
    try {
      const servico = criarServicoDeConta();
      await tratarRetornoDoLogin({ servico });
      void ouvirRetornoDoLogin(servico).catch(() => undefined);
    } catch {
      // Nunca impede o estudo: sem conta o app abre como sempre.
    }
  }
  createRoot(elemento).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void iniciar(raiz);
