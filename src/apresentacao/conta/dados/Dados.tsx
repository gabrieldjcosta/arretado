import { useState } from 'react';
import { ApagarTudo } from './ApagarTudo';
import { Espacos } from './Espacos';
import { Exportar } from './Exportar';
import { Importar } from './Importar';
import { lerAvisoDeRecarga } from './recarga';
import { Restauracao } from './Restauracao';

export function Dados() {
  const [aviso] = useState(lerAvisoDeRecarga);
  return (
    <>
      <h1>Dados</h1>
      {aviso && (
        <p role="status" className="sucesso">
          {aviso}
        </p>
      )}
      <Exportar />
      <Importar />
      <Espacos />
      <Restauracao />
      <ApagarTudo />
    </>
  );
}
