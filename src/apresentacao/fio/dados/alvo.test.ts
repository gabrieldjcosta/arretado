import { concluirPasso, estadoInicial } from '../../../dominios/fio';
import { entrada, marcarLidos, materia, norma } from '../../../dominios/fio/fixtures';
import { alvoDaPorteira } from './alvo';
import { avancar } from './avancar';

describe('o alvo da porteira: o que a pessoa leu na matéria', () => {
  it('sem leitura nenhuma, não há o que perguntar', () => {
    const e = entrada();
    expect(alvoDaPorteira(e, estadoInicial(), 'penal')).toBeUndefined();
    expect(alvoDaPorteira(e, estadoInicial(), 'nao-existe')).toBeUndefined();
  });

  it('o "lido até aqui" de antes conta', () => {
    const base = entrada();
    const e = marcarLidos(base, 'penal-lei', ['art-3', 'art-4']);
    const alvo = alvoDaPorteira(e, estadoInicial(), 'penal');
    expect(alvo?.normaId).toBe('penal-lei');
    expect(alvo?.artigos).toEqual([
      { endereco: 'art-3', rotulo: 'Art. 3' },
      { endereco: 'art-4', rotulo: 'Art. 4' },
    ]);
  });

  it('o Ler fechado nesta etapa conta, mesmo com a entrada ainda sem o "lido"', () => {
    const e = entrada({ ciclo: { blocos: ['penal'], indice: 0 } });
    const primeiro = avancar({ estado: estadoInicial(), marcas: {} }, e);
    if (primeiro.proximo.tipo !== 'passo' || primeiro.proximo.passo.tipo !== 'ler') {
      throw new Error('esperava Ler');
    }
    const passo = primeiro.proximo.passo;
    if ('adicionarNorma' in passo) throw new Error('esperava Ler com norma');
    const feito = concluirPasso(primeiro.estado, { tipo: 'ler', lidos: passo.artigos.length });
    const alvo = alvoDaPorteira(e, feito, 'penal');
    expect(alvo?.artigos.map((a) => a.endereco)).toEqual(passo.artigos.map((a) => a.endereco));
  });

  it('um Ler pulado não conta', () => {
    const e = entrada({ ciclo: { blocos: ['penal'], indice: 0 } });
    const primeiro = avancar({ estado: estadoInicial(), marcas: {} }, e);
    const pulado = {
      ...primeiro.estado,
      etapa: primeiro.estado.etapa && {
        ...primeiro.estado.etapa,
        fechados: primeiro.estado.etapa.passos.map(() => ({ como: 'pulado' as const })),
      },
    };
    expect(alvoDaPorteira(e, pulado, 'penal')).toBeUndefined();
  });

  it('fica com a norma que a pessoa mais leu', () => {
    const e = marcarLidos(
      entrada({
        materias: [
          materia('penal', { normas: [norma('cp', 20), norma('lep', 20)] }),
          materia('eca'),
        ],
      }),
      'lep',
      ['art-1', 'art-2', 'art-5'],
    );
    const alvo = alvoDaPorteira(marcarLidos(e, 'cp', ['art-9']), estadoInicial(), 'penal');
    expect(alvo?.normaId).toBe('lep');
    expect(alvo?.artigos).toHaveLength(3);
  });
});
