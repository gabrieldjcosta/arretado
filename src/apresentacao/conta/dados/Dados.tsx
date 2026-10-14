import { useEffect, useState } from 'react';
import { ApagarTudo } from './ApagarTudo';
import { Espacos } from './Espacos';
import { Exportar } from './Exportar';
import { Importar } from './Importar';
import { lerAvisoDeRecarga, limparAvisoDeRecarga } from './recarga';
import { Restauracao } from './Restauracao';
import { Salvaguarda } from './Salvaguarda';

export function Dados() {
  const [aviso] = useState(lerAvisoDeRecarga);
  useEffect(limparAvisoDeRecarga, []);
  return (
    <>
      <h1>Dados</h1>
      {aviso && (
        <p role="status" className="sucesso">
          {aviso}
        </p>
      )}
      <Salvaguarda />
      <Exportar />
      <Importar />
      <Espacos />
      <Restauracao />
      <ApagarTudo />
    </>
  );
}
