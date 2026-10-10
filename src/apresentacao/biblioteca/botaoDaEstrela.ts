// Quando o botão da estrela aparece na linha (redesign, peça 1): só onde há estrela direta, ou na
// linha ativa (sob o ponteiro, o dedo ou o foco), para poder marcar. A herdada, a exceção e a
// ausência de estrela ficam sem ícone: a origem delas aparece na barra lateral.
import type { EstadoDaEstrela } from '../../dominios/legislacao/estrelas';

export function mostrarBotaoDaEstrela(estado: EstadoDaEstrela, linhaAtiva: boolean): boolean {
  return estado.origem === 'direta' || linhaAtiva;
}
