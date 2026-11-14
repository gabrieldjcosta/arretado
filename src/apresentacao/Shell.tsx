import { lazy, Suspense, useEffect, useState } from 'react';
import { ligarAlvoradaDoPrincipal } from './fio/m/brilho-ao-toque';
import { criarRegistroDeItens, ProvedorDeItensDoMais } from './componentes/ItensDoMais';
import { ProvedorDaAbertura } from './entrada/abertura/ProvedorDaAbertura';

// A casca do Fio (D-D25, o único app) é outro pedaço de código, baixado depois do início: o pacote do início fica menor.
const carregarCascaDoFio = () =>
  import('./fio/CascaDoFio').then((m) => ({ default: m.CascaDoFio }));
const CascaDoFio = lazy(carregarCascaDoFio);

/**
 * Moldura de todas as telas: a casca do Fio. Tudo fica dentro da Abertura (`ProvedorDaAbertura`): ela decide se o
 * nome se escreve na abertura do quadro ou no cabeçalho, e a Chegada espera por ela. O registro dos itens que a tela
 * acrescenta ao "+" (D-D24) nasce aqui e a tela se inscreve nele.
 */
export function Shell() {
  useEffect(() => ligarAlvoradaDoPrincipal(), []);
  // A casca começa a baixar já, em paralelo com a decisão da Abertura.
  useEffect(() => {
    void carregarCascaDoFio();
  }, []);
  const [registro] = useState(criarRegistroDeItens);
  return (
    <ProvedorDaAbertura>
      <ProvedorDeItensDoMais value={registro}>
        <Suspense fallback={<div className="shell" />}>
          <CascaDoFio />
        </Suspense>
      </ProvedorDeItensDoMais>
    </ProvedorDaAbertura>
  );
}
