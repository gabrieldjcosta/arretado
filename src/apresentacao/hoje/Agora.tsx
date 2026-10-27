// Bloco "Agora" do Hoje (pacote A1; D-D7, P3): uma só ação, com o motivo, a saída "Escolher outra
// coisa" e, acima da folha, onde a pessoa parou de ler com a caneta encostada nela.
import { AcaoAgora } from '../componentes/AcaoAgora';
import { Esqueleto } from '../componentes/estados';
import { AgoraNoMapa } from './AgoraNoMapa';
import { ComecarSessao } from '../sessao/ComecarSessao';
import { SessaoAberta } from '../sessao/SessaoAberta';
import { ROTULO_REVISAR_CARTOES } from '../../dominios/hoje/proxima-acao';
import { EstadoVazio } from './EstadoVazio';
import { Parada } from './Parada';
import type { HojeEmAndamento } from './retrato';
import { RevisaoPorTempo } from './RevisaoPorTempo';
import { rotaDeInicio } from './rota-de-inicio';
import { motivoDaAcao, rotuloDoBotao, tituloDaAcao } from './textos-da-acao';
import './estilos-hoje.css';

function ProximaAcaoDoHoje({ hoje }: { hoje: HojeEmAndamento }) {
  const { retrato, dispensou, dispensar, voltar } = hoje;
  if (retrato === undefined) return <Esqueleto linhas={2} />;
  const { agora, parada, diaFechado, outras } = retrato;
  if (agora.tipo === 'vazio') {
    return <EstadoVazio comecos={agora.comecos} {...(dispensou ? { aoVoltar: voltar } : {})} />;
  }
  const { acao } = agora;
  const escolherOutra = () => {
    dispensar(acao.tipo);
  };
  // A norma que a pessoa está lendo (a da leitura salva), esteja ela no Agora ou mais adiante.
  const normaLida = [acao, ...outras].find((a) => a.tipo === 'leitura_salva')?.alvo.id;
  // Com cartão vencido, a folha deixa a pessoa dizer quanto tempo tem (AP-01).
  if (acao.tipo === 'revisao_vencida' && acao.alvo.rotulo === ROTULO_REVISAR_CARTOES) {
    return (
      <RevisaoPorTempo
        acao={acao}
        antes={<Parada {...(parada === undefined ? {} : { parada })} comCaneta={!diaFechado} />}
        aoEscolherOutra={escolherOutra}
        {...(normaLida === undefined ? {} : { normaLida })}
      />
    );
  }
  const motivo = motivoDaAcao(acao);
  return (
    <>
      <Parada {...(parada === undefined ? {} : { parada })} comCaneta={!diaFechado} />
      <AcaoAgora
        titulo={tituloDaAcao(acao)}
        {...(motivo === undefined ? {} : { motivo })}
        {...(acao.estimativaMin === undefined ? {} : { estimativa: acao.estimativaMin })}
        rotuloBotao={rotuloDoBotao(acao)}
        para={rotaDeInicio(acao)}
        aoEscolherOutra={escolherOutra}
      />
      {acao.tipo === 'leitura_salva' && normaLida !== undefined && (
        <AgoraNoMapa normaId={normaLida} />
      )}
    </>
  );
}

export function Agora({ hoje }: { hoje: HojeEmAndamento }) {
  const normaLida = hoje.retrato
    ? [
        ...(hoje.retrato.agora.tipo === 'acao' ? [hoje.retrato.agora.acao] : []),
        ...hoje.retrato.outras,
      ].find((a) => a.tipo === 'leitura_salva')?.alvo.id
    : undefined;
  return (
    <>
      <SessaoAberta />
      <ProximaAcaoDoHoje hoje={hoje} />
      <ComecarSessao {...(normaLida === undefined ? {} : { normaLida })} />
    </>
  );
}
