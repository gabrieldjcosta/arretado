// Hoje como composição de blocos (P0). Cada bloco é um arquivo de UM pacote da F3 (ver
// docs/planos/f3-pacotes.md): Agora e RevisoesDoDia = A1; Retorno = A3b; Depois = B4; Captura = sem
// dono, o primeiro pacote que precisar. Depois do P0, quem não é dono não edita este arquivo nem o
// de outro pacote. Estilo novo vai em CSS próprio do pacote, sem cor literal.
import { Agora } from './Agora';
import { Captura } from './Captura';
import { Depois } from './Depois';
import { RevisoesDoDia } from './RevisoesDoDia';
import { LembreteDeBackup } from './LembreteDeBackup';
import { FecharDia } from './FecharDia';
import { BoasVindas } from './Retorno';

export function Hoje() {
  return (
    <>
      <h1>Hoje</h1>
      <BoasVindas />
      <Agora />
      <FecharDia />
      <RevisoesDoDia />
      <Depois />
      <Captura />
      <LembreteDeBackup />
    </>
  );
}
