// O puxão com o que a tela sabe: o gerador diz o próximo passo; aqui a tela reconhece o passo que a
// pessoa fez fora do cartão (Revisar) e pula, sem custo, os passos que o Arretado novo ainda não
// hospeda. Puro: quem chama grava o resultado.
import {
  abrirPasso,
  concluirPasso,
  pularPasso,
  puxar,
  type EntradaDoFio,
  type EstadoDoFio,
  type ProximoDoFio,
  type TipoDePasso,
} from '../../../dominios/fio';
import type { FioGuardado, MarcasDoFio } from './guardado';

/**
 * Os passos que têm tela no Arretado novo. Os outros se pulam sozinhos (regra 10: pular não custa
 * nada) até a tela deles entrar; ao entrar, o tipo vem para cá.
 */
export const PASSOS_COM_TELA: ReadonlySet<TipoDePasso> = new Set<TipoDePasso>([
  'ler',
  'lembrar',
  'guardar',
  'revisar',
  'praticar',
  'seu_passo',
]);

export interface Avanco extends FioGuardado {
  proximo: ProximoDoFio;
}

/** O limite de voltas é só uma trava: uma etapa tem no máximo uns dez passos. */
const VOLTAS = 64;

/**
 * Puxa o próximo passo (ou o pouso). No caminho: o Ler que a leitura fora do Fio já cobriu nasce
 * "Já feito" (o gerador faz); o Revisar cujos vencidos baixaram desde que a pessoa entrou fecha com o
 * que baixou; o passo sem tela fecha como pulado.
 */
export function avancar(fio: FioGuardado, entrada: EntradaDoFio): Avanco {
  let estado: EstadoDoFio = fio.estado;
  let marcas: MarcasDoFio = fio.marcas;
  let proximo: ProximoDoFio = { tipo: 'sem_materia' };
  for (let volta = 0; volta < VOLTAS; volta++) {
    const puxado = puxar(estado, entrada);
    estado = puxado.estado;
    proximo = puxado.proximo;
    if (proximo.tipo !== 'passo') break;
    const { passo } = proximo;
    if (
      passo.tipo === 'revisar' &&
      marcas.vencidosAoAbrir !== undefined &&
      entrada.vencidos < marcas.vencidosAoAbrir
    ) {
      const revisados = Math.min(passo.quantidade, marcas.vencidosAoAbrir - entrada.vencidos);
      estado = concluirPasso(estado, { tipo: 'revisar', revisados, voltamAmanha: 0 });
      marcas = {};
      continue;
    }
    if (!PASSOS_COM_TELA.has(passo.tipo)) {
      estado = pularPasso(estado);
      continue;
    }
    break;
  }
  // As marcas só valem para o Revisar que a pessoa abriu.
  if (proximo.tipo !== 'passo' || proximo.passo.tipo !== 'revisar') marcas = {};
  return { estado, marcas, proximo };
}

/** A pessoa entrou no passo: se ela parar, o próximo puxão o retoma. */
export function entrarNoPasso(avanco: Avanco, entrada: EntradaDoFio): FioGuardado {
  if (avanco.proximo.tipo !== 'passo') return { estado: avanco.estado, marcas: avanco.marcas };
  const marcas: MarcasDoFio =
    avanco.proximo.passo.tipo === 'revisar'
      ? { vencidosAoAbrir: avanco.marcas.vencidosAoAbrir ?? entrada.vencidos }
      : avanco.marcas;
  return { estado: abrirPasso(avanco.estado), marcas };
}
