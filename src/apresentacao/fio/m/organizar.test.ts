import { act, renderHook } from '@testing-library/react';
import {
  devolverAoVaral,
  esquecerOrganizacao,
  fixarNoAlto,
  haOrganizacao,
  mudarOrganizacao,
  organizacaoAgora,
  tirarDoVaral,
  useOrganizacao,
} from './organizar';

const CHAVE = 'arretado:fio:varal:v1';

beforeEach(() => {
  esquecerOrganizacao();
});

describe('o Organizar do Varal, que fica no aparelho', () => {
  it('sem nada guardado, vale o padrão do mockup: o que mais cai, à vista o que cai, sem agrupar', () => {
    const o = organizacaoAgora();
    expect(o).toMatchObject({ ordem: 'cai', vista: 'cai', grupo: false, mostrarTirados: false });
    expect(o.fixos).toEqual({});
    expect(o.tirados).toEqual({});
    expect(haOrganizacao(o)).toBe(false);
  });

  it('muda a ordem, a vista e o agrupamento, e guarda no aparelho para a próxima abertura', () => {
    mudarOrganizacao({ ordem: 'nome', vista: 'disc', grupo: true });
    expect(organizacaoAgora()).toMatchObject({ ordem: 'nome', vista: 'disc', grupo: true });
    expect(haOrganizacao(organizacaoAgora())).toBe(true);
    const guardado = JSON.parse(window.localStorage.getItem(CHAVE) ?? '{}') as Record<
      string,
      unknown
    >;
    expect(guardado).toMatchObject({ ordem: 'nome', vista: 'disc', grupo: true });
  });

  it('fixa e solta no alto por folheto, sem repetir', () => {
    fixarNoAlto('normas', 'a', true);
    fixarNoAlto('normas', 'a', true);
    fixarNoAlto('sumulas', 'x', true);
    expect(organizacaoAgora().fixos).toEqual({ normas: ['a'], sumulas: ['x'] });
    fixarNoAlto('normas', 'a', false);
    expect(organizacaoAgora().fixos.normas).toEqual([]);
    expect(organizacaoAgora().fixos.sumulas).toEqual(['x']);
  });

  it('tira do varal e devolve, em lote; "mostrar as que tirei" acende a bolinha do Organizar', () => {
    tirarDoVaral('normas', ['a', 'b']);
    tirarDoVaral('normas', ['b', 'c']);
    expect(organizacaoAgora().tirados.normas).toEqual(['a', 'b', 'c']);
    devolverAoVaral('normas', ['b']);
    expect(organizacaoAgora().tirados.normas).toEqual(['a', 'c']);
    expect(haOrganizacao(organizacaoAgora())).toBe(false);
    mudarOrganizacao({ mostrarTirados: true });
    expect(haOrganizacao(organizacaoAgora())).toBe(true);
  });

  it('relê o que o armazenamento guardava e ignora o que não tem a forma certa', () => {
    window.localStorage.setItem(
      CHAVE,
      JSON.stringify({
        ordem: 'constructor',
        vista: 'data',
        grupo: 'sim',
        fixos: { normas: ['a', 7, null], sumulas: 'x' },
        tirados: [1],
        mostrarTirados: true,
      }),
    );
    const o = organizacaoAgora();
    expect(o.ordem).toBe('cai');
    expect(o.vista).toBe('data');
    expect(o.grupo).toBe(false);
    expect(o.fixos).toEqual({ normas: ['a'] });
    expect(o.tirados).toEqual({});
    expect(o.mostrarTirados).toBe(true);
  });

  it('com o armazenamento quebrado, volta ao padrão sem lançar', () => {
    window.localStorage.setItem(CHAVE, '{não é json');
    expect(organizacaoAgora().ordem).toBe('cai');
  });

  it('quem lê pelo hook é avisado de toda mudança', () => {
    const { result } = renderHook(() => useOrganizacao());
    expect(result.current.ordem).toBe('cai');
    act(() => {
      mudarOrganizacao({ ordem: 'rec' });
    });
    expect(result.current.ordem).toBe('rec');
    act(() => {
      fixarNoAlto('normas', 'a', true);
    });
    expect(result.current.fixos.normas).toEqual(['a']);
  });

  it('o que outra aba do app muda chega pelo evento de armazenamento', () => {
    const { result } = renderHook(() => useOrganizacao());
    window.localStorage.setItem(CHAVE, JSON.stringify({ ordem: 'disc' }));
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: CHAVE }));
    });
    expect(result.current.ordem).toBe('disc');
  });
});
