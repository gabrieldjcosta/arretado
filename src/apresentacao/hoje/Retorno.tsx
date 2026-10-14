// Bloco "Retorno" do Hoje (pacote A3b): boas-vindas de volta depois de uma pausa e o gesto de
// fechar o Dia. Sem dívida, sem sequência quebrada, sem rótulo clínico; tudo dispensável.
import { useState } from 'react';
import { Link } from 'react-router';
import { situacaoDeRetorno } from '../../dominios/dia/retorno';
import { hoje } from '../../dominios/recall/servico';
import { useDados, useRepositorio } from '../dados/contexto';
import { FecharDia } from './FecharDia';
import './estilos-dia.css';

const CHAVE = 'arretado.retorno-dispensado';

const lerDispensa = (): string | null => {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
};
const gravarDispensa = (data: string) => {
  try {
    localStorage.setItem(CHAVE, data);
  } catch {
    /* sem armazenamento: some só até recarregar */
  }
};

export function BoasVindas() {
  const repo = useRepositorio();
  const data = hoje(repo);
  const { dados } = useDados(situacaoDeRetorno);
  const [dispensado, setDispensado] = useState(() => lerDispensa() === data);
  if (!dados || dispensado) return null;
  const rota = `/sessao/iniciar?${new URLSearchParams({
    tipo: 'livre',
    ...(dados.alvoRotulo ? { rotulo: dados.alvoRotulo } : {}),
    origem: 'escolha_propria',
    razao: 'Voltando',
  }).toString()}`;
  return (
    <section className="cartao-bloco retorno" aria-label="Bem-vindo de volta">
      <h2 className="retorno-titulo">Que bom ter você de volta</h2>
      <p className="retorno-texto">
        Seu material e seus cartões estão como você deixou. Dá para começar pequeno.
      </p>
      {dados.proximoPasso && (
        <p className="retorno-passo">
          Você deixou anotado: <q>{dados.proximoPasso}</q>
        </p>
      )}
      <div className="linha-acoes">
        <Link to={rota} className="botao principal">
          {dados.proximoPasso ? 'Retomar daqui' : 'Começar leve'}
        </Link>
        <button
          type="button"
          onClick={() => {
            gravarDispensa(data);
            setDispensado(true);
          }}
        >
          Agora não
        </button>
      </div>
    </section>
  );
}

export function Retorno() {
  return (
    <>
      <BoasVindas />
      <FecharDia />
    </>
  );
}
