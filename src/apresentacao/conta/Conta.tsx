import { useCallback } from 'react';
import { relatosAguardando } from '../../suporte/relatos';
import { contasHabilitadas } from '../../integracoes/conta';
import { LinhaLista } from '../componentes/LinhaLista';
import { useDados } from '../dados/contexto';
import { LinhaDeSincronizacao } from './LinhaDeSincronizacao';
import { LinhaDoPasseio } from './LinhaDoPasseio';
import { RegistrarAceite } from './entrar/RegistrarAceite';
import { ContaDoAparelhoSecao } from './sair/ContaDoAparelho';
import './estilos-conta.css';

const ITENS_CONTA = [
  { caminho: '/conta/aparencia', titulo: 'Aparência', dica: 'Tema e fonte de leitura' },
  {
    caminho: '/conta/perfis',
    titulo: 'Perfis de estudo',
    dica: 'Calmo, Guiado ou Leitura (opcional)',
  },
  { caminho: '/conta/dados', titulo: 'Dados', dica: 'Exportar, importar, restaurar, apagar' },
  {
    caminho: '/conta/privacidade',
    titulo: 'Privacidade e segurança',
    dica: 'O que é guardado e onde',
  },
  {
    caminho: '/orientacoes',
    titulo: 'Orientações',
    dica: 'Como funciona e cuidados com seus dados',
  },
] as const;

/** Conta e Ajustes: fora da navegação de estudo (D6, D23). */
export function Conta() {
  const relatos = useDados(useCallback((r) => relatosAguardando(r), []));
  const pendentes = relatos.dados?.length ?? 0;
  return (
    <>
      <h1>Conta e ajustes</h1>
      <ul className="lista-simples lista-de-linhas">
        {ITENS_CONTA.map((item) => (
          <li key={item.caminho}>
            <LinhaLista para={item.caminho} titulo={item.titulo} apoio={item.dica} />
          </li>
        ))}
        <li>
          <LinhaDoPasseio />
        </li>
        {contasHabilitadas() && (
          <li>
            <LinhaDeSincronizacao />
          </li>
        )}
      </ul>
      {contasHabilitadas() && (
        <>
          <RegistrarAceite />
          <ContaDoAparelhoSecao />
        </>
      )}
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
