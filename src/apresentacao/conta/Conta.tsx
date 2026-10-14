import { useCallback } from 'react';
import { Link } from 'react-router';
import { relatosAguardando } from '../../suporte/relatos';
import { contasHabilitadas } from '../../integracoes/conta';
import { useDados } from '../dados/contexto';
import { ContaDoAparelhoSecao } from './sair/ContaDoAparelho';

/** Conta e Ajustes: fora da navegação de estudo (D6, D23). */
export function Conta() {
  const relatos = useDados(useCallback((r) => relatosAguardando(r), []));
  const pendentes = relatos.dados?.length ?? 0;
  return (
    <>
      <h1>Conta e ajustes</h1>
      <ul className="lista-simples">
        <li>
          <Link to="/conta/aparencia">Aparência</Link>
          <span className="dica">Tema e fonte de leitura</span>
        </li>
        <li>
          <Link to="/conta/perfis">Perfis de estudo</Link>
          <span className="dica">Calmo, Guiado ou Leitura (opcional)</span>
        </li>
        <li>
          <Link to="/conta/dados">Dados</Link>
          <span className="dica">Exportar, importar, restaurar, apagar</span>
        </li>
        <li>
          <Link to="/conta/privacidade">Privacidade e segurança</Link>
          <span className="dica">O que é guardado e onde</span>
        </li>
        <li>
          <Link to="/orientacoes">Orientações</Link>
          <span className="dica">Como funciona e cuidados com seus dados</span>
        </li>
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
