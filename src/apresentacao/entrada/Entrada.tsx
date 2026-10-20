import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { ProximaAcao, ResultadoProximaAcao } from '../../dominios/hoje/contrato';
import { Dialogo } from '../componentes/Dialogo';
import { rotaDeInicio } from '../hoje/rota-de-inicio';
import { rotuloDoBotao, tituloDaAcao } from '../hoje/textos-da-acao';
import { lembrarDaEntrada, type Abertura } from './regras';

/** "Continuar a leitura" já diz o que é; nas outras o título é o objeto: "Começar: Revisar cartões". */
function rotuloDoPrincipal(acao: ProximaAcao): string {
  return acao.tipo === 'leitura_salva'
    ? tituloDaAcao(acao)
    : `${rotuloDoBotao(acao)}: ${tituloDaAcao(acao)}`;
}

/**
 * A Entrada do Dia (D-D9): a saudação, uma Citação, a dica de hoje e o caminho para o Agora. É o
 * `Dialogo` do app (foco preso, Esc fecha), com a Citação e a dica como descrição. O foco vai para o
 * botão principal; "Agora não" e Esc só fecham. Sem Agora (o Hoje vazio), fica o "Continuar", que fecha.
 */
export function Entrada({
  abertura,
  agora,
}: {
  abertura: Extract<Abertura, { tipo: 'entrada' }>;
  agora: ResultadoProximaAcao;
}) {
  const { dia, saudacao, conteudo } = abertura;
  const { citacao, dica } = conteudo;
  const [aberto, setAberto] = useState(true);
  const idCorpo = useId();
  const principal = useRef<HTMLElement | null>(null);
  const fechar = () => {
    setAberto(false);
  };
  // Grava ao aparecer, não ao fechar: fechar o aplicativo no meio não a traz de volta no mesmo Dia.
  useEffect(() => {
    lembrarDaEntrada(dia);
    principal.current?.focus();
  }, [dia]);
  const acao = agora.tipo === 'acao' ? agora.acao : undefined;
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={fechar}
      titulo={saudacao}
      classe="dialogo-entrada"
      descritoPor={idCorpo}
    >
      <div id={idCorpo}>
        <figure className="entrada-citacao">
          <blockquote>
            <p>{citacao.texto}</p>
          </blockquote>
          <figcaption>
            {citacao.autor}, {citacao.obra}
          </figcaption>
        </figure>
        <hr />
        <h3>Dica de hoje</h3>
        <p className="entrada-dica">
          <strong>{dica.destaque}</strong> {dica.texto}
        </p>
      </div>
      <div className="linha-acoes">
        {acao === undefined ? (
          <button
            type="button"
            className="botao principal"
            ref={(el) => {
              principal.current = el;
            }}
            onClick={fechar}
          >
            Continuar
          </button>
        ) : (
          <>
            <Link
              to={rotaDeInicio(acao)}
              className="botao principal"
              ref={(el) => {
                principal.current = el;
              }}
            >
              {rotuloDoPrincipal(acao)}
            </Link>
            <button type="button" className="botao botao-texto" onClick={fechar}>
              Agora não
            </button>
          </>
        )}
      </div>
    </Dialogo>
  );
}
