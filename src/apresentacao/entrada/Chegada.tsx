import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Dialogo } from '../componentes/Dialogo';
import { ROTULO_DA_AREA } from '../textos';
import { lembrarDaChegada } from './regras';

/** Uma linha por menu, na ordem das abas: o rótulo é o da aba. */
const MENUS = [
  { nome: ROTULO_DA_AREA.hoje, efeito: 'a próxima ação do seu Dia.' },
  { nome: ROTULO_DA_AREA.plano, efeito: 'o edital em Pontos: monte pelo catálogo ou traga o seu.' },
  { nome: ROTULO_DA_AREA.recall, efeito: 'seus Erros, Cartões e Revisões.' },
  { nome: ROTULO_DA_AREA.biblioteca, efeito: 'Normas, Súmulas, Teses e Resumos para ler.' },
];

/**
 * A Chegada (D-D9): a folha de orientação da primeira vez no aparelho, sobre o Hoje. O caminho principal
 * é escolher o concurso (da folha a uma norma aberta em três toques); ler uma norma e registrar um erro
 * são os outros dois, a trilha pelo edital vem em texto, os quatro menus em uma linha cada, e "Agora
 * não" fecha. O nome escrito é o do cabeçalho (`Marca`, na frequência dela): aqui ele não se repete.
 * Grava ao aparecer, e a Entrada do Dia não abre no mesmo Dia. Sem `dia`, é a reabertura pelo menu
 * Ajuda ("Rever as boas-vindas"): não grava nada e fecha ao seguir um caminho.
 */
export function Chegada({ dia, aoFechar }: { dia?: string; aoFechar?: () => void }) {
  const [aberto, setAberto] = useState(true);
  const principal = useRef<HTMLElement | null>(null);
  const fechar = () => {
    setAberto(false);
    aoFechar?.();
  };
  useEffect(() => {
    if (dia !== undefined) lembrarDaChegada(dia);
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
          onClick={fechar}
          className="botao principal"
          ref={(el) => {
            principal.current = el;
          }}
        >
          Escolher meu concurso
        </Link>
        <Link to="/biblioteca" onClick={fechar} className="botao">
          Ler uma norma
        </Link>
        <Link to="/recall/registrar" onClick={fechar} className="botao">
          Registrar um erro
        </Link>
        <Link to="/plano/onboarding" onClick={fechar} className="botao botao-texto chegada-trilha">
          <b>Montar uma trilha</b>
          <span>com base no edital de concursos parecidos; ou traga o seu, na Trilha</span>
        </Link>
      </div>
      <h3 className="chegada-menus-titulo">Os quatro menus</h3>
      <dl className="chegada-menus">
        {MENUS.map((m) => (
          <div key={m.nome}>
            <dt>{m.nome}</dt>
            <dd>{m.efeito}</dd>
          </div>
        ))}
      </dl>
      <div className="chegada-depois">
        <button type="button" className="botao botao-texto" onClick={fechar}>
          Agora não
        </button>
      </div>
    </Dialogo>
  );
}
