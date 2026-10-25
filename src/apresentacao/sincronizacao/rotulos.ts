import type { EstadoDePosse } from '../../core/sincronizacao';

/** Posse de aparelho (D17) em palavras; quem só tem um aparelho lê "Este aparelho" e nada mais. */
export const ROTULO_DA_POSSE: Record<EstadoDePosse['tipo'], string> = {
  parada: 'Ainda conferindo qual Aparelho está ativo.',
  minha: 'Este Aparelho.',
  'de-outro':
    'Você está usando outro Aparelho agora. Aqui dá para ler; para editar, passe a edição para cá.',
  'sem-confirmacao':
    'Sem confirmar qual Aparelho está ativo (sem conexão). Você pode editar; se outro Aparelho mudar o mesmo registro, o app mostra o Conflito depois.',
};

/** Com rede e outro aparelho em uso, este fica em leitura (plano §4); sem rede edita com aviso (Q1). */
export function motivoDaTrava(posse: EstadoDePosse, conectado: boolean): string | null {
  return posse.tipo === 'de-outro' && conectado ? 'Outro aparelho está editando agora.' : null;
}

/** Aviso curto da faixa no alto da tela, só nos estados que mudam o que a pessoa pode fazer. */
export const AVISO_DA_POSSE: Partial<Record<EstadoDePosse['tipo'], string>> = {
  'de-outro': 'Você está usando outro aparelho agora. Passar a editar aqui?',
  'sem-confirmacao': 'Sem confirmar qual aparelho está ativo. Você pode editar.',
};
