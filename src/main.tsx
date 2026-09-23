import { App } from "@apresentacao/App";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { iniciar } from "./composicao";
import "@apresentacao/estilos.css";
import { ProvedorCore } from "@apresentacao/shell/contexto-core";

const raiz = document.getElementById("raiz");
if (!raiz) throw new Error("Elemento #raiz ausente em index.html.");

// O Core (banco local, identidade, preferências) sobe antes de qualquer tela: local-first (D1).
iniciar().then((app) => {
  createRoot(raiz).render(
    <StrictMode>
      <ProvedorCore value={app}>
        <App />
      </ProvedorCore>
    </StrictMode>,
  );
});
