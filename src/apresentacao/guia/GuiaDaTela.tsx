import { useEffect, useState } from 'react';
import type { TelaComGuia } from './conteudo';
import { GUIAS } from './conteudo';
import { aoReabrirGuia, guiaJaVisto, marcarGuiaVisto } from './memoria';
import './estilos-guia.css';

/**
 * Guia curto da primeira abertura de uma área (nada de passo a passo): um cartão na própria tela,
 * sem sobrepor nada, que diz o que cada opção faz. Custa um toque ("Entendi") ou nenhum: quem
 * ignora o cartão não o vê de novo. Reabre pelo menu Ajuda.
 */
export function GuiaDaTela({ tela }: { tela: TelaComGuia }) {
  const [aberto, setAberto] = useState(() => !guiaJaVisto(tela));
  const guia = GUIAS[tela];

  // Conta como visto ao sair da tela ou fechar (não ao montar): a Entrada do Dia pode cobrir o Hoje.
  useEffect(() => {
    if (!aberto) return;
    return () => {
      marcarGuiaVisto(tela);
    };
  }, [aberto, tela]);

  useEffect(
    () =>
      aoReabrirGuia(tela, () => {
        setAberto(true);
      }),
    [tela],
  );

  if (!aberto) return null;
  return (
    <section className="guia-da-tela" aria-labelledby={`guia-${tela}`}>
      <h2 id={`guia-${tela}`}>{guia.titulo}</h2>
      <dl>
        {guia.linhas.map((l) => (
          <div key={l.opcao}>
            <dt>{l.opcao}</dt>
            <dd>{l.efeito}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        className="discreto"
        onClick={() => {
          marcarGuiaVisto(tela);
          setAberto(false);
        }}
      >
        Entendi
      </button>
    </section>
  );
}
