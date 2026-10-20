// A linha de parada do Hoje (D-D7, P3): onde a pessoa parou de ler e quando, em palavras simples.
import { dataCivil, diferencaEmDias, horaCivil } from '../../core/datas';

/** O que a linha de parada mostra: "LEP, art. 112, § 2º" e "salvo ontem, 22h10". */
export interface ParadaDaLeitura {
  rotulo: string;
  quando: string;
}

/**
 * "LEP, art. 112, § 2º": a norma e o Dispositivo exatos, como se cita. O rótulo do dispositivo vem
 * como "Art. 112, § 2º" (de `referenciaDoNo`); "TÍTULO I", fora de artigo, fica como está. Sem
 * posição guardada, só a norma.
 */
export function rotuloDaParada(tituloCurto: string, onde: string | undefined): string {
  if (onde === undefined || onde === '') return tituloCurto;
  const citacao = onde.startsWith('Art.') ? 'art.' + onde.slice(4) : onde;
  return `${tituloCurto}, ${citacao}`;
}

/**
 * "salvo hoje, 22h10", "salvo ontem, 22h10" ou "salvo dia 12/10, 22h10": quando a leitura foi salva
 * pela última vez, na hora de Brasília (T14). Nunca conta dias fora: a linha informa, não cobra.
 */
export function quandoDeParar(instante: string, agora: Date): string {
  const quando = new Date(instante);
  const hora = horaCivil(quando).replace(':', 'h');
  const dia = dataCivil(quando);
  const dias = diferencaEmDias(dia, dataCivil(agora));
  if (dias <= 0) return `salvo hoje, ${hora}`;
  if (dias === 1) return `salvo ontem, ${hora}`;
  const [, mes, diaDoMes] = dia.split('-');
  return `salvo dia ${diaDoMes ?? ''}/${mes ?? ''}, ${hora}`;
}
