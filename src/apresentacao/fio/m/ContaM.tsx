// A Conta em folha, a `folha-conta` do mockup aprovado: o nó da pessoa (o anel se fecha quando há conta), entrar com o Google
// ou por código, a aparência (Céu, Movimento, Texto), a prova e o resto. O que é perigoso ou longo (entrar com o aceite da
// política, sair, apagar, exportar) segue nas telas de antes, onde o texto do aceite e as confirmações já moram: a folha leva
// até elas (desvio 44). Abre pelo nome "arretado" do Agora.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { alterarPreferencias, obterPreferencias } from '../../../core/preferencias';
import { estadoDaSincronizacao, ROTULO_DO_ESTADO } from '../../../core/sincronizacao/estado';
import { contasHabilitadas } from '../../../integracoes/conta';
import { useDados, useRepositorio } from '../../dados/contexto';
import { escolherMovimento } from '../../movimento-escolhido';
import { useSincronizacao } from '../../sincronizacao/contexto';
import { RelatarProblema } from '../../suporte/RelatarProblema';
import { useContaAtiva, type ContaAtiva } from '../dados/conta-ativa';
import { animar, modoAgora } from './anima';
import { FolhaM } from './FolhaM';
import { useMovimentoDoFio } from './movimento';
import { useMundo } from './mundo';
import { avisar } from './toast';

/** O tamanho da letra de leitura de cada "A" (o "Texto" do mockup): o normal do app, maior e bem maior. */
const TEXTOS = [
  { v: 1, px: 18, rotulo: 'Texto normal', tamanho: undefined },
  { v: 2, px: 22, rotulo: 'Texto maior', tamanho: 15 },
  { v: 3, px: 26, rotulo: 'Texto bem maior', tamanho: 17 },
] as const;

const textoDe = (px: number): 1 | 2 | 3 => (px <= 19 ? 1 : px <= 23 ? 2 : 3);

const Seta = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

function Linha({
  children,
  pequeno,
  aoToque,
}: {
  children: string;
  pequeno?: string;
  aoToque: () => void;
}) {
  return (
    <button type="button" className="m-linha-conta" onClick={aoToque}>
      <span>
        {children}
        {pequeno && <small>{pequeno}</small>}
      </span>
      <Seta />
    </button>
  );
}

function Conteudo({
  idDoTitulo,
  fechar,
  conta,
  aoRelatar,
}: {
  idDoTitulo: string;
  fechar: () => Promise<void>;
  conta: ContaAtiva | null | undefined;
  aoRelatar: () => void;
}) {
  const repo = useRepositorio();
  const navegar = useNavigate();
  const mundo = useMundo();
  const movimento = useMovimentoDoFio();
  const sync = useSincronizacao();
  const preferencias = useDados(useCallback((r) => obterPreferencias(r), [])).dados;
  const [texto, setTexto] = useState<1 | 2 | 3>();
  const anel = useRef<SVGCircleElement>(null);
  const miolo = useRef<SVGCircleElement>(null);
  const comConta = contasHabilitadas() && !!conta;
  const textoAgora = texto ?? (preferencias ? textoDe(preferencias.tamanhoFonte) : 1);

  // O anel se amarra em volta do nó quando a folha abre com conta (o do mockup é na volta do Google; aqui a volta recarrega o app).
  useEffect(() => {
    if (!comConta || modoAgora() !== 'normal') return;
    void animar(anel.current, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration: 1000,
      easing: 'cubic-bezier(.6,0,.2,1)',
    });
    void animar(
      miolo.current,
      [
        { transform: 'scale(1)' },
        { transform: 'scale(.8)', offset: 0.5 },
        { transform: 'scale(1.3)', offset: 0.85 },
        { transform: 'scale(1)' },
      ],
      { duration: 1150, easing: 'ease-out' },
    );
  }, [comConta]);

  const ir = (caminho: string) => {
    void fechar().then(() => {
      void navegar(caminho);
    });
  };

  const gravar = (mudanca: Parameters<typeof alterarPreferencias>[1], falha: string) => {
    alterarPreferencias(repo, mudanca).catch(() => {
      avisar(falha);
    });
  };

  const sincronia = sync?.estado.ligada
    ? ROTULO_DO_ESTADO[
        estadoDaSincronizacao({
          pendentes: sync.estado.pendentes,
          ultimaRodada: sync.estado.ultimaRodada,
          conflitos: sync.estado.conflitos,
        })
      ]
    : undefined;

  return (
    <>
      <div className="m-voce-cartao">
        <div className="m-no-grande" aria-hidden="true">
          <svg viewBox="0 0 60 60">
            <circle className="m-laco" cx="30" cy="30" r="22" />
            <circle ref={anel} className="m-anel" cx="30" cy="30" r="22" pathLength="1" />
            <circle ref={miolo} className="m-miolo" cx="30" cy="30" r="10" />
          </svg>
        </div>
        <div className="m-voce-txt">
          <span className="m-olho">Você</span>
          <h2 id={idDoTitulo}>{comConta ? 'Sua conta' : 'Seu fio mora neste aparelho'}</h2>
          <p>
            {comConta ? (
              <>
                {conta.email ?? 'sem e-mail conhecido'}
                {sincronia && (
                  <span className="m-sinc">
                    <i />
                    {sincronia}
                  </span>
                )}
              </>
            ) : contasHabilitadas() ? (
              'Entre para ele te seguir no celular e no computador. Nada do que você já fez se perde.'
            ) : (
              'Seus estudos ficam guardados aqui, só para você.'
            )}
          </p>
        </div>
      </div>
      {contasHabilitadas() && !comConta && (
        <>
          <button
            type="button"
            className="m-entrar-google"
            onClick={() => {
              ir('/conta/entrar');
            }}
          >
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <span>Entrar com o Google</span>
          </button>
          <button
            type="button"
            className="m-entrar-codigo"
            onClick={() => {
              ir('/conta/entrar');
            }}
          >
            Prefiro receber um código por e-mail
          </button>
        </>
      )}
      <div className="m-grupo-conta">
        <h3>Aparência</h3>
        <div className="m-ajuste">
          <span id="ajuste-ceu">Céu</span>
          <div className="m-chips" role="group" aria-labelledby="ajuste-ceu">
            {(
              [
                ['noite', 'Luar', 'escuro'],
                ['dia', 'Manhã', 'claro'],
              ] as const
            ).map(([v, nome, tema]) => (
              <button
                key={v}
                type="button"
                className="m-chip"
                aria-pressed={mundo === v}
                onClick={() => {
                  gravar({ tema }, 'Não deu para guardar o céu. Nada foi alterado.');
                }}
              >
                {nome}
              </button>
            ))}
          </div>
        </div>
        <div className="m-ajuste">
          <span id="ajuste-mov">Movimento</span>
          <div className="m-chips" role="group" aria-labelledby="ajuste-mov">
            {(
              [
                ['vivo', 'Vivo'],
                ['calmo', 'Calmo'],
              ] as const
            ).map(([v, nome]) => (
              <button
                key={v}
                type="button"
                className="m-chip"
                aria-pressed={movimento === v}
                onClick={() => {
                  escolherMovimento(v);
                }}
              >
                {nome}
              </button>
            ))}
          </div>
        </div>
        <div className="m-ajuste">
          <span id="ajuste-texto">Texto</span>
          <div className="m-chips" role="group" aria-labelledby="ajuste-texto">
            {TEXTOS.map((t) => (
              <button
                key={t.v}
                type="button"
                className="m-chip"
                aria-label={t.rotulo}
                aria-pressed={textoAgora === t.v}
                {...(t.tamanho ? { style: { fontSize: t.tamanho } } : {})}
                onClick={() => {
                  setTexto(t.v);
                  gravar(
                    { tamanhoFonte: t.px },
                    'Não deu para guardar o tamanho. Nada foi alterado.',
                  );
                  avisar(
                    t.v === 1
                      ? 'Texto de leitura no tamanho normal.'
                      : 'O texto de leitura ficou maior.',
                  );
                }}
              >
                A
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="m-grupo-conta">
        <h3>Prova</h3>
        <Linha
          pequeno="a prova e o que entra no seu destino"
          aoToque={() => {
            ir('/comecar');
          }}
        >
          Ajustar o destino
        </Linha>
      </div>
      <div className="m-grupo-conta">
        <h3>O resto</h3>
        <Linha
          pequeno="baixar ou apagar"
          aoToque={() => {
            ir('/conta/dados');
          }}
        >
          Seus dados
        </Linha>
        <Linha
          aoToque={() => {
            ir('/conta/privacidade');
          }}
        >
          Privacidade
        </Linha>
        <Linha
          aoToque={() => {
            ir('/orientacoes');
          }}
        >
          Orientações
        </Linha>
        <Linha
          aoToque={() => {
            void fechar().then(aoRelatar);
          }}
        >
          Relatar um problema
        </Linha>
        <Linha
          pequeno="perfis de estudo, passeio e sincronização"
          aoToque={() => {
            ir('/conta');
          }}
        >
          Todos os ajustes
        </Linha>
      </div>
      {comConta && (
        <button
          type="button"
          className="m-linha-conta m-sair"
          onClick={() => {
            ir('/conta');
          }}
        >
          Sair desta conta
        </button>
      )}
    </>
  );
}

/** A folha da Conta. `aberta` e `aoFechar` são de quem a abre (o nome "arretado" do Agora). */
export function ContaM({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const idDoTitulo = useId();
  const conta = useContaAtiva(aberta);
  const [relatando, setRelatando] = useState(false);
  const comConta = !!conta;
  return (
    <>
      <FolhaM
        aberta={aberta}
        aoFechar={aoFechar}
        idDoTitulo={idDoTitulo}
        classeDoCorpo={`m-conta-folha${comConta ? ' m-com-conta' : ''}`}
      >
        {(fechar) => (
          <Conteudo
            idDoTitulo={idDoTitulo}
            fechar={fechar}
            conta={conta}
            aoRelatar={() => {
              setRelatando(true);
            }}
          />
        )}
      </FolhaM>
      <RelatarProblema
        aberto={relatando}
        aoFechar={() => {
          setRelatando(false);
        }}
      />
    </>
  );
}
