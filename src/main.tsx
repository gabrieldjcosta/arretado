import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { pedirArmazenamentoPersistente } from './core/persistencia';
import { App } from './apresentacao/App';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz ausente em index.html');

void pedirArmazenamentoPersistente();

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
