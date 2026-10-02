import type { Dispositivo, TextoDeDispositivo, VersaoDeNorma } from '../../core/modelo';
import type { NoRascunho, NotaDeVigencia, Rascunho, RedacaoAnterior } from './rascunho';

type Nota = NonNullable<TextoDeDispositivo['notasVigencia']>[number];
type Redacao = NonNullable<TextoDeDispositivo['redacoesAnteriores']>[number];

// Só tipos (conferidos pelo `tsc`): o que a 9.2 copia do rascunho cabe no modelo, campo a campo.
describe('rascunho do estruturador (8.1) × modelo', () => {
  it('o nó vira Dispositivo e TextoDeDispositivo', () => {
    expectTypeOf<Pick<NoRascunho, 'tipo' | 'endereco' | 'confianca'>>().toExtend<
      Pick<Dispositivo, 'tipo' | 'endereco' | 'confianca'>
    >();
    // `vetado` (8.6) está no modelo desde a 8.10: `registros.ts` grava o status do nó como veio.
    expectTypeOf<NoRascunho['status']>().toExtend<Dispositivo['status']>();
    expectTypeOf<'vetado'>().toExtend<Dispositivo['status']>();
    expectTypeOf<NoRascunho['rotulo']>().toExtend<Dispositivo['rotulo']>();
    expectTypeOf<NoRascunho['renumeradoDe']>().toExtend<Dispositivo['renumeradoDe']>();
    expectTypeOf<NoRascunho['trechos']>().toExtend<TextoDeDispositivo['trechos']>();
  });

  it('nota e redação anterior cabem nas do modelo', () => {
    expectTypeOf<Pick<NotaDeVigencia, 'texto' | 'lei' | 'ano' | 'link'>>().toExtend<Nota>();
    expectTypeOf<
      Pick<RedacaoAnterior, 'trechos' | 'nota' | 'origemDeteccao' | 'confirmada'>
    >().toExtend<Redacao>();
  });

  it('o rascunho alimenta a VersaoDeNorma', () => {
    expectTypeOf<Rascunho['notaVigenciaMaisRecente']>().toExtend<
      VersaoDeNorma['notaVigenciaMaisRecente']
    >();
    expectTypeOf<Rascunho['versaoEstruturador']>().toExtend<VersaoDeNorma['versaoAdaptador']>();
  });
});
