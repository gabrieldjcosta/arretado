import { camposMinimos } from './fabrica';
import {
  ENTIDADES,
  NOMES_COLECOES,
  colecoesDoModulo,
  MODULOS,
  Erro,
  type CamposComuns,
} from './index';

const ID = '0199a6c4-3b7e-7c3e-8f00-123456789abc';

function comuns(): CamposComuns {
  return {
    id: ID,
    usuarioId: ID,
    criadoEm: '2026-09-23T12:00:00.000Z',
    atualizadoEm: '2026-09-23T12:00:00.000Z',
    tsLogico: '1790000000000-000000-0a1b2c3d',
    origem: 'manual',
    excluidoEm: null,
  };
}

describe('modelo de dados', () => {
  it.each(NOMES_COLECOES)('%s aceita o registro mínimo', (nome) => {
    const r = { ...comuns(), ...camposMinimos(nome, ID) };
    const res = ENTIDADES[nome].esquema.safeParse(r);
    expect(res.error?.issues ?? []).toEqual([]);
  });

  it.each(NOMES_COLECOES)('%s rejeita campo desconhecido', (nome) => {
    const r = { ...comuns(), ...camposMinimos(nome, ID), campoInventado: 1 };
    expect(ENTIDADES[nome].esquema.safeParse(r).success).toBe(false);
  });

  it.each(NOMES_COLECOES)('%s exige os campos comuns', (nome) => {
    const r: Record<string, unknown> = { ...comuns(), ...camposMinimos(nome, ID) };
    delete r.usuarioId;
    expect(ENTIDADES[nome].esquema.safeParse(r).success).toBe(false);
  });

  it('toda coleção exportável pertence a um módulo conhecido', () => {
    const cobertas = MODULOS.flatMap((m) => colecoesDoModulo(m));
    const exportaveis = NOMES_COLECOES.filter((n) => ENTIDADES[n].modulo !== null);
    expect(new Set(cobertas)).toEqual(new Set(exportaveis));
  });

  describe('Erro (D9)', () => {
    const base = { ...comuns(), status: 'aberto' as const };

    it('salva só com resultado e "o que foi"', () => {
      expect(Erro.safeParse({ ...base, resultado: 'errou', oQueFoi: 'x' }).success).toBe(true);
    });

    it('rejeita sem resultado', () => {
      expect(Erro.safeParse({ ...base, oQueFoi: 'x' }).success).toBe(false);
    });

    it('rejeita "o que foi" vazio ou só espaços', () => {
      expect(Erro.safeParse({ ...base, resultado: 'errou', oQueFoi: '   ' }).success).toBe(false);
    });

    it('causa só aceita as quatro categorias', () => {
      const r = { ...base, resultado: 'errou', oQueFoi: 'x', causa: 'posicao' };
      expect(Erro.safeParse(r).success).toBe(false);
    });
  });

  it('rejeita data civil inválida e URL não http', () => {
    const r = { ...comuns(), ...camposMinimos('dias', ID), data: '2026-02-30' };
    expect(ENTIDADES.dias.esquema.safeParse(r).success).toBe(false);
    const n = { ...comuns(), ...camposMinimos('normas', ID), urlOficial: 'javascript:alert(1)' };
    expect(ENTIDADES.normas.esquema.safeParse(n).success).toBe(false);
  });
});
