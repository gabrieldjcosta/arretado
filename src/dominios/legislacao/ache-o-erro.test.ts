import { describe, expect, it } from 'vitest';
import { conferir, montarItem, oQueFoi, type FonteDoItem } from './ache-o-erro';
import {
  anotar,
  fracao,
  lerMedicao,
  medicaoVazia,
  paraRevisitar,
  resumo,
  type RegistroDaMedicao,
} from './medicao-ache-o-erro';

const fonte: FonteDoItem = {
  normaId: 'n1',
  dispositivoId: 'd1',
  versaoId: 'v1',
  referencia: 'ECA · Art. 121, § 2º',
  deslocamento: 0,
  texto:
    'A medida não comporta prazo determinado, devendo sua manutenção ser reavaliada, mediante decisão fundamentada, no máximo a cada seis meses.',
};

describe('montarItem e conferir', () => {
  it('três de cada quatro vêm com troca; o quarto vem certo', () => {
    const [a, b, c, d] = [0, 1, 2, 3].map((p) => montarItem(fonte, p, 1));
    expect(a?.troca).toBeDefined();
    expect(b?.troca).toBeDefined();
    expect(c?.troca).toBeDefined();
    expect(d?.troca).toBeUndefined();
    expect(d?.mostrado).toBe(fonte.texto);
    expect(a?.mostrado).not.toBe(fonte.texto);
  });

  it('a troca cai num candidato tocável e só tocar nela acerta', () => {
    const item = montarItem(fonte, 0, 2)!;
    const t = item.troca!;
    const fim = t.inicio + t.substituto.length;
    const candidato = item.candidatos.find((c) => c.inicio <= t.inicio && fim <= c.fim)!;
    expect(candidato).toBeDefined();
    expect(conferir(item, { tipo: 'tocou', ...candidato })).toBe(true);
    const outro = item.candidatos.find((c) => c !== candidato)!;
    expect(conferir(item, { tipo: 'tocou', ...outro })).toBe(false);
    expect(conferir(item, { tipo: 'certa' })).toBe(false);
    expect(conferir(item, { tipo: 'nao_sei' })).toBe(false);
  });

  it('sem troca, "certa" acerta e tocar erra', () => {
    const item = montarItem(fonte, 3, 0)!;
    expect(conferir(item, { tipo: 'certa' })).toBe(true);
    expect(conferir(item, { tipo: 'tocou', ...item.candidatos[0]! })).toBe(false);
    expect(oQueFoi(item, { tipo: 'tocou', inicio: 0, fim: 1 })).toBe(
      'Vi troca onde não havia, em ECA · Art. 121, § 2º (Ache o erro)',
    );
  });

  it('texto sem troca segura não vira item com troca', () => {
    const seco = { ...fonte, texto: 'O juiz decidirá.' };
    expect(montarItem(seco, 0, 0)).toBeUndefined();
    // Sem troca e sem nada tocável também fica fora.
    expect(montarItem(seco, 3, 0)).toBeUndefined();
  });

  it('o "o que foi" do Erro nunca repete a frase falsa', () => {
    const item = montarItem(fonte, 0, 0)!;
    const texto = oQueFoi(item, { tipo: 'certa' });
    expect(texto).toBe('Dei como certa uma troca em ECA · Art. 121, § 2º (Ache o erro)');
    expect(texto).not.toContain(item.troca!.substituto);
  });
});

describe('medição local', () => {
  const t0 = new Date('2026-10-26T12:00:00.000Z');
  const reg = (sobre: Partial<RegistroDaMedicao>): RegistroDaMedicao => ({
    em: t0.toISOString(),
    dispositivoId: 'd1',
    tipo: 'numero',
    resposta: 'tocou',
    acertou: true,
    revisita: false,
    ...sobre,
  });

  it('lê o que veio do armazenamento e começa do zero com lixo', () => {
    expect(lerMedicao(null, t0)).toEqual(medicaoVazia(t0));
    expect(lerMedicao({ inicio: 'x', registros: 'não' }, t0)).toEqual(medicaoVazia(t0));
    const m = anotar(medicaoVazia(t0), reg({}));
    expect(lerMedicao(JSON.parse(JSON.stringify(m)), t0)).toEqual(m);
  });

  it('revisita sete dias depois, uma vez por dispositivo, o mais antigo primeiro', () => {
    let m = medicaoVazia(t0);
    m = anotar(m, reg({ dispositivoId: 'd2', em: '2026-10-25T12:00:00.000Z' }));
    m = anotar(m, reg({ dispositivoId: 'd1' }));
    m = anotar(m, reg({ dispositivoId: 'd3', em: '2026-10-30T12:00:00.000Z' }));
    const dia = (n: number) => new Date(t0.getTime() + n * 86_400_000);
    expect(paraRevisitar(m, dia(6))).toEqual(['d2']);
    expect(paraRevisitar(m, dia(7))).toEqual(['d2', 'd1']);
    m = anotar(m, reg({ dispositivoId: 'd2', revisita: true, em: dia(7).toISOString() }));
    expect(paraRevisitar(m, dia(8))).toEqual(['d1']);
  });

  it('resume por tipo, primeiras e revisitas', () => {
    let m = medicaoVazia(t0);
    m = anotar(m, reg({}));
    m = anotar(m, reg({ tipo: 'absoluto', acertou: false }));
    m = anotar(m, reg({ tipo: 'sem_troca', resposta: 'certa' }));
    m = anotar(m, reg({ revisita: true, acertou: false }));
    const r = resumo(m, new Date(t0.getTime() + 3 * 86_400_000));
    expect(r.dia).toBe(4);
    expect(r.porTipo.numero).toEqual({ total: 2, acertos: 1 });
    expect(r.porTipo.absoluto).toEqual({ total: 1, acertos: 0 });
    expect(r.primeiras).toEqual({ total: 3, acertos: 2 });
    expect(r.revisitas).toEqual({ total: 1, acertos: 0 });
    expect(fracao(r.primeiras)).toBe('2 de 3');
    expect(fracao({ total: 0, acertos: 0 })).toBe('—');
  });
});
