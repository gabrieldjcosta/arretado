// Bloco "Agora" do Hoje (pacote A1; D-D7, P3): uma só ação, com o motivo, a saída "Escolher outra
// coisa" e, acima da folha, onde a pessoa parou de ler com a caneta encostada nela.
import { Link } from 'react-router';
import type { ProximaAcao } from '../../dominios/hoje/contrato';
import { AcaoAgora } from '../componentes/AcaoAgora';
import { Esqueleto } from '../componentes/estados';
import { Icone } from '../componentes/Icone';
import { ComecarSessao } from '../sessao/ComecarSessao';
import { sessaoAberta } from '../sessao/carregadores';
import { SessaoAberta } from '../sessao/SessaoAberta';
import { useDados } from '../dados/contexto';
import { ROTULO_REVISAR_CARTOES } from '../../dominios/hoje/proxima-acao';
import { EstadoVazio } from './EstadoVazio';
import { Parada } from './Parada';
import type { HojeEmAndamento } from './retrato';
import { RevisaoPorTempo } from './RevisaoPorTempo';
import { rotaDeInicio } from './rota-de-inicio';
import { motivoDaAcao, rotuloDoBotao, tituloDaAcao } from './textos-da-acao';
import './estilos-hoje.css';

/** Com o Agora no trecho do mapa, "de onde parou" fica como alternativa, uma linha abaixo da folha. */
function DeOndeParou({
  acao,
}: {
  acao: ProximaAcao & { trecho: NonNullable<ProximaAcao['trecho']> };
}) {
  const { continuar } = acao.trecho;
  const semTrecho: ProximaAcao = { tipo: acao.tipo, alvo: acao.alvo, razao: continuar.razao };
  return (
    <p className="agora-no-mapa dica">
      <Icone nome="voltar" />
      <span>
        Ou de onde parou
        {continuar.estimativaMin === undefined
          ? ''
          : `, cerca de ${String(continuar.estimativaMin)} min`}
        .
      </span>
      <Link to={rotaDeInicio(semTrecho)} className="botao botao-texto">
        Continuar a leitura
      </Link>
    </p>
  );
}

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
  const trecho = acao.trecho;
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
      {trecho !== undefined && <DeOndeParou acao={{ ...acao, trecho }} />}
    </>
  );
}

export function Agora({ hoje }: { hoje: HojeEmAndamento }) {
  const { dados: aberta } = useDados(sessaoAberta);
  const normaLida = hoje.retrato
    ? [
        ...(hoje.retrato.agora.tipo === 'acao' ? [hoje.retrato.agora.acao] : []),
        ...hoje.retrato.outras,
      ].find((a) => a.tipo === 'leitura_salva')?.alvo.id
    : undefined;
  return (
    <>
      <SessaoAberta />
      {/* Com Sessão aberta o "Continuar" é um só: o da Sessão; a Próxima ação espera ela fechar. */}
      {aberta === null && <ProximaAcaoDoHoje hoje={hoje} />}
      {/* No Hoje vazio o começo é um só ("Por onde começar?"): o cartão de Sessão espera haver o que fazer. */}
      {aberta === null && hoje.retrato?.agora.tipo === 'acao' && (
        <ComecarSessao {...(normaLida === undefined ? {} : { normaLida })} />
      )}
    </>
  );
}
