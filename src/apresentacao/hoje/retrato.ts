// O retrato do Hoje (D-D7, P3): uma só leitura dos dados para tudo o que a tela mostra de uma vez, para
// o Agora, os pontos do Dia, a linha de parada e o "Em seguida" nunca discordarem entre si. Só lê.
import { useCallback, useState } from 'react';
import { dataCivil } from '../../core/datas';
import type { OrigemDaAcao } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { resumoDoDia } from '../../dominios/dia/fechar';
import type { ProximaAcao, ResultadoProximaAcao } from '../../dominios/hoje/contrato';
import { decidirProximaAcao, type EntradaDaProximaAcao } from '../../dominios/hoje/proxima-acao';
import { hoje as hojeDe } from '../../dominios/recall/servico';
import { useDados } from '../dados/contexto';
import { quandoDeParar, rotuloDaParada, type ParadaDaLeitura } from './parada';
import { estadoDosPontos, type EstadosDosPontos } from './pontos';
import { reunirEntradas } from './proxima-acao';

/** Quantos itens o "Em seguida" mostra. */
export const ITENS_EM_SEGUIDA = 2;

type TipoDeAcao = OrigemDaAcao['tipo'];

export interface RetratoDoHoje {
  /** O dia civil do retrato (`AAAA-MM-DD`): o que os pontos lembram de uma visita à outra. */
  data: string;
  /** O que fazer agora: uma ação, ou o vazio com três começos. */
  agora: ResultadoProximaAcao;
  /** Até dois itens depois do Agora, na ordem da decisão (sem o que a pessoa dispensou). */
  emSeguida: readonly ProximaAcao[];
  /** Onde a pessoa parou de ler; ausente sem leitura salva. */
  parada?: ParadaDaLeitura;
  /** O andamento de hoje em Leitura, Cartões e Frases. */
  pontos: EstadosDosPontos;
  /** O Dia de hoje foi fechado: a caneta sai da folha do Agora e fica no Resumo do Dia. */
  diaFechado: boolean;
}

/** As próximas ações depois da do Agora: a mesma decisão, sem os tipos já vistos ou dispensados. */
export function acoesEmSeguida(
  entrada: EntradaDaProximaAcao,
  agora: ResultadoProximaAcao,
  dispensados: readonly TipoDeAcao[],
  limite = ITENS_EM_SEGUIDA,
): ProximaAcao[] {
  if (agora.tipo !== 'acao') return [];
  const vistos: TipoDeAcao[] = [...dispensados, agora.acao.tipo];
  const lista: ProximaAcao[] = [];
  while (lista.length < limite) {
    const proxima = decidirProximaAcao(entrada, vistos);
    if (proxima.tipo !== 'acao') break;
    lista.push(proxima.acao);
    vistos.push(proxima.acao.tipo);
  }
  return lista;
}

export async function carregarRetrato(
  repo: Repositorio,
  dispensados: readonly TipoDeAcao[] = [],
): Promise<RetratoDoHoje> {
  const data = hojeDe(repo);
  const [{ entrada, leituraEm }, resumo] = await Promise.all([
    reunirEntradas(repo, data),
    resumoDoDia(repo),
  ]);
  const agora = decidirProximaAcao(entrada, dispensados);
  const { leitura } = entrada;
  return {
    data,
    agora,
    emSeguida: acoesEmSeguida(entrada, agora, dispensados),
    ...(leitura !== undefined && leituraEm !== undefined
      ? {
          parada: {
            rotulo: rotuloDaParada(leitura.tituloCurto, leitura.onde),
            quando: quandoDeParar(leituraEm, repo.ctx.agora()),
          },
        }
      : {}),
    pontos: estadoDosPontos({
      leituraHoje: leituraEm !== undefined && dataCivil(new Date(leituraEm)) === data,
      cartoesRevisadosHoje: resumo.cartoesRevisados,
      frasesRevisadasHoje: resumo.frasesRevisadas,
      cartoesVencidos: entrada.cartoesVencidos,
      frasesVencidas: entrada.frasesVencidas,
      ...(agora.tipo === 'acao' ? { agora: agora.acao } : {}),
    }),
    diaFechado: Boolean(resumo.dia?.fechadoEm),
  };
}

export interface HojeEmAndamento {
  /** `undefined` enquanto carrega. */
  retrato: RetratoDoHoje | undefined;
  /** "Escolher outra coisa": a pessoa dispensou algum tipo de ação (só nesta tela, sem gravar). */
  dispensou: boolean;
  dispensar: (tipo: TipoDeAcao) => void;
  /** "Voltar à sugestão": desfaz as dispensas. */
  voltar: () => void;
}

/** Carrega o retrato do Hoje e guarda o "Escolher outra coisa" (não grava nada). */
export function useRetratoDoHoje(): HojeEmAndamento {
  const [dispensados, setDispensados] = useState<readonly TipoDeAcao[]>([]);
  const carregar = useCallback(
    (repo: Repositorio) => carregarRetrato(repo, dispensados),
    [dispensados],
  );
  const { dados } = useDados(carregar);
  const dispensar = useCallback((tipo: TipoDeAcao) => {
    setDispensados((d) => [...d, tipo]);
  }, []);
  const voltar = useCallback(() => {
    setDispensados([]);
  }, []);
  return { retrato: dados, dispensou: dispensados.length > 0, dispensar, voltar };
}
