// Grifos e notas no leitor (F2, 11.4): as marcações da norma aberta, mantidas a cada ação que o
// banco confirma, e as camadas delas para a partição dos trechos.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Marcacao } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import {
  criarGrifo,
  criarNota,
  editarNota,
  marcacoesDaNorma,
  MarcacaoInvalida,
  mudarCor,
  removerMarcacao,
  type CorDoGrifo,
  type TrechoParaMarcar,
} from '../../dominios/legislacao/marcacoes';
import type { MarcasDoTexto } from './destacar';

export interface MarcacoesDaNorma {
  /** As marcações da versão aberta, por dispositivo, na ordem de criação. */
  porDispositivo: ReadonlyMap<string, Marcacao[]>;
  porId: ReadonlyMap<string, Marcacao>;
  /** A última ação que falhou (a mensagem para a tela), até a próxima dar certo. */
  falha: string | undefined;
  grifar: (trecho: TrechoParaMarcar, cor: CorDoGrifo) => Promise<boolean>;
  anotar: (trecho: TrechoParaMarcar, nota: string) => Promise<boolean>;
  mudarCor: (id: string, cor: CorDoGrifo) => Promise<boolean>;
  editarNota: (id: string, nota: string) => Promise<boolean>;
  remover: (id: string) => Promise<boolean>;
}

const mensagemDe = (excecao: unknown, padrao: string) =>
  excecao instanceof MarcacaoInvalida ? excecao.message : padrao;

/**
 * As marcações da norma aberta: lidas uma vez (todas da versão; são poucas) e mantidas aqui a cada
 * ação que o banco confirma. A tela só muda depois de gravar: uma marcação que não gravou não
 * aparece como se existisse.
 */
export function useMarcacoes(
  repo: Repositorio,
  normaId: string,
  versaoId: string,
  vivo: { current: boolean },
): MarcacoesDaNorma {
  const [porDispositivo, setPorDispositivo] = useState<ReadonlyMap<string, Marcacao[]>>(
    () => new Map(),
  );
  const [falha, setFalha] = useState<string | undefined>(undefined);

  useEffect(() => {
    let ativo = true;
    marcacoesDaNorma(repo, normaId, versaoId).then(
      (lidas) => {
        if (ativo) setPorDispositivo(lidas);
      },
      () => {
        if (ativo) setFalha('Não foi possível ler os grifos e as notas desta norma.');
      },
    );
    return () => {
      ativo = false;
    };
  }, [repo, normaId, versaoId]);

  const porId = useMemo(() => {
    const mapa = new Map<string, Marcacao>();
    for (const lista of porDispositivo.values()) for (const m of lista) mapa.set(m.id, m);
    return mapa;
  }, [porDispositivo]);

  /** Põe (ou tira, com `fora`) a marcação no mapa, no lugar dela ou ao fim do dispositivo. */
  const aplicar = useCallback((marcacao: Marcacao, fora = false) => {
    setPorDispositivo((antes) => {
      const depois = new Map(antes);
      const lista = (antes.get(marcacao.dispositivoId) ?? []).filter((m) => m.id !== marcacao.id);
      if (!fora) {
        const i = (antes.get(marcacao.dispositivoId) ?? []).findIndex((m) => m.id === marcacao.id);
        if (i < 0) lista.push(marcacao);
        else lista.splice(i, 0, marcacao);
      }
      if (lista.length > 0) depois.set(marcacao.dispositivoId, lista);
      else depois.delete(marcacao.dispositivoId);
      return depois;
    });
  }, []);

  const executar = useCallback(
    async (acao: () => Promise<Marcacao>, padrao: string, fora = false): Promise<boolean> => {
      try {
        const marcacao = await acao();
        if (!vivo.current) return false;
        aplicar(marcacao, fora);
        setFalha(undefined);
        return true;
      } catch (excecao) {
        if (vivo.current) setFalha(mensagemDe(excecao, padrao));
        return false;
      }
    },
    [aplicar, vivo],
  );

  return {
    porDispositivo,
    porId,
    falha,
    grifar: (trecho, cor) =>
      executar(() => criarGrifo(repo, trecho, cor), 'Não foi possível guardar o grifo.'),
    anotar: (trecho, nota) =>
      executar(() => criarNota(repo, trecho, nota), 'Não foi possível guardar a nota.'),
    mudarCor: (id, cor) =>
      executar(() => mudarCor(repo, id, cor), 'Não foi possível mudar a cor do grifo.'),
    editarNota: (id, nota) =>
      executar(() => editarNota(repo, id, nota), 'Não foi possível guardar a nota.'),
    remover: (id) => {
      const marcacao = porId.get(id);
      if (!marcacao) return Promise.resolve(false);
      return executar(
        async () => {
          await removerMarcacao(repo, id);
          return marcacao;
        },
        marcacao.tipo === 'grifo'
          ? 'Não foi possível tirar o grifo.'
          : 'Não foi possível tirar a nota.',
        true,
      );
    },
  };
}

/** O nome do marcador da nota: as primeiras palavras do texto anotado. */
const rotuloDaNota = (texto: string) =>
  texto.length > 40 ? `${texto.slice(0, 40).trimEnd()}…` : texto;

const camadasGuardadas = new WeakMap<readonly Marcacao[], MarcasDoTexto>();

/**
 * As camadas de marcação do texto de um dispositivo, para a partição dos trechos. Guardadas pela
 * lista do dispositivo (a mesma enquanto nenhuma marcação dele muda): o leitor redesenha a cada
 * rolagem, e a partição também se guarda por elas (`pedacosDoTexto`).
 */
export function marcasDoTexto(
  marcacoes: readonly Marcacao[] | undefined,
): MarcasDoTexto | undefined {
  if (!marcacoes || marcacoes.length === 0) return undefined;
  const guardadas = camadasGuardadas.get(marcacoes);
  if (guardadas) return guardadas;
  const camadas: MarcasDoTexto = {
    grifos: marcacoes
      .filter((m) => m.tipo === 'grifo')
      .map((m) => ({ id: m.id, cor: m.cor ?? 1, inicio: m.ancora.inicio, fim: m.ancora.fim })),
    notas: marcacoes
      .filter((m) => m.tipo === 'nota')
      .map((m) => ({ id: m.id, fim: m.ancora.fim, rotulo: rotuloDaNota(m.ancora.texto) })),
  };
  camadasGuardadas.set(marcacoes, camadas);
  return camadas;
}
