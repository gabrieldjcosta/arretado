import { useCallback } from 'react';
import { Link } from 'react-router';
import { relatosAguardando } from '../../suporte/relatos';
import { contasHabilitadas } from '../../integracoes/conta';
import { useDados } from '../dados/contexto';
import { ContaDoAparelhoSecao } from './sair/ContaDoAparelho';
import './estilos-conta.css';

const ITENS_CONTA = [
  {
    caminho: '/conta/aparencia',
    titulo: 'Aparência',
    dica: 'Tema e fonte de leitura',
    icone: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  {
    caminho: '/conta/perfis',
    titulo: 'Perfis de estudo',
    dica: 'Calmo, Guiado ou Leitura (opcional)',
    icone: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    caminho: '/conta/dados',
    titulo: 'Dados',
    dica: 'Exportar, importar, restaurar, apagar',
    icone: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
  {
    caminho: '/conta/privacidade',
    titulo: 'Privacidade e segurança',
    dica: 'O que é guardado e onde',
    icone: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    caminho: '/orientacoes',
    titulo: 'Orientações',
    dica: 'Como funciona e cuidados com seus dados',
    icone: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
] as const;

/** Conta e Ajustes: fora da navegação de estudo (D6, D23). */
export function Conta() {
  const relatos = useDados(useCallback((r) => relatosAguardando(r), []));
  const pendentes = relatos.dados?.length ?? 0;
  return (
    <>
      <h1>Conta e ajustes</h1>
      <ul className="menu-conta-lista">
        {ITENS_CONTA.map((item) => (
          <li key={item.caminho}>
            <Link to={item.caminho} className="cartao-link-conta">
              <span className="cartao-link-icone">{item.icone}</span>
              <div className="cartao-link-texto">
                <span className="cartao-link-titulo">{item.titulo}</span>
                <span className="dica">{item.dica}</span>
              </div>
              <span className="cartao-link-seta" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {contasHabilitadas() && <ContaDoAparelhoSecao />}
      {pendentes > 0 && (
        <p className="dica">
          {pendentes === 1
            ? '1 relato de problema aguardando envio.'
            : `${String(pendentes)} relatos de problema aguardando envio.`}
        </p>
      )}
    </>
  );
}
