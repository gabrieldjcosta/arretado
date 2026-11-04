import { concluirPasso, estadoInicial } from '../../../dominios/fio';
import { entrada, marcarLidos, materia, norma } from '../../../dominios/fio/fixtures';
import { avancar, entrarNoPasso, PASSOS_COM_TELA } from './avancar';

const vazio = () => ({ estado: estadoInicial(), marcas: {} });

describe('o puxão com o que a tela hospeda', () => {
  it('sem nenhuma matéria, manda escolher a prova', () => {
    const r = avancar(vazio(), entrada({ materias: [] }));
    expect(r.proximo.tipo).toBe('sem_materia');
  });

  it('o primeiro passo é a leitura do que mais cai', () => {
    const e = entrada({
      materias: [materia('penal', { normas: [norma('cp', 40, { mapa: [12, 3, 20] })] })],
      ciclo: { blocos: ['penal'], indice: 0 },
    });
    const r = avancar(vazio(), e);
    expect(r.proximo.tipo).toBe('passo');
    if (r.proximo.tipo !== 'passo' || r.proximo.passo.tipo !== 'ler')
      throw new Error('esperava Ler');
    const passo = r.proximo.passo;
    if ('adicionarNorma' in passo) throw new Error('esperava Ler com norma');
    expect(passo.artigos[0]?.rotulo).toBe('Art. 12');
    expect(r.proximo.posicao).toBe(1);
  });

  it('pula sozinho o passo sem tela (Lembrar) depois de um Ler concluído, sem custo', () => {
    const e = entrada({ ciclo: { blocos: ['penal'], indice: 0 } });
    const primeiro = avancar(vazio(), e);
    const concluido = concluirPasso(primeiro.estado, { tipo: 'ler', lidos: 5 });
    const depois = avancar({ estado: concluido, marcas: {} }, e);
    // O Lembrar não tem tela: o Fio o fecha como pulado e segue ao que vem (outro passo ou o pouso).
    if (depois.proximo.tipo === 'passo') {
      expect(PASSOS_COM_TELA.has(depois.proximo.passo.tipo)).toBe(true);
    } else {
      expect(depois.proximo.tipo).toBe('pouso');
    }
    const lembrar = depois.estado.etapa?.passos.findIndex((p) => p.tipo === 'lembrar') ?? -1;
    expect(lembrar).toBeGreaterThan(-1);
    expect(depois.estado.etapa?.fechados[lembrar]).toEqual({ como: 'pulado' });
  });

  it('a leitura feita fora do Fio nasce "Já feito"', () => {
    const e = entrada({ ciclo: { blocos: ['penal'], indice: 0 } });
    const primeiro = avancar(vazio(), e);
    if (primeiro.proximo.tipo !== 'passo' || primeiro.proximo.passo.tipo !== 'ler') {
      throw new Error('esperava Ler');
    }
    const passo = primeiro.proximo.passo;
    if ('adicionarNorma' in passo) throw new Error('esperava Ler com norma');
    const lidos = marcarLidos(
      e,
      passo.normaId,
      passo.artigos.map((a) => a.endereco),
    );
    const r = avancar({ estado: primeiro.estado, marcas: {} }, lidos);
    expect(r.estado.etapa?.fechados[0]).toEqual({ como: 'ja_feito' });
  });

  it('Revisar: se os vencidos baixaram desde que a pessoa entrou, o passo fecha com o que baixou, até a cota do passo', () => {
    const comVencidos = entrada({ vencidos: 9, ciclo: { blocos: ['penal'], indice: 0 } });
    const r1 = avancar(vazio(), comVencidos);
    if (r1.proximo.tipo !== 'passo' || r1.proximo.passo.tipo !== 'revisar') {
      throw new Error('com 9 vencidos o primeiro passo é Revisar');
    }
    const aberto = entrarNoPasso(r1, comVencidos);
    expect(aberto.marcas.vencidosAoAbrir).toBe(9);

    const revisou = avancar(aberto, { ...comVencidos, vencidos: 2 });
    expect(revisou.estado.etapa?.fechados[0]).toEqual({
      como: 'feito',
      resultado: { tipo: 'revisar', revisados: 4, voltamAmanha: 0 },
    });
    expect(revisou.marcas).toEqual({});
  });

  it('Revisar: sem entrar no passo, os vencidos que baixam não fecham nada', () => {
    const e = entrada({ vencidos: 9, ciclo: { blocos: ['penal'], indice: 0 } });
    const r1 = avancar(vazio(), e);
    const r2 = avancar(r1, { ...e, vencidos: 1 });
    expect(r2.estado.etapa?.fechados[0]).toBeUndefined();
  });

  it('as marcas de um Revisar não seguem para o passo seguinte', () => {
    const e = entrada({ vencidos: 9, ciclo: { blocos: ['penal'], indice: 0 } });
    const aberto = entrarNoPasso(avancar(vazio(), e), e);
    expect(aberto.marcas.vencidosAoAbrir).toBe(9);
    const feito = concluirPasso(aberto.estado, { tipo: 'revisar', revisados: 4, voltamAmanha: 0 });
    const depois = avancar({ estado: feito, marcas: aberto.marcas }, e);
    expect(depois.marcas).toEqual({});
  });
});
