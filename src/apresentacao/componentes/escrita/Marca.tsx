import { useEffect, useState } from 'react';
import { obterPreferencias } from '../../../core/preferencias';
import { useRepositorio } from '../../dados/contexto';
import { LockupParado } from '../LockupParado';
import { movimentoDoPerfil, type Movimento } from '../../movimento';
import { EscritaDoNome } from './EscritaDoNome';
import { escritaDaAbertura, lembrarDaEscrita } from './frequencia';
import { CAIXA_DO_LOCKUP } from './geometria';

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
 */
export function Marca() {
  const repo = useRepositorio();
  const [abertura] = useState(() => {
    const quando = repo.ctx.agora();
    return { quando, escrita: escritaDaAbertura(quando) };
  });
  const { quando, escrita } = abertura;
  const parada = escrita === 'parada';
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

  // Só conta como vista quando a escrita de fato começa (não enquanto espera as Preferências).
  const escrevendo = !parada && movimento !== null;
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
  if (movimento === null) {
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
