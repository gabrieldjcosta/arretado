import { useEffect, useState } from 'react';
import { ApagarTudo } from './ApagarTudo';
import { CopiaAnteriorSecao } from './CopiaAnterior';
import { Espacos } from './Espacos';
import { Exportar } from './Exportar';
import { ExportarTexto } from './ExportarTexto';
import { Importar } from './Importar';
import { AVISO_DE_RESPONSABILIDADE } from '../../textos';
import { NuvemBackup } from './NuvemBackup';
import { lerAvisoDeRecarga, limparAvisoDeRecarga } from './recarga';
import { Restauracao } from './Restauracao';
import { Salvaguarda } from './Salvaguarda';
import { COMO_GUARDAR_BACKUP } from './textos-backup';
import '../estilos-conta.css';

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
      <section className="cartao-bloco como-guardar-backup" aria-labelledby="t-como-guardar">
        <h2 id="t-como-guardar">{COMO_GUARDAR_BACKUP.titulo}</h2>
        <ol className="passos-backup">
          <li>{COMO_GUARDAR_BACKUP.passo1}</li>
          <li>{COMO_GUARDAR_BACKUP.passo2}</li>
          <li>{COMO_GUARDAR_BACKUP.passo3}</li>
        </ol>
        <p className="dica">{COMO_GUARDAR_BACKUP.senha}</p>
        <p className="dica">{COMO_GUARDAR_BACKUP.lembrete}</p>
      </section>
      <p className="dica">{AVISO_DE_RESPONSABILIDADE}</p>
      <Exportar />
      <NuvemBackup />
      <ExportarTexto />
      <Importar />
      <Espacos />
      <CopiaAnteriorSecao />
      <Restauracao />
      <ApagarTudo />
    </>
  );
}
