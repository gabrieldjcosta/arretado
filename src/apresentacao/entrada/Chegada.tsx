import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Dialogo } from '../componentes/Dialogo';
import { lembrarDaChegada } from './regras';

/**
 * A Chegada (D-D9): a folha de orientação da primeira vez no aparelho, sobre o Hoje. Três caminhos que
 * levam a telas que já existem e "Agora não". O nome escrito é o do cabeçalho (`Marca`, na frequência
 * dela): aqui ele não se repete. Grava ao aparecer, e a Entrada do Dia não abre no mesmo Dia.
 */
export function Chegada({ dia }: { dia: string }) {
  const [aberto, setAberto] = useState(true);
  const principal = useRef<HTMLElement | null>(null);
  const fechar = () => {
    setAberto(false);
  };
  useEffect(() => {
    lembrarDaChegada(dia);
    principal.current?.focus();
  }, [dia]);
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={fechar}
      titulo="Boas-vindas ao Arretado!"
      classe="dialogo-chegada"
    >
      <div className="chegada-acoes">
        <Link
          to="/recall/registrar"
          className="botao principal"
          ref={(el) => {
            principal.current = el;
          }}
        >
          Registrar um erro
        </Link>
        <Link to="/biblioteca" className="botao">
          Ler uma norma
        </Link>
        <Link to="/plano/onboarding" className="botao botao-texto chegada-trilha">
          <b>Montar uma trilha</b>
          <span>com base em editais parecidos</span>
        </Link>
      </div>
      <div className="chegada-depois">
        <button type="button" className="botao botao-texto" onClick={fechar}>
          Agora não
        </button>
      </div>
    </Dialogo>
  );
}
