import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { FonteDoItem } from '../../../dominios/legislacao/ache-o-erro';
import {
  CARTOES_DA_PORTEIRA,
  montarGuardar,
  montarPorteira,
} from '../../../dominios/legislacao/lembrar';
import { concluirTarefa } from '../../../dominios/tarefas';
import { useRepositorio } from '../../dados/contexto';
import type { AlvoDaPorteira } from '../passos/alvo-da-porteira';
import { referenciaDe, useCargaDoPasso } from '../passos/carregar';
import { guardarFraseDaFonte } from '../passos/guardar-frase';
import { BotaoPular, BotaoSeguir, ChipSeguir, PassoSemNada } from './BotoesM';
import { CartaoM } from './CartaoM';
import { DequeM } from './DequeM';
import { SetaM } from './IconesM';
import type { PropsDoPassoM, Variante } from './passo-tipos';

const Titulo = ({ children }: { children: ReactNode }) => (
  <h2 style={{ margin: '4px 0 6px' }}>{children}</h2>
);

type EstadoDoGuardar = 'parada' | 'guardando' | 'guardada' | 'falhou';

/** Uma Frase certa, tirada da lei, com um toque para guardar (a `.frase` do Lembrar, no Guardar). */
function FraseParaGuardar({ fonte, aoGuardar }: { fonte: FonteDoItem; aoGuardar: () => void }) {
  const repo = useRepositorio();
  const [estado, setEstado] = useState<EstadoDoGuardar>('parada');
  const guardar = async () => {
    if (estado === 'guardando' || estado === 'guardada') return;
    setEstado('guardando');
    try {
      await guardarFraseDaFonte(repo, fonte);
      setEstado('guardada');
      aoGuardar();
    } catch {
      setEstado('falhou');
    }
  };
  return (
    <div className="m-frase">
      <span className="m-rot">{fonte.referencia}</span>
      {fonte.texto}
      <div style={{ marginTop: 10 }}>
        {estado === 'guardada' ? (
          <p className="m-ok" style={{ fontSize: 15, margin: 0 }} role="status">
            Frase guardada. Volta amanhã.
          </p>
        ) : (
          <button
            type="button"
            className="m-chip"
            disabled={estado === 'guardando'}
            onClick={() => void guardar()}
          >
            Guardar esta Frase
          </button>
        )}
        {estado === 'falhou' && (
          <p className="m-quieto" role="alert" style={{ marginTop: 6 }}>
            Não foi possível guardar. Nada foi alterado.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * O passo Guardar: depois de um Lembrar cujas Frases não foram guardadas (o "Guardar e seguir" do próprio
 * cartão do Lembrar faz isso num toque), a Frase certa de cada artigo, já escrita. Nada é obrigatório.
 */
export function GuardarM({
  passo,
  semente,
  trilho,
  aoConcluir,
  aoPular,
  aoPausar,
}: PropsDoPassoM<Variante<'guardar'>>) {
  const chave = `guardar|${passo.normaId}|${passo.enderecos.join(',')}|${String(semente)}`;
  const carga = useCargaDoPasso(chave, (repo) =>
    montarGuardar(
      repo,
      { normaId: passo.normaId, enderecos: passo.enderecos },
      referenciaDe,
      semente,
    ),
  );
  const [guardadas, setGuardadas] = useState(0);
  const itens = carga.estado === 'pronto' ? carga.dados : [];
  const vazio = carga.estado === 'falhou' || (carga.estado === 'pronto' && itens.length === 0);

  return (
    <CartaoM
      nome="guardar"
      etiqueta="Guardar"
      carimbo="FEITO"
      resolvido
      aoSeguir={() => {
        aoConcluir({ tipo: 'guardar', guardadas });
      }}
      aoPular={aoPular}
      aoPausar={aoPausar}
      trilho={trilho}
    >
      {!vazio && (
        <Titulo>
          {itens.length === 1 ? 'Esta frase vale guardar.' : 'Estas frases valem guardar.'}
        </Titulo>
      )}
      {vazio && <PassoSemNada texto="Nada para guardar neste passo." />}
      {!vazio && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {itens.map(({ artigoEndereco, pergunta }) => (
              <FraseParaGuardar
                key={artigoEndereco}
                fonte={pergunta.tipo === 'lacuna' ? pergunta.lacuna.fonte : pergunta.cartao.fonte}
                aoGuardar={() => {
                  setGuardadas((n) => n + 1);
                }}
              />
            ))}
          </div>
          <div className="m-vazio" />
          <div className="m-rodape-cartao">
            <BotaoPular />
            <BotaoSeguir>Seguir</BotaoSeguir>
          </div>
        </>
      )}
    </CartaoM>
  );
}

/** O passo Revisar: os itens que chegaram na hora são revistos na tela de revisão, e o Fio os conta. */
export function RevisarM({
  passo,
  d,
  trilho,
  aoConcluir,
  aoPular,
  aoPausar,
}: PropsDoPassoM<Variante<'revisar'>>) {
  return (
    <CartaoM
      nome="revisar"
      etiqueta="Revisar"
      carimbo="FEITO"
      resolvido={false}
      aoSeguir={() => {
        aoConcluir({ tipo: 'revisar', revisados: passo.quantidade, voltamAmanha: 0 });
      }}
      aoPular={aoPular}
      aoPausar={aoPausar}
      trilho={trilho}
    >
      <Titulo>{d.titulo}</Titulo>
      <p className="m-quieto">{d.apoio}</p>
      <div className="m-vazio" />
      <div className="m-rodape-cartao">
        <BotaoPular />
        <Link to={`/recall/revisar?itens=${String(passo.quantidade)}`} className="m-acao">
          Revisar agora
          <SetaM />
        </Link>
      </div>
      <ChipSeguir>Já revisei</ChipSeguir>
    </CartaoM>
  );
}

/** O passo que a pessoa pôs no próprio fio (uma tarefa dela): "Fiz" conclui a tarefa e fecha o passo. */
export function SeuPassoM({
  passo,
  d,
  trilho,
  aoConcluir,
  aoPular,
  aoPausar,
}: PropsDoPassoM<Variante<'seu_passo'>>) {
  const repo = useRepositorio();
  return (
    <CartaoM
      nome="seu_passo"
      etiqueta="Seu passo"
      carimbo="FEITO"
      resolvido
      aoSeguir={() => {
        void concluirTarefa(repo, passo.tarefaId)
          .catch(() => undefined)
          .then(() => {
            aoConcluir({ tipo: 'seu_passo' });
          });
      }}
      aoPular={aoPular}
      aoPausar={aoPausar}
      trilho={trilho}
    >
      <Titulo>{d.titulo}</Titulo>
      <p className="m-quieto">{d.apoio}</p>
      <div className="m-vazio" />
      <div className="m-rodape-cartao">
        <BotaoPular />
        <BotaoSeguir>Fiz</BotaoSeguir>
      </div>
    </CartaoM>
  );
}

/** "Guardar a Frase" depois da porteira: as que escaparam vão ao varal com um toque. */
function GuardarFrasesDaPorteira({ erros }: { erros: readonly { fonte: FonteDoItem }[] }) {
  const repo = useRepositorio();
  const [estado, setEstado] = useState<EstadoDoGuardar>('parada');
  if (erros.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        className="m-chip"
        disabled={estado === 'guardando' || estado === 'guardada'}
        onClick={() => {
          setEstado('guardando');
          void Promise.all(erros.map((e) => guardarFraseDaFonte(repo, e.fonte))).then(
            () => {
              setEstado('guardada');
            },
            () => {
              setEstado('falhou');
            },
          );
        }}
      >
        {estado === 'guardada'
          ? 'Guardada no varal'
          : `Guardar ${erros.length > 1 ? 'as Frases' : 'a Frase'}`}
      </button>
      {estado === 'falhou' && (
        <p className="m-quieto" role="alert" style={{ marginTop: 6 }}>
          Não foi possível guardar. Nada foi alterado.
        </p>
      )}
    </div>
  );
}

/**
 * O passo Praticar em modo porteira, com o deque do mockup (`#deque`): três afirmações de certo ou errado,
 * só do que a pessoa já leu. O modo `ache_o_erro` ainda não tem tela no quadro: o passo diz isso e deixa seguir.
 */
export function PraticarM({
  passo,
  alvo,
  semente,
  trilho,
  aoConcluir,
  aoPular,
  aoPausar,
}: PropsDoPassoM<Variante<'praticar'>> & { alvo: AlvoDaPorteira }) {
  const porteira = passo.modo === 'porteira';
  const chave = `praticar|${passo.modo}|${alvo.normaId}|${alvo.artigos.map((a) => a.endereco).join(',')}|${String(semente)}`;
  const carga = useCargaDoPasso(chave, (repo) =>
    porteira
      ? montarPorteira(
          repo,
          alvo,
          referenciaDe,
          semente,
          Math.min(passo.quantidade, CARTOES_DA_PORTEIRA),
        )
      : Promise.resolve([]),
  );
  const [fim, setFim] = useState<{ acertos: number; total: number }>();
  const cartoes = carga.estado === 'pronto' ? carga.dados : [];
  const vazio = carga.estado === 'falhou' || (carga.estado === 'pronto' && cartoes.length === 0);

  return (
    <CartaoM
      nome="praticar"
      etiqueta="Porteira"
      carimbo="FEITO"
      resolvido={fim !== undefined}
      aoSeguir={() => {
        aoConcluir({
          tipo: 'praticar',
          acertos: fim?.acertos ?? 0,
          total: fim?.total ?? 0,
        });
      }}
      aoPular={aoPular}
      aoPausar={aoPausar}
      trilho={trilho}
    >
      <Titulo>Certo ou errado?</Titulo>
      {vazio && <PassoSemNada texto="Nada para praticar aqui." />}
      {carga.estado === 'carregando' && <p className="m-quieto">…</p>}
      {!vazio && carga.estado === 'pronto' && (
        <>
          <p className="m-quieto">
            Três afirmações no estilo da FCC, só do que você já leu. Passe para a direita se está
            certa, para a esquerda se está errada. Não tem prazo e não se perde nada.
          </p>
          <DequeM
            cartoes={cartoes}
            aoFim={(r) => {
              setFim({ acertos: r.acertos, total: r.total });
            }}
            final={(r) => <GuardarFrasesDaPorteira erros={r.erros} />}
          />
          <div className="m-vazio" />
          <div className="m-rodape-cartao">
            {fim ? <BotaoSeguir>Seguir</BotaoSeguir> : <BotaoPular />}
          </div>
        </>
      )}
    </CartaoM>
  );
}
