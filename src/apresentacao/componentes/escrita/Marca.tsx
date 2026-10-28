import { useEffect, useState } from 'react';
import { obterPreferencias } from '../../../core/preferencias';
import { useRepositorio } from '../../dados/contexto';
import { LockupParado } from '../LockupParado';
import { movimentoDoPerfil, type Movimento } from '../../movimento';
import { EscritaDoNome } from './EscritaDoNome';
import { escritaDaAbertura, lembrarDaEscrita } from './frequencia';
import { CAIXA_DO_LOCKUP } from './geometria';
import { useVezDaEscrita } from './vez-da-escrita';

/**
 * A marca do cabeçalho (D-D9, Q6): o nome escrito pela caneta na abertura em que a frequência
 * (`FREQUENCIA`) pede e o lockup parado nas demais. Decide uma vez, ao montar, e não volta atrás:
 * navegar entre as telas não repete a escrita. Um toque ou uma tecla em qualquer lugar pula para o
 * quadro final; a escrita nunca atrasa o uso (o app é local-first e o conteúdo aparece já).
 *
 * Movimento reduzido do sistema: parado. Perfil Calmo: o desenho só esmaece. O perfil vem das
 * Preferências, que o `AplicarAparencia` só põe em `data-perfil` depois de ler; por isso a escrita
 * espera a própria leitura (milissegundos, no aparelho) em vez de começar no escuro e trocar de
 * modo no meio. Se a leitura falha, vale o mais manso (esmaecer).
 *
 * A escrita acontece uma vez por abertura, ou na tela cheia ou aqui, nunca nos dois: quando a Abertura
 * (`entrada/abertura`) toma a escrita, este lockup nasce parado, com o ponto de luz onde a viagem da luz
 * pousa; enquanto ela ainda decide, espera (como espera as Preferências) e, se ela não abre (movimento
 * reduzido, "só estudo", Sessão aberta), escreve como sempre escreveu. Sem Abertura na árvore, decide sozinho.
 */
export function Marca() {
  const repo = useRepositorio();
  const vez = useVezDaEscrita();
  const [abertura] = useState(() => {
    const quando = repo.ctx.agora();
    return { quando, escrita: escritaDaAbertura(quando) };
  });
  const { quando, escrita } = abertura;
  const aguardando = vez.estado === 'pendente';
  const parada = escrita === 'parada' || (vez.estado === 'decidida' && vez.onde === 'tela');
  // `null`: esperando as Preferências.
  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const [pulou, setPulou] = useState(false);

  useEffect(() => {
    if (parada) return;
    let ativo = true;
    obterPreferencias(repo).then(
      (p) => {
        if (ativo) setMovimento(movimentoDoPerfil(p.perfilDeEstudo));
      },
      () => {
        if (ativo) setMovimento('calmo');
      },
    );
    return () => {
      ativo = false;
    };
  }, [parada, repo]);

  // Só conta como vista quando a escrita de fato começa (não enquanto espera as Preferências nem a Abertura).
  const escrevendo = !parada && !aguardando && movimento !== null;
  useEffect(() => {
    if (!escrevendo) return;
    lembrarDaEscrita(quando);
    const pular = () => {
      setPulou(true);
    };
    const opcoes = { once: true, capture: true } as const;
    document.addEventListener('pointerdown', pular, opcoes);
    document.addEventListener('keydown', pular, opcoes);
    return () => {
      document.removeEventListener('pointerdown', pular, opcoes);
      document.removeEventListener('keydown', pular, opcoes);
    };
  }, [escrevendo, quando]);

  if (parada) return <LockupParado />;
  if (movimento === null || aguardando) {
    return (
      <svg className="lockup" viewBox={CAIXA_DO_LOCKUP} aria-hidden="true" focusable="false" />
    );
  }
  return (
    <EscritaDoNome
      curta={escrita === 'curta'}
      calmo={movimento === 'calmo'}
      pulou={pulou || movimento === 'reduzido'}
    />
  );
}
