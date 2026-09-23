import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { Biblioteca } from "./areas/biblioteca/Biblioteca";
import { Conta } from "./areas/conta/Conta";
import { Hoje } from "./areas/hoje/Hoje";
import { Plano } from "./areas/plano/Plano";
import { Recall } from "./areas/recall/Recall";
import { Shell } from "./shell/Shell";

/** Rotas fixas: quatro áreas + Conta (D6). O app abre no Hoje (§11, PWA). */
export const roteador = createBrowserRouter([
  {
    path: "/",
    Component: Shell,
    children: [
      { index: true, element: <Navigate to="/hoje" replace /> },
      { path: "hoje", Component: Hoje },
      { path: "plano", Component: Plano },
      { path: "recall", Component: Recall },
      { path: "biblioteca", Component: Biblioteca },
      { path: "conta", Component: Conta },
      { path: "*", element: <Navigate to="/hoje" replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={roteador} />;
}
