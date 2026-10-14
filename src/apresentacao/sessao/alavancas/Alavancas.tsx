// Alavancas da Sessão aberta (A3a): só estudo, temporizador opcional e estacionamento.
import type { Sessao } from '../../../core/modelo';
import { Estacionamento } from './Estacionamento';
import { SoEstudo } from './SoEstudo';
import { Temporizador } from './Temporizador';

export function Alavancas({ sessao }: { sessao: Sessao }) {
  return (
    <div className="alavancas">
      <SoEstudo />
      <Temporizador sessao={sessao} />
      <Estacionamento sessao={sessao} />
    </div>
  );
}
