// A `folha-porteira` do mockup aprovado: tocar numa porteira pronta do Destino abre uma folha com o deque de certo ou
// errado (o mesmo da porteira do passo: três afirmações só do que a pessoa já leu). Ao fim, "A porteira abriu" e "Ver no
// meu fio": a folha desce, a porteira passa a aberta e gira (45° a 405°, 900 ms, na mola).
import { useId } from 'react';
import { CARTOES_DA_PORTEIRA, montarPorteira } from '../../../dominios/legislacao/lembrar';
import type { AlvoDaPorteira } from '../passos/alvo-da-porteira';
import { referenciaDe, useCargaDoPasso } from '../passos/carregar';
import { DequeM } from './DequeM';
import { FolhaM } from './FolhaM';
import { SetaM } from './IconesM';
import { GuardarFrasesDaPorteira } from './OutrosPassosM';

interface Props {
  aberta: boolean;
  aoFechar: () => void;
  /** A porteira passou: o app grava e o mapa a mostra aberta. */
  aoPassar: () => void;
  materia: string;
  alvo: AlvoDaPorteira | undefined;
  semente: number;
}

function Conteudo({
  idDoTitulo,
  fechar,
  aoPassar,
  materia,
  alvo,
  semente,
}: Omit<Props, 'aberta' | 'aoFechar'> & { idDoTitulo: string; fechar: () => Promise<void> }) {
  const chave = `folha-porteira|${alvo?.normaId ?? ''}|${(alvo?.artigos ?? []).map((a) => a.endereco).join(',')}|${String(semente)}`;
  const carga = useCargaDoPasso(chave, (repo) =>
    alvo && alvo.artigos.length > 0
      ? montarPorteira(repo, alvo, referenciaDe, semente, CARTOES_DA_PORTEIRA)
      : Promise.resolve([]),
  );
  const cartoes = carga.estado === 'pronto' ? carga.dados : [];
  const vazio = carga.estado === 'falhou' || (carga.estado === 'pronto' && cartoes.length === 0);
  return (
    <>
      <span className="m-olho">Porteira · {materia}</span>
      <h2 id={idDoTitulo}>Certo ou errado?</h2>
      {vazio && (
        <>
          <p className="m-quieto">
            Ainda não há o que perguntar aqui. Leia o que mais cai e volte.
          </p>
          <button
            type="button"
            className="m-acao"
            style={{ marginTop: 14 }}
            onClick={() => void fechar()}
          >
            Fechar
            <SetaM />
          </button>
        </>
      )}
      {carga.estado === 'carregando' && <p className="m-quieto">…</p>}
      {!vazio && carga.estado === 'pronto' && (
        <>
          <p className="m-quieto">
            Três afirmações no estilo da banca, só do que você já leu. Passe para a direita se está
            certa, para a esquerda se está errada. Não tem prazo e não se perde nada.
          </p>
          <DequeM
            cartoes={cartoes}
            aoFim={() => {
              /* o veredito já diz; o que fecha vem no `final` */
            }}
            final={(r) => (
              <>
                <GuardarFrasesDaPorteira erros={r.erros} />
                <button
                  type="button"
                  className="m-acao"
                  style={{ marginTop: 14 }}
                  onClick={() => {
                    void fechar().then(aoPassar);
                  }}
                >
                  Ver no meu fio
                  <SetaM />
                </button>
              </>
            )}
          />
        </>
      )}
    </>
  );
}

export function PorteiraM({ aberta, aoFechar, ...resto }: Props) {
  const idDoTitulo = useId();
  return (
    <FolhaM aberta={aberta} aoFechar={aoFechar} idDoTitulo={idDoTitulo}>
      {(fechar) => <Conteudo idDoTitulo={idDoTitulo} fechar={fechar} {...resto} />}
    </FolhaM>
  );
}
