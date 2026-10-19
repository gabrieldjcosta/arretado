import type { Bloco } from '../../core/seguranca/sanitizador';
import { abrirNorma } from '../../dominios/legislacao/leitor';
import { gravarPosicao } from '../../dominios/legislacao/leituras';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { decidirProximaAcao, type EntradaDaProximaAcao } from '../../dominios/hoje/proxima-acao';
import { criarCartaoManual } from '../../dominios/recall/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { acoesEmSeguida, carregarRetrato, ITENS_EM_SEGUIDA } from './retrato';

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

  describe('carregarRetrato', () => {
    it('sem nada: o vazio com os três começos, os pontos apagados e sem parada', async () => {
      const { repo } = await repositorioDeTeste();
      const r = await carregarRetrato(repo);
      expect(r.agora.tipo).toBe('vazio');
      expect(r.emSeguida).toEqual([]);
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
      expect(r.parada).toEqual({ rotulo: 'LEP, art. 1º', quando: 'hoje, 09h00' });
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
      expect(r.parada).toEqual({ rotulo: 'LEP, art. 1º', quando: 'dia 23/09, 09h00' });
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
