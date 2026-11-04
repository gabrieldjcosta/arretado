import type { Repositorio } from '../../core/persistencia';
import { criarCartaoDeDispositivo } from '../../dominios/recall/servico';
import type { AlvoDasAcoes } from './AcoesDoDispositivo';

/** Cabe no verso do cartão (20.000 no modelo). */
const VERSO_MAXIMO = 20_000;

/**
 * O cartão do dispositivo que está no alto da tela (o "Cartão deste trecho" do "+" no Leitor, D-D24):
 * a frente pergunta o que diz a referência, e o verso é o texto vigente, sem o tachado. Só dispositivo com
 * texto tem cartão. A composição entre a Legislação e o Recall fica aqui, na apresentação (o domínio não
 * importa domínio, CLAUDE.md).
 */
export async function criarCartaoDoTrecho(
  repo: Repositorio,
  alvo: Pick<AlvoDasAcoes, 'dispositivoId' | 'referencia' | 'texto'>,
): Promise<void> {
  if (alvo.texto === undefined) throw new Error('dispositivo sem texto');
  await criarCartaoDeDispositivo(repo, {
    dispositivoId: alvo.dispositivoId,
    frente: `O que diz o ${alvo.referencia}?`,
    verso: alvo.texto.slice(0, VERSO_MAXIMO),
  });
}
