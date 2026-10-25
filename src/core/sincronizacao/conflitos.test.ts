import { camposDiferentes, equivalentes } from './conflitos';
import { CAMPOS_DO_APARELHO, ehSoLocal, semCamposDoAparelho, sincroniza } from './politica';

describe('equivalentes e camposDiferentes', () => {
  const base = { id: 'a', texto: 'x', tsLogico: '1', atualizadoEm: '1' };
  it('carimbos diferentes sozinhos não são mudança de conteúdo', () => {
    expect(equivalentes(base, { ...base, tsLogico: '2', atualizadoEm: '2' })).toBe(true);
    expect(camposDiferentes(base, { ...base, tsLogico: '2' })).toEqual([]);
  });
  it('lista os campos que diferem, em ordem, inclusive os que faltam de um lado', () => {
    const lado = { ...base, texto: 'y', extra: 1 };
    expect(equivalentes(base, lado)).toBe(false);
    expect(camposDiferentes(base, lado)).toEqual(['extra', 'texto']);
  });
  it('um lado apagado difere em todos os campos do outro', () => {
    expect(camposDiferentes(null, base)).toEqual(['id', 'texto']);
    expect(camposDiferentes(base, null)).toEqual(['id', 'texto']);
  });
});

describe('política do que sincroniza', () => {
  it('usuarios nunca sincroniza', () => {
    expect(ehSoLocal('usuarios')).toBe(true);
    expect(sincroniza({ colecao: 'usuarios', operacao: 'gravar' })).toBe(false);
  });
  it('trocar só a aparência não sincroniza; mexer numa meta sim', () => {
    const tema = {
      colecao: 'preferencias' as const,
      operacao: 'atualizar' as const,
      dados: { tema: 'escuro', tsLogico: 'x', atualizadoEm: 'y' },
    };
    expect(sincroniza(tema)).toBe(false);
    const mista = { ...tema, dados: { ...tema.dados, cotaDiaria: 20 } };
    expect(sincroniza(mista)).toBe(true);
    expect(semCamposDoAparelho(mista).dados).toEqual({
      cotaDiaria: 20,
      tsLogico: 'x',
      atualizadoEm: 'y',
    });
  });
  it('gravar leva o registro todo (valores iniciais); outras coleções não mudam', () => {
    expect(sincroniza({ colecao: 'preferencias', operacao: 'gravar', dados: { tema: 'x' } })).toBe(
      true,
    );
    expect(sincroniza({ colecao: 'erros', operacao: 'atualizar', dados: { tema: 'x' } })).toBe(
      true,
    );
    expect(CAMPOS_DO_APARELHO.preferencias).toContain('tema');
  });
});
