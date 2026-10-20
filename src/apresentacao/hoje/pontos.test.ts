import type { ProximaAcao } from '../../dominios/hoje/contrato';
import { ROTULO_REVISAR_CARTOES, ROTULO_REVISAR_FRASES } from '../../dominios/hoje/proxima-acao';
import {
  estadoDosPontos,
  familiaDaAcao,
  pontosQueAcenderam,
  type EstadosDosPontos,
  type FatosDoDia,
} from './pontos';

const revisao = (rotulo: string): ProximaAcao => ({
  tipo: 'revisao_vencida',
  alvo: { tipo: 'revisao', rotulo },
  razao: '2 cartões vencidos',
});
const leitura: ProximaAcao = {
  tipo: 'leitura_salva',
  alvo: { tipo: 'leitura', id: 'n1', rotulo: 'LEP' },
  razao: 'Continuar a leitura da LEP',
};
const tarefa: ProximaAcao = {
  tipo: 'tarefa',
  alvo: { tipo: 'tarefa', id: 't1', rotulo: 'Ler arts. 1 a 5' },
  razao: 'A próxima da sua fila de tarefas',
};

const nada: FatosDoDia = {
  leituraHoje: false,
  cartoesRevisadosHoje: 0,
  frasesRevisadasHoje: 0,
  cartoesVencidos: 0,
  frasesVencidas: 0,
};

describe('Hoje › pontos do Dia (P3)', () => {
  describe('familiaDaAcao', () => {
    it('diz de que família é o que o Agora oferece', () => {
      expect(familiaDaAcao(leitura)).toBe('leitura');
      expect(familiaDaAcao(revisao(ROTULO_REVISAR_CARTOES))).toBe('cartoes');
      expect(familiaDaAcao(revisao(ROTULO_REVISAR_FRASES))).toBe('frases');
    });

    it('uma Tarefa de estudo, ou nada no Agora, não é de família nenhuma', () => {
      expect(familiaDaAcao(tarefa)).toBeUndefined();
      expect(familiaDaAcao(undefined)).toBeUndefined();
    });
  });

  describe('estadoDosPontos', () => {
    it('sem nada feito nem oferecido, os três ficam apagados: o anel não cobra', () => {
      expect(estadoDosPontos(nada)).toEqual({
        leitura: 'falta',
        cartoes: 'falta',
        frases: 'falta',
      });
    });

    it('o ponto da família que o Agora oferece fica pela metade; os outros, apagados', () => {
      expect(
        estadoDosPontos({
          ...nada,
          cartoesVencidos: 3,
          frasesVencidas: 2,
          agora: revisao(ROTULO_REVISAR_CARTOES),
        }),
      ).toEqual({ leitura: 'falta', cartoes: 'atual', frases: 'falta' });
      expect(
        estadoDosPontos({ ...nada, frasesVencidas: 2, agora: revisao(ROTULO_REVISAR_FRASES) }),
      ).toEqual({ leitura: 'falta', cartoes: 'falta', frases: 'atual' });
      expect(estadoDosPontos({ ...nada, agora: leitura })).toEqual({
        leitura: 'atual',
        cartoes: 'falta',
        frases: 'falta',
      });
    });

    it('leitura salva hoje acende o ponto inteiro, mesmo que o Agora ainda convide a continuar', () => {
      expect(estadoDosPontos({ ...nada, leituraHoje: true, agora: leitura }).leitura).toBe('feito');
    });

    it('revisou hoje e não resta nada vencido: aceso; ainda resta: pela metade, mesmo fora do Agora', () => {
      expect(estadoDosPontos({ ...nada, cartoesRevisadosHoje: 4 }).cartoes).toBe('feito');
      expect(
        estadoDosPontos({ ...nada, cartoesRevisadosHoje: 4, cartoesVencidos: 1, agora: tarefa })
          .cartoes,
      ).toBe('atual');
      expect(estadoDosPontos({ ...nada, frasesRevisadasHoje: 2 }).frases).toBe('feito');
      expect(
        estadoDosPontos({ ...nada, frasesRevisadasHoje: 2, frasesVencidas: 1, agora: leitura })
          .frases,
      ).toBe('atual');
    });

    it('um dia completo acende os três', () => {
      expect(
        estadoDosPontos({
          leituraHoje: true,
          cartoesRevisadosHoje: 4,
          frasesRevisadasHoje: 2,
          cartoesVencidos: 0,
          frasesVencidas: 0,
        }),
      ).toEqual({ leitura: 'feito', cartoes: 'feito', frases: 'feito' });
    });
  });

  describe('pontosQueAcenderam', () => {
    const base: EstadosDosPontos = { leitura: 'falta', cartoes: 'atual', frases: 'falta' };

    it('sem visita anterior no dia, o Hoje abre quieto', () => {
      expect(pontosQueAcenderam(base, undefined)).toEqual([]);
    });

    it('só os pontos que ficaram acesos desde a última visita se animam', () => {
      expect(
        pontosQueAcenderam(
          { leitura: 'feito', cartoes: 'atual', frases: 'feito' },
          { leitura: 'atual', cartoes: 'atual', frases: 'falta' },
        ),
      ).toEqual(['leitura', 'frases']);
      expect(
        pontosQueAcenderam(
          { leitura: 'falta', cartoes: 'feito', frases: 'falta' },
          { leitura: 'falta', cartoes: 'atual', frases: 'falta' },
        ),
      ).toEqual(['cartoes']);
    });

    it('passar a ser a vez (ou deixar de ser, ao dispensar a sugestão) não acende nada', () => {
      expect(
        pontosQueAcenderam(
          { leitura: 'atual', cartoes: 'falta', frases: 'falta' },
          { leitura: 'falta', cartoes: 'atual', frases: 'falta' },
        ),
      ).toEqual([]);
    });

    it('um ponto que já estava aceso, ou que se apagou, não anima', () => {
      expect(pontosQueAcenderam(base, base)).toEqual([]);
      expect(
        pontosQueAcenderam(
          { leitura: 'feito', cartoes: 'falta', frases: 'atual' },
          { leitura: 'feito', cartoes: 'feito', frases: 'feito' },
        ),
      ).toEqual([]);
    });
  });
});
