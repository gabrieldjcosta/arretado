import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { criarEncontro } from '../../componentes/escrita/encontro';
import { escritaDaAbertura } from '../../componentes/escrita/frequencia';
import { ContextoDaAbertura, type VezDaEscrita } from '../../componentes/escrita/vez-da-escrita';
import { useRepositorio } from '../../dados/contexto';
import { Abertura } from './Abertura';
import { decidirNaAberturaDoApp } from './regras';

/**
 * Decide, uma vez por abertura do aplicativo, quem escreve o nome (a camada de tela cheia ou o
 * cabeçalho), monta a camada quando é dela e diz a quem abre por cima do app (a Chegada) que espere. Na
 * primeira vez, com a Chegada por vir, a luz visita o Zé dela: a Chegada abre já, escondida, e o
 * `Encontro` que este provedor guarda leva a oferta dela à Abertura.
 *
 * A abertura em que a frequência não pede o nome (as demais do Dia, ou movimento reduzido) é decidida
 * na hora, sem esperar dado nenhum: o cabeçalho nasce parado e nada muda. Nas outras, a leitura das
 * Preferências e da Sessão (ver `decidirOndeEscrever`) diz se a tela cheia abre; até lá o cabeçalho
 * espera, para os dois nunca escreverem juntos. Fica por dentro do repositório (Preferências e Sessão
 * moram nele) e por fora de tudo o que escreve ou abre por cima.
 */
export function ProvedorDaAbertura({ children }: { children: ReactNode }) {
  const repo = useRepositorio();
  const [vez, setVez] = useState<VezDaEscrita>(() =>
    escritaDaAbertura(repo.ctx.agora()) === 'parada'
      ? { estado: 'decidida', onde: 'cabecalho', escrita: 'parada' }
      : { estado: 'pendente' },
  );
  const [saiu, setSaiu] = useState(false);
  const [encontro] = useState(criarEncontro);

  useEffect(() => {
    if (vez.estado !== 'pendente') return;
    let ativo = true;
    void decidirNaAberturaDoApp(repo).then((decisao) => {
      if (ativo) setVez({ estado: 'decidida', ...decisao });
    });
    return () => {
      ativo = false;
    };
  }, [repo, vez.estado]);

  const aoSair = useCallback(() => {
    setSaiu(true);
  }, []);

  const naTela = vez.estado === 'decidida' && vez.onde === 'tela' && !saiu ? vez : null;
  // O Calmo não tem voo: a luz não visita o Zé, e a Chegada espera a camada sair, como a do Dia.
  const visitaOZe = naTela !== null && naTela.chegada && !naTela.calmo;
  const valor = useMemo(
    () => ({
      vez,
      emCurso: vez.estado === 'pendente' || naTela !== null,
      voaParaAChegada: visitaOZe,
      encontro,
    }),
    [vez, naTela, visitaOZe, encontro],
  );
  return (
    <ContextoDaAbertura.Provider value={valor}>
      {children}
      {naTela && (
        <Abertura
          escrita={naTela.escrita}
          calmo={naTela.calmo}
          aoSair={aoSair}
          encontro={visitaOZe ? encontro : undefined}
        />
      )}
    </ContextoDaAbertura.Provider>
  );
}
