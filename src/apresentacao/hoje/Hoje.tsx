// Hoje como composição de blocos (P0; D-D7, P3). Cada bloco é um arquivo de UM pacote da F3 (ver
// docs/planos/f3-pacotes.md): Agora e RevisoesDoDia = A1; Retorno = A3b; Depois = B4; Captura = sem
// dono, o primeiro pacote que precisar. Depois do P0, quem não é dono não edita este arquivo nem o
// de outro pacote. Estilo novo vai em CSS próprio do pacote, sem cor literal.
//
// O que a tela mostra de uma vez (os pontos do Dia, a linha de parada, o Agora e o "Em seguida") vem
// de um só retrato dos dados (`useRetratoDoHoje`), para os blocos nunca discordarem entre si.
//
// Em duas colunas (P7b) a partir de 900 px: o Agora à esquerda; o "Em seguida" (um `<details>`, com o
// "Trocar" de cada item, Q5) e o "Para lembrar" à direita. Abaixo disso as duas viram uma só, na mesma
// ordem.
//
// A Chegada (`EntradaDoDia`, D-D9) é uma folha sobre o Hoje, não parte do layout; a Entrada do Dia (S4)
// é a linha quieta acima do Agora. Montam aqui porque o Hoje é onde o aplicativo abre.
import { TituloComMais } from '../componentes/TituloComMais';
import { GuiaDaTela } from '../guia/GuiaDaTela';
import { EntradaDoDia } from '../entrada/EntradaDoDia';
import { ROTULO_DA_AREA } from '../textos';
import { Agora } from './Agora';
import { AvisoDeAtualizacao } from './AvisoDeAtualizacao';
import { Captura } from './Captura';
import { ConviteDepoisDaLeitura } from './ConviteDepoisDaLeitura';
import { Depois } from './Depois';
import { FecharDia } from './FecharDia';
import { LeiMudouNoHoje } from './LeiMudouNoHoje';
import { LembreteDeBackup } from './LembreteDeBackup';
import { ParaLembrar } from './ParaLembrar';
import { PontosDoDia } from './PontosDoDia';
import { RevisoesDoDia } from './RevisoesDoDia';
import { BoasVindas } from './Retorno';
import { useRetratoDoHoje } from './retrato';

export function Hoje() {
  const hoje = useRetratoDoHoje();
  return (
    <>
      <TituloComMais>{ROTULO_DA_AREA.hoje}</TituloComMais>
      <PontosDoDia retrato={hoje.retrato} />
      {/* A Chegada (folha) e a linha do dia (S4): a linha fica acima do Agora. */}
      <EntradaDoDia retrato={hoje.retrato} />
      <div className="hoje-colunas">
        <div>
          <Agora hoje={hoje} />
          {/* Depois da folha: o cartão de volta de pausa não empurra o Começar para baixo da barra. */}
          <BoasVindas />
          <LeiMudouNoHoje />
          {hoje.retrato?.agora.tipo === 'vazio' && <GuiaDaTela tela="hoje" />}
        </div>
        <div>
          <Depois
            acoes={hoje.emSeguida}
            opcoes={hoje.retrato?.outras ?? []}
            aoTrocar={hoje.trocar}
          />
          <ParaLembrar />
        </div>
      </div>
      <FecharDia />
      <RevisoesDoDia />
      <Captura />
      <ConviteDepoisDaLeitura />
      <LembreteDeBackup />
      <AvisoDeAtualizacao />
    </>
  );
}
