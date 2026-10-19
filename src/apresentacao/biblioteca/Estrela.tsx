// O controle da estrela (F2, 11.2), na calha à esquerda de cada linha que pode ter estrela: fora do
// texto vigente (não entra nos offsets da seleção) e posto por cima da calha, sem mudar a altura da
// linha. A origem não depende só da cor: direta é a estrela cheia grande; herdada, a cheia pequena
// sobre a faixa que desce do nó estrelado; exceção, a vazia cortada; sem estrela, a vazia fina.
// Estrela de luz de quatro pontas (D-D7, P4); o aro, na cor do fundo, corta a faixa em volta dela.
import type { EstadoDaEstrela } from '../../dominios/legislacao/estrelas';
import { nomeDaEstrela } from './rotulos';

const PONTAS = 'M12 2.5 14.2 9.8 21.5 12 14.2 14.2 12 21.5 9.8 14.2 2.5 12 9.8 9.8z';

export function BotaoDaEstrela({
  alvoId,
  alvo,
  estado,
  nomeDaOrigem,
}: {
  alvoId: string;
  alvo: string;
  estado: EstadoDaEstrela;
  nomeDaOrigem: string;
}) {
  const nome = nomeDaEstrela(alvo, estado, nomeDaOrigem);
  return (
    // O toque é tratado pela lista (um ouvinte só), pelo `data-estrela-de`.
    <button
      type="button"
      className="estrela"
      data-estrela-de={alvoId}
      data-origem={estado.origem ?? 'nenhuma'}
      data-fora-do-texto=""
      aria-pressed={estado.estrelado}
      aria-label={nome}
      title={nome}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path className="aro" d={PONTAS} />
        <path className="ponta" d={PONTAS} />
        {estado.origem === 'excecao' && <path className="corte" d="M4 20.5L20.5 4" />}
      </svg>
    </button>
  );
}
