import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Dialogo } from '../componentes/Dialogo';
import { ROTULO_DA_AREA } from '../textos';
import { lembrarDaChegada } from './regras';

/** Uma linha por menu, na ordem das abas: o rótulo é o da aba. */
const MENUS = [
  { nome: ROTULO_DA_AREA.hoje, efeito: 'a próxima ação do seu Dia.' },
  {
    nome: ROTULO_DA_AREA.plano,
    efeito: 'o edital em Pontos, montado pelo catálogo ou trazido por você.',
  },
  { nome: ROTULO_DA_AREA.recall, efeito: 'suas Frases e Cartões, com a Revisão de cada dia.' },
  {
    nome: ROTULO_DA_AREA.biblioteca,
    efeito: 'Normas, Súmulas, Teses, Resumos e Precedentes, para ler.',
  },
];

/** O que há dentro de uma Norma e quase ninguém acha sozinho. */
const NA_NORMA = [
  {
    nome: 'Mapa da norma',
    efeito: 'o que mais cai e o próximo trecho a ler (normas do acervo com dados).',
  },
  { nome: 'Estrela', efeito: 'marca um Dispositivo para achar de novo.' },
];

/**
 * A Chegada (D-D9): a folha de orientação da primeira vez no aparelho, sobre o Hoje. O caminho principal
 * é escolher o concurso (da folha a uma norma aberta em três toques, com a Trilha montada junto); ler
 * uma norma e registrar um erro são os outros dois, a trilha passo a passo vem em texto, os quatro
 * menus em uma linha cada, e "Agora não" fecha. O nome escrito é o do cabeçalho (`Marca`, na
 * frequência dela): aqui ele não se repete. Grava ao aparecer, e a Entrada do Dia não abre no mesmo
 * Dia. Sem `dia`, é a reabertura pelo menu Ajuda ("Rever as boas-vindas"): não grava nada e fecha ao
 * seguir um caminho.
 */
export function Chegada({ dia, aoFechar }: { dia?: string; aoFechar?: () => void }) {
  const [aberto, setAberto] = useState(true);
  const principal = useRef<HTMLElement | null>(null);
  const fechar = () => {
    setAberto(false);
  };
  // Seguir um caminho tira a folha já: o foco fica com a página nova, não volta ao Ajuda.
  const seguir = () => {
    setAberto(false);
    aoFechar?.();
  };
  useEffect(() => {
    if (dia !== undefined) lembrarDaChegada(dia);
    principal.current?.focus();
  }, [dia]);
  // Dispensada (Esc, "Agora não"), a folha reaberta só sai depois de o <dialog> fechar: assim o foco volta ao Ajuda.
  useEffect(() => {
    if (!aberto) aoFechar?.();
  }, [aberto, aoFechar]);
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
          onClick={seguir}
          className="botao principal"
          ref={(el) => {
            principal.current = el;
          }}
        >
          Escolher meu concurso
        </Link>
        <Link to="/biblioteca" onClick={seguir} className="botao">
          Ler uma norma
        </Link>
        <Link to="/recall/registrar" onClick={seguir} className="botao">
          Registrar um erro
        </Link>
        <Link to="/plano/onboarding" onClick={seguir} className="botao botao-texto chegada-trilha">
          <b>Montar a trilha passo a passo</b>
          <span>escolhendo edital e matérias; ou traga o seu edital, na Trilha</span>
        </Link>
      </div>
      <div className="chegada-depois">
        <button type="button" className="botao botao-texto" onClick={fechar}>
          Agora não
        </button>
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
      <h3 className="chegada-menus-titulo">Dentro de uma Norma</h3>
      <dl className="chegada-menus">
        {NA_NORMA.map((m) => (
          <div key={m.nome}>
            <dt>{m.nome}</dt>
            <dd>{m.efeito}</dd>
          </div>
        ))}
      </dl>
    </Dialogo>
  );
}
