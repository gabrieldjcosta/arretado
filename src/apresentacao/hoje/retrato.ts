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
import { quandoDeParar, rotuloDaParada, type ParadaDaLeitura } from './parada-da-leitura';
import { estadoDosPontos, type EstadosDosPontos } from './pontos';
import { reunirEntradas } from './proxima-acao';
import type { FonteDeIncidencia } from '../../dominios/legislacao/incidencia-fonte';
import { useFonteIncidencia } from '../dados/fonteIncidenciaContexto';

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
  /** Todas as outras ações com algo a fazer hoje, na ordem da decisão: o que o "Trocar" oferece. */
  outras: readonly ProximaAcao[];
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

/**
 * O Agora e todas as outras ações com algo a fazer. `preferido` é o tipo que o "Em seguida" mostrava
 * primeiro quando a pessoa dispensou o do Agora: se ainda tem algo a fazer, é ele que vira o Agora, e
 * não o próximo da decisão. Assim, depois de um "Trocar", "Escolher outra coisa" traz o que a pessoa
 * viu em seguida.
 */
export function agoraEOutras(
  entrada: EntradaDaProximaAcao,
  dispensados: readonly TipoDeAcao[],
  preferido?: TipoDeAcao,
): { agora: ResultadoProximaAcao; outras: ProximaAcao[] } {
  const decidida = decidirProximaAcao(entrada, dispensados);
  const escolhida = acoesEmSeguida(entrada, decidida, dispensados, Infinity).find(
    (a) => a.tipo === preferido,
  );
  const agora: ResultadoProximaAcao =
    escolhida === undefined ? decidida : { tipo: 'acao', acao: escolhida };
  return { agora, outras: acoesEmSeguida(entrada, agora, dispensados, Infinity) };
}

export async function carregarRetrato(
  repo: Repositorio,
  dispensados: readonly TipoDeAcao[] = [],
  preferido?: TipoDeAcao,
  fonte?: FonteDeIncidencia,
): Promise<RetratoDoHoje> {
  const data = hojeDe(repo);
  const [{ entrada, leituraEm }, resumo] = await Promise.all([
    reunirEntradas(repo, data, fonte),
    resumoDoDia(repo),
  ]);
  const { agora, outras } = agoraEOutras(entrada, dispensados, preferido);
  const { leitura } = entrada;
  return {
    data,
    agora,
    emSeguida: outras.slice(0, ITENS_EM_SEGUIDA),
    outras,
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

/** "Trocar": `tipo` passa para o `lugar`; se já estava em outro, os dois trocam de lugar. */
export function trocarDeLugar(
  tipos: readonly TipoDeAcao[],
  lugar: number,
  tipo: TipoDeAcao,
): TipoDeAcao[] {
  const nova = [...tipos];
  const antes = nova.indexOf(tipo);
  const atual = nova[lugar];
  if (antes >= 0 && atual !== undefined) nova[antes] = atual;
  nova[lugar] = tipo;
  return nova;
}

/** O "Em seguida" como a pessoa o deixou com o "Trocar"; `ordem` que já não cabe nos dados é ignorada. */
export function emSeguidaComTrocas(
  retrato: RetratoDoHoje | undefined,
  ordem: readonly TipoDeAcao[] | undefined,
): readonly ProximaAcao[] {
  if (retrato === undefined) return [];
  const trocadas = ordem?.flatMap((tipo) => retrato.outras.find((a) => a.tipo === tipo) ?? []);
  return trocadas?.length === retrato.emSeguida.length ? trocadas : retrato.emSeguida;
}

export interface HojeEmAndamento {
  /** `undefined` enquanto carrega. */
  retrato: RetratoDoHoje | undefined;
  /** O "Em seguida" já com os "Trocar" desta visita. */
  emSeguida: readonly ProximaAcao[];
  /** "Escolher outra coisa": a pessoa dispensou algum tipo de ação (só nesta tela, sem gravar). */
  dispensou: boolean;
  dispensar: (tipo: TipoDeAcao) => void;
  /** "Voltar à sugestão": desfaz as dispensas e os "Trocar". */
  voltar: () => void;
  /** "Trocar": põe `tipo` no `lugar` do "Em seguida" (só nesta visita, sem gravar). */
  trocar: (lugar: number, tipo: TipoDeAcao) => void;
}

/** Carrega o retrato do Hoje e guarda o "Escolher outra coisa" e o "Trocar" (não grava nada). */
export function useRetratoDoHoje(): HojeEmAndamento {
  const [dispensados, setDispensados] = useState<readonly TipoDeAcao[]>([]);
  const [preferido, setPreferido] = useState<TipoDeAcao>();
  const [ordem, setOrdem] = useState<readonly TipoDeAcao[]>();
  const fonte = useFonteIncidencia();
  const carregar = useCallback(
    (repo: Repositorio) => carregarRetrato(repo, dispensados, preferido, fonte),
    [dispensados, preferido, fonte],
  );
  const { dados } = useDados(carregar);
  const emSeguida = emSeguidaComTrocas(dados, ordem);
  const dispensar = (tipo: TipoDeAcao) => {
    setPreferido(emSeguida[0]?.tipo);
    setOrdem(undefined);
    setDispensados((d) => [...d, tipo]);
  };
  const voltar = () => {
    setPreferido(undefined);
    setOrdem(undefined);
    setDispensados([]);
  };
  const trocar = (lugar: number, tipo: TipoDeAcao) => {
    setOrdem(
      trocarDeLugar(
        emSeguida.map((a) => a.tipo),
        lugar,
        tipo,
      ),
    );
  };
  return {
    retrato: dados,
    emSeguida,
    dispensou: dispensados.length > 0,
    dispensar,
    voltar,
    trocar,
  };
}
