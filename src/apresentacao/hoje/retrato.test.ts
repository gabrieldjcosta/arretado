import type { Bloco } from '../../core/seguranca/sanitizador';
import { abrirNorma } from '../../dominios/legislacao/leitor';
import { gravarPosicao } from '../../dominios/legislacao/leituras';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { decidirProximaAcao, type EntradaDaProximaAcao } from '../../dominios/hoje/proxima-acao';
import { criarCartaoManual } from '../../dominios/recall/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  acoesEmSeguida,
  agoraEOutras,
  carregarRetrato,
  emSeguidaComTrocas,
  ITENS_EM_SEGUIDA,
  trocarDeLugar,
  type RetratoDoHoje,
} from './retrato';

const DIA = 24 * 60 * 60_000;

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha('O PRESIDENTE DA REPÚBLICA decreta:'),
  linha('Art. 1º A execução penal tem por objetivo efetivar as disposições de sentença.'),
  linha('Art. 2º A jurisdição penal dos Juízes será exercida no processo de execução.'),
];

async function lerLep(repo: Awaited<ReturnType<typeof repositorioDeTeste>>['repo']) {
  const { versao } = await criarRascunho(repo, {
    blocos: LEI,
    origemEntrada: 'html',
    tituloCurto: 'LEP',
  });
  const { norma } = await publicarVersao(repo, versao.id);
  const { nos } = await abrirNorma(repo, norma.id);
  await gravarPosicao(
    repo,
    norma.id,
    nos.find((n) => n.dispositivo.tipo === 'artigo')!.dispositivo.id,
  );
  return norma;
}

const tudo: EntradaDaProximaAcao = {
  cartoesVencidos: 2,
  frasesVencidas: 0,
  tarefa: { id: 't1', titulo: 'Ler arts. 1 a 5', estimativaMin: 7 },
  leitura: { normaId: 'n1', tituloCurto: 'LEP', onde: 'Art. 2º', minutos: 9 },
};
/** Os quatro tipos com algo a fazer: o Agora é a revisão, e a leitura fica fora do "Em seguida". */
const completo: EntradaDaProximaAcao = {
  ...tudo,
  ciclo: { id: 'c1', disciplina: 'Penal', blocoOrdem: 1, total: 5, volta: 1, minutos: 25 },
};
const tipos = (acoes: readonly { tipo: string }[]) => acoes.map((a) => a.tipo);

describe('Hoje › retrato (P3)', () => {
  describe('acoesEmSeguida', () => {
    it('a mesma decisão, sem o tipo do Agora: a Tarefa e depois a leitura salva', () => {
      const agora = decidirProximaAcao(tudo);
      expect(acoesEmSeguida(tudo, agora, []).map((a) => a.tipo)).toEqual([
        'tarefa',
        'leitura_salva',
      ]);
    });

    it('o que a pessoa dispensou não volta, nem no Agora nem em seguida', () => {
      const agora = decidirProximaAcao(tudo, ['revisao_vencida']);
      expect(agora).toMatchObject({ tipo: 'acao', acao: { tipo: 'tarefa' } });
      expect(acoesEmSeguida(tudo, agora, ['revisao_vencida']).map((a) => a.tipo)).toEqual([
        'leitura_salva',
      ]);
    });

    it('nunca passa do limite', () => {
      expect(ITENS_EM_SEGUIDA).toBe(2);
      const agora = decidirProximaAcao(tudo);
      expect(acoesEmSeguida(tudo, agora, [], 1)).toHaveLength(1);
    });

    it('sem ação no Agora (estado vazio), não há "em seguida"', () => {
      const vazio: EntradaDaProximaAcao = { cartoesVencidos: 0, frasesVencidas: 0 };
      expect(acoesEmSeguida(vazio, decidirProximaAcao(vazio), [])).toEqual([]);
    });

    it('com uma só coisa para fazer, o Agora a leva e nada sobra', () => {
      const so: EntradaDaProximaAcao = { cartoesVencidos: 1, frasesVencidas: 0 };
      expect(acoesEmSeguida(so, decidirProximaAcao(so), [])).toEqual([]);
    });
  });

  describe('agoraEOutras', () => {
    it('sem preferência é a decisão: o Agora e, na ordem, todas as outras com algo a fazer', () => {
      const { agora, outras } = agoraEOutras(completo, []);
      expect(agora).toMatchObject({ tipo: 'acao', acao: { tipo: 'revisao_vencida' } });
      expect(tipos(outras)).toEqual(['tarefa', 'ciclo', 'leitura_salva']);
    });

    it('o tipo preferido vira o Agora, e o da decisão passa a ser uma das outras', () => {
      const { agora, outras } = agoraEOutras(completo, [], 'leitura_salva');
      expect(agora).toMatchObject({ tipo: 'acao', acao: { tipo: 'leitura_salva' } });
      expect(tipos(outras)).toEqual(['revisao_vencida', 'tarefa', 'ciclo']);
    });

    it('o preferido que foi dispensado, ou que não tem o que fazer, não conta', () => {
      expect(agoraEOutras(completo, ['leitura_salva'], 'leitura_salva').agora).toMatchObject({
        acao: { tipo: 'revisao_vencida' },
      });
      expect(agoraEOutras(tudo, [], 'ciclo').agora).toMatchObject({
        acao: { tipo: 'revisao_vencida' },
      });
    });

    it('sem nada a fazer: o vazio e nenhuma outra', () => {
      const vazio: EntradaDaProximaAcao = { cartoesVencidos: 0, frasesVencidas: 0 };
      const { agora, outras } = agoraEOutras(vazio, [], 'tarefa');
      expect(agora.tipo).toBe('vazio');
      expect(outras).toEqual([]);
    });
  });

  describe('trocarDeLugar', () => {
    it('o tipo que já estava em outro lugar troca de lugar com o que estava neste', () => {
      expect(trocarDeLugar(['ciclo', 'tarefa'], 0, 'tarefa')).toEqual(['tarefa', 'ciclo']);
    });

    it('um tipo que estava fora da lista entra no lugar e o de lá sai', () => {
      expect(trocarDeLugar(['ciclo', 'tarefa'], 1, 'leitura_salva')).toEqual([
        'ciclo',
        'leitura_salva',
      ]);
    });

    it('o mesmo tipo no mesmo lugar não muda nada, e a lista de entrada fica como estava', () => {
      const entrada = ['ciclo', 'tarefa'] as const;
      expect(trocarDeLugar(entrada, 0, 'ciclo')).toEqual(['ciclo', 'tarefa']);
      trocarDeLugar(entrada, 0, 'tarefa');
      expect(entrada).toEqual(['ciclo', 'tarefa']);
    });
  });

  describe('emSeguidaComTrocas', () => {
    const { agora, outras } = agoraEOutras(completo, []);
    const retrato: RetratoDoHoje = {
      data: '2026-10-14',
      agora,
      emSeguida: outras.slice(0, ITENS_EM_SEGUIDA),
      outras,
      pontos: { leitura: 'falta', cartoes: 'atual', frases: 'falta' },
      diaFechado: false,
    };

    it('sem troca, é o "em seguida" da decisão', () => {
      expect(tipos(emSeguidaComTrocas(retrato, undefined))).toEqual(['tarefa', 'ciclo']);
    });

    it('com troca, segue a ordem da pessoa, e pode trazer uma que ficou de fora', () => {
      expect(tipos(emSeguidaComTrocas(retrato, ['leitura_salva', 'ciclo']))).toEqual([
        'leitura_salva',
        'ciclo',
      ]);
    });

    it('uma ordem que não cabe mais nos dados é ignorada, e carregando não há nada', () => {
      expect(tipos(emSeguidaComTrocas(retrato, ['revisao_vencida', 'ciclo']))).toEqual([
        'tarefa',
        'ciclo',
      ]);
      expect(emSeguidaComTrocas(undefined, ['ciclo'])).toEqual([]);
    });
  });

  describe('carregarRetrato', () => {
    it('sem nada: o vazio com os três começos, os pontos apagados e sem parada', async () => {
      const { repo } = await repositorioDeTeste();
      const r = await carregarRetrato(repo);
      expect(r.agora.tipo).toBe('vazio');
      expect(r.emSeguida).toEqual([]);
      expect(r.outras).toEqual([]);
      expect(r.parada).toBeUndefined();
      expect(r.pontos).toEqual({ leitura: 'falta', cartoes: 'falta', frases: 'falta' });
      expect(r.diaFechado).toBe(false);
      expect(r.data).toBe('2026-09-23');
    });

    it('leitura salva hoje: a parada diz onde e quando; o ponto da leitura acende', async () => {
      const { repo } = await repositorioDeTeste();
      await lerLep(repo);
      const r = await carregarRetrato(repo);
      expect(r.agora).toMatchObject({ tipo: 'acao', acao: { tipo: 'leitura_salva' } });
      expect(r.parada).toEqual({ rotulo: 'LEP, art. 1º', quando: 'salvo hoje, 09h00' });
      expect(r.pontos.leitura).toBe('feito');
    });

    it('dias depois, com cartões vencidos: Agora em cartões, leitura em seguida, parada com o dia', async () => {
      const { repo, relogio } = await repositorioDeTeste();
      await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
      await lerLep(repo);
      relogio.avancar(3 * DIA);
      const r = await carregarRetrato(repo);
      expect(r.agora).toMatchObject({ tipo: 'acao', acao: { tipo: 'revisao_vencida' } });
      expect(r.emSeguida.map((a) => a.tipo)).toEqual(['leitura_salva']);
      expect(r.outras.map((a) => a.tipo)).toEqual(['leitura_salva']);
      expect(r.parada).toEqual({ rotulo: 'LEP, art. 1º', quando: 'salvo dia 23/09, 09h00' });
      expect(r.pontos).toEqual({ leitura: 'falta', cartoes: 'atual', frases: 'falta' });
    });

    it('"Escolher outra coisa": sem o que foi dispensado, o Agora e o "em seguida" andam juntos', async () => {
      const { repo, relogio } = await repositorioDeTeste();
      await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
      await lerLep(repo);
      relogio.avancar(3 * DIA);
      const r = await carregarRetrato(repo, ['revisao_vencida']);
      expect(r.agora).toMatchObject({ tipo: 'acao', acao: { tipo: 'leitura_salva' } });
      expect(r.emSeguida).toEqual([]);
      // O ponto de cartões segue pela metade só se for o que o Agora oferece; dispensado, apaga.
      expect(r.pontos.cartoes).toBe('falta');
      expect(r.pontos.leitura).toBe('atual');
    });
  });
});
