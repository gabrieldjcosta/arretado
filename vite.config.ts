import { randomBytes } from "node:crypto";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const raiz = (caminho: string) => fileURLToPath(new URL(caminho, import.meta.url));

/**
 * Em desenvolvimento o Vite e o plugin do React injetam um script inline (HMR, preâmbulo do React).
 * Este plugin acrescenta um nonce à CSP do `index.html` só no servidor de desenvolvimento;
 * o build de produção mantém `script-src 'self'` sem nonce (T8).
 */
function cspComNonceEmDesenvolvimento(nonce: string): Plugin {
  return {
    name: "arretado:csp-dev-nonce",
    apply: "serve",
    transformIndexHtml(html) {
      return html.replace("script-src 'self'", `script-src 'self' 'nonce-${nonce}'`);
    },
  };
}

export default defineConfig(({ command }) => {
  const nonceDev = randomBytes(16).toString("base64");
  return {
    plugins: [react(), tailwindcss(), cspComNonceEmDesenvolvimento(nonceDev)],
    html: command === "serve" ? { cspNonce: nonceDev } : {},
    resolve: {
      alias: {
        "@core": raiz("./src/core"),
        "@dominios": raiz("./src/dominios"),
        "@integracoes": raiz("./src/integracoes"),
        "@apresentacao": raiz("./src/apresentacao"),
        "@suporte": raiz("./src/suporte"),
      },
    },
    build: {
      // Local-first: nada de dependência de rede no bundle; sourcemaps ajudam relatos de Problema.
      sourcemap: true,
      target: "es2022",
    },
  };
});
