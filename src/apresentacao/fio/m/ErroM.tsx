// "Guardar um erro", a `folha-erro` do mockup aprovado: a Frase certa (a única coisa obrigatória), de onde veio, se a pessoa
// quiser, e o artigo a que ela se liga, entre os que a pessoa está estudando. "Pendurar no varal" guarda, a folha desce e
// a Frase vira um folheto que voa até o Varal (`#pendurar` do mockup: 760 ms, em arco, com a nav quicando ao chegar).
import { useEffect, useId, useRef, useState } from 'react';
import { excluirErro } from '../../../dominios/recall/servico';
import { useRepositorio } from '../../dados/contexto';
import {
  artigosSugeridos,
  guardarErroDoFio,
  ORIGENS_DO_ERRO,
  type ArtigoSugerido,
  type OrigemDoErro,
} from '../dados/guardar-erro';
import { useFio } from '../dados/useFio';
import { animar, MOLA, modoAgora, TROCAR } from './anima';
import { pedacosDaLei } from './caderno-dados';
import { LerNaLei } from './CadernoM';
import { FolhaM } from './FolhaM';
import { SetaM } from './IconesM';
import { avisar } from './toast';

/** O folheto que voa do campo até o Varal (a `.voa-folheto` do mockup). */
async function voarAteOVaral(de: DOMRect) {
  const quadro = document.getElementById('conteudo');
  const varal = quadro?.querySelector<HTMLElement>('.m-nav [data-nav="varal"]');
  if (!quadro || !varal) return;
  const A = quadro.getBoundingClientRect();
  const para = varal.getBoundingClientRect();
  const v = document.createElement('div');
  v.className = 'm-voa-folheto';
  quadro.appendChild(v);
  const x0 = de.left - A.left + de.width / 2 - 45;
  const y0 = de.top - A.top;
  const x1 = para.left - A.left + para.width / 2 - 45;
  const y1 = para.top - A.top - 20;
  if (modoAgora() === 'normal') {
    await animar(
      v,
      [
        { transform: `translate(${String(x0)}px, ${String(y0)}px) rotate(0) scale(1)` },
        {
          transform: `translate(${String((x0 + x1) / 2)}px, ${String(y0 - 40)}px) rotate(-8deg) scale(.8)`,
          offset: 0.4,
        },
        {
          transform: `translate(${String(x1)}px, ${String(y1)}px) rotate(6deg) scale(.25)`,
          opacity: 0.9,
        },
      ],
      { duration: 760, easing: TROCAR },
    );
  } else {
    await animar(
      v,
      [
        { transform: `translate(${String(x1)}px, ${String(y1)}px) scale(.4)`, opacity: 0 },
        { transform: `translate(${String(x1)}px, ${String(y1)}px) scale(.25)`, opacity: 0.8 },
        { opacity: 0 },
      ],
      { duration: 500 },
    );
  }
  v.remove();
  void animar(
    varal,
    [{ transform: 'none' }, { transform: 'translateY(-6px) scale(1.12)' }, { transform: 'none' }],
    { duration: 480, easing: MOLA },
  );
}

function ConteudoDoErro({
  idDoTitulo,
  fechar,
}: {
  idDoTitulo: string;
  fechar: () => Promise<void>;
}) {
  const repo = useRepositorio();
  const fio = useFio();
  const idDoCampo = useId();
  const campo = useRef<HTMLTextAreaElement>(null);
  const [texto, setTexto] = useState('');
  const [origem, setOrigem] = useState<OrigemDoErro>();
  const [sugestoes, setSugestoes] = useState<ArtigoSugerido[]>([]);
  // `undefined` = a primeira sugestão (como no mockup); `null` = "Nenhum".
  const [escolhido, setEscolhido] = useState<string | null>();
  const [guardando, setGuardando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const passos = fio.avanco?.estado.etapa?.passos;

  useEffect(() => {
    if (!passos) return;
    let ativo = true;
    artigosSugeridos(repo, passos).then(
      (s) => {
        if (ativo) setSugestoes(s);
      },
      () => undefined,
    );
    return () => {
      ativo = false;
    };
  }, [repo, passos]);

  const idEscolhido = escolhido === undefined ? (sugestoes[0]?.dispositivoId ?? null) : escolhido;
  const artigo = sugestoes.find((s) => s.dispositivoId === idEscolhido);
  const pronto = texto.trim() !== '' && !guardando;

  const pendurar = async () => {
    if (!pronto) return;
    const de = campo.current?.getBoundingClientRect();
    setGuardando(true);
    setFalhou(false);
    let id: string;
    try {
      id = await guardarErroDoFio(repo, {
        texto,
        ...(origem ? { origem } : {}),
        ...(artigo ? { artigo } : {}),
      });
    } catch {
      setGuardando(false);
      setFalhou(true);
      return;
    }
    void fechar();
    if (de) await voarAteOVaral(de);
    avisar('Pendurada no varal. Volta na revisão amanhã.', () => {
      void excluirErro(repo, id);
    });
  };

  return (
    <>
      <span className="m-olho">Guardar um erro</span>
      <h2 id={idDoTitulo}>Qual é a frase certa?</h2>
      <textarea
        ref={campo}
        id={idDoCampo}
        className="m-campo"
        aria-labelledby={idDoTitulo}
        placeholder="Escreva do jeito certo. Ex.: primário com violência progride com 25% da pena."
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
        }}
      />
      <span className="m-rotulo-campo">
        De onde veio <b>· se quiser</b>
      </span>
      <div className="m-chips" role="group" aria-label="De onde veio">
        {ORIGENS_DO_ERRO.map((o) => (
          <button
            key={o}
            type="button"
            className="m-chip"
            aria-pressed={origem === o}
            onClick={() => {
              setOrigem(origem === o ? undefined : o);
            }}
          >
            {o}
          </button>
        ))}
      </div>
      {sugestoes.length > 0 && (
        <>
          <span className="m-rotulo-campo">
            Ligar a um artigo <b>· sugestão do que você estuda</b>
          </span>
          <div className="m-chips" role="group" aria-label="Ligar a um artigo">
            {sugestoes.map((s) => (
              <button
                key={s.dispositivoId}
                type="button"
                className="m-chip"
                aria-pressed={idEscolhido === s.dispositivoId}
                onClick={() => {
                  setEscolhido(s.dispositivoId);
                }}
              >
                {s.citacao}
              </button>
            ))}
            <button
              type="button"
              className="m-chip"
              aria-pressed={idEscolhido === null}
              onClick={() => {
                setEscolhido(null);
              }}
            >
              Nenhum
            </button>
          </div>
        </>
      )}
      <div className="m-ler-junto" key={artigo?.dispositivoId ?? 'nenhum'}>
        {artigo && (
          <LerNaLei
            lei={{ citacao: artigo.citacao, pedacos: pedacosDaLei(artigo.texto) }}
            idDoTexto={idDoCampo}
          />
        )}
      </div>
      {falhou && (
        <p className="m-quieto" role="alert">
          Não foi possível guardar. Nada foi alterado.
        </p>
      )}
      <div className="m-fim-folha">
        <button
          type="button"
          className="m-icone"
          aria-label="Fechar sem guardar"
          onClick={() => {
            void fechar();
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <button
          type="button"
          className="m-acao"
          disabled={!pronto}
          onClick={() => {
            void pendurar();
          }}
        >
          Pendurar no varal
          <SetaM />
        </button>
      </div>
    </>
  );
}

/** A folha "Guardar um erro". `aberta` e `aoFechar` são de quem a abre (o "+" do quadro). */
export function ErroM({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const idDoTitulo = useId();
  return (
    <FolhaM aberta={aberta} aoFechar={aoFechar} idDoTitulo={idDoTitulo}>
      {(fechar) => <ConteudoDoErro idDoTitulo={idDoTitulo} fechar={fechar} />}
    </FolhaM>
  );
}
