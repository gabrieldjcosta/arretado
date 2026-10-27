import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Dialogo } from '../componentes/Dialogo';
import { lembrarDaChegada } from './regras';

/**
 * A Chegada (D-D9): a folha de orientação da primeira vez no aparelho, sobre o Hoje. O caminho principal
 * é escolher o concurso (da folha a uma norma aberta em três toques, com a Trilha montada junto); ler
 * uma norma e registrar um erro são os outros dois, a trilha passo a passo vem em texto, e "Agora não"
 * fecha. O nome escrito é o do cabeçalho
 * (`Marca`, na frequência dela): aqui ele não se repete. Grava ao aparecer, e a Entrada do Dia não abre
 * no mesmo Dia.
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
          to="/comecar"
          className="botao principal"
          ref={(el) => {
            principal.current = el;
          }}
        >
          Escolher meu concurso
        </Link>
        <Link to="/biblioteca" className="botao">
          Ler uma norma
        </Link>
        <Link to="/recall/registrar" className="botao">
          Registrar um erro
        </Link>
        <Link to="/plano/onboarding" className="botao botao-texto chegada-trilha">
          <b>Montar a trilha passo a passo</b>
          <span>escolhendo edital e matérias</span>
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
