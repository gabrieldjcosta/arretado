// O Destino do Arretado novo, a tela `mapa` do mockup aprovado: quanto da prova já é da pessoa, em número que conta até
// o valor, e o Nordeste de verdade com o caminho dela. Na primeira visita ao aparelho o mockup abre com uma entrada: a
// estrela do destino aparece, "Seu destino" se escreve, ela desce até o fim do caminho e o mapa se revela de cima
// (`introDestino`); nas outras visitas a tela só entra. Os dados são os do app (`useJornadaDoFio`), não os números de
// exemplo do mockup.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ORDEM_UF } from '../destino/nordeste';
import { materiaAtual, resumoDoMapa } from '../destino/resumo';
import { useJornadaDoFio } from '../destino/useJornadaDoFio';
import { animar, animarEDeixar, modoAgora, MOLA, SAIR } from './anima';
import { destinoJaVisto, marcarDestinoVisto } from './destino-visto';
import { MapaM } from './MapaM';
import { TelaM } from './TelaM';

/** O tempo que a entrada segura o mapa, na primeira visita (o `D0` do mockup). */
const ENTRADA_MS = 2350;

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;
const formatar = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** A estrela do destino, a do mapa e a da entrada (o mesmo caminho do mockup). */
const ESTRELA = 'M12 2.5l2.6 6.2 6.7.6-5.1 4.4 1.6 6.6L12 16.8l-5.8 3.5 1.6-6.6-5.1-4.4 6.7-.6z';

/**
 * O número grande do Destino: sobe de 0 até `alvo` em 900 ms (ease-out cúbico), começando depois de `atraso`. Sem
 * movimento, ou sem nada a contar, já mostra o valor. O leitor de tela lê só o valor final.
 */
function NumeroM({ alvo, atraso }: { alvo: number; atraso: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = formatar(modoAgora() === 'normal' && alvo > 0 ? 0 : alvo);
    if (modoAgora() !== 'normal' || !(alvo > 0)) return;
    let quadro = 0;
    const t0 = performance.now() + atraso;
    const passo = (t: number) => {
      const k = Math.max(0, Math.min(1, (t - t0) / 900));
      el.textContent = formatar(alvo * (1 - Math.pow(1 - k, 3)));
      if (k < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(quadro);
    };
  }, [alvo, atraso]);
  return (
    <div className="m-numero">
      <span ref={ref} aria-hidden="true" />
      <small aria-hidden="true">%</small>
      <span className="m-so-leitor">{formatar(alvo)}%</span>
    </div>
  );
}

/** O quadro do Fio (`#conteudo`): na primeira carga do app ele ainda não existe quando a tela renderiza, e aparece logo depois. */
const semAssinar = () => () => undefined;
const acharQuadro = () => document.getElementById('conteudo');
const semQuadro = () => null;

/**
 * A entrada da primeira visita (`introDestino` do mockup): uma estrela com anel, "Seu destino" letra por letra e a
 * frase, tudo por cima do quadro; depois ela desce até o fim do caminho, que o mapa está revelando, e some.
 */
function IntroDoDestino() {
  const quadro = useSyncExternalStore(semAssinar, acharQuadro, semQuadro);
  return quadro ? createPortal(<SobreposicaoDoDestino />, quadro) : null;
}

function SobreposicaoDoDestino() {
  const ref = useRef<HTMLDivElement>(null);
  const [fim, setFim] = useState(false);
  useLayoutEffect(() => {
    const ov = ref.current;
    if (!ov) return;
    void animar(
      ov.querySelector('.m-fim-i'),
      [
        { transform: 'scale(.3)', opacity: 0 },
        { transform: 'scale(1.12)', opacity: 1, offset: 0.6 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 560, easing: MOLA },
    );
    const estrela = ov.querySelector<SVGPathElement>('svg path');
    if (estrela) estrela.style.strokeDasharray = '70';
    void animar(estrela, [{ strokeDashoffset: 70 }, { strokeDashoffset: 0 }], {
      duration: 700,
      delay: 200,
      easing: 'cubic-bezier(.4,0,.2,1)',
    });
    ov.querySelectorAll('strong i').forEach((letra, i) => {
      void animar(
        letra,
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 360, delay: 520 + i * 48, easing: SAIR },
      );
    });
    void animar(ov.querySelector('span'), [{ opacity: 0 }, { opacity: 1 }], {
      duration: 500,
      delay: 1100,
    });
    // Ela desce: o destino mora no fim do caminho.
    void animar(
      ov,
      [
        { transform: 'none', opacity: 1 },
        { transform: 'translateY(-10px)', opacity: 1, offset: 0.2 },
        { transform: 'translateY(48vh) scale(.7)', opacity: 0 },
      ],
      { duration: 760, delay: ENTRADA_MS - 620, easing: 'cubic-bezier(.5,0,.75,0)' },
    ).then(() => {
      setFim(true);
    });
  }, []);

  if (fim) return null;
  return (
    <div ref={ref} className="m-destino-intro" aria-hidden="true">
      <div className="m-fim-i">
        <svg viewBox="0 0 24 24">
          <path d={ESTRELA} />
        </svg>
      </div>
      <strong>
        {Array.from('Seu destino').map((c, i) => (
          <i key={i}>{c === ' ' ? '\u00a0' : c}</i>
        ))}
      </strong>
      <span>A aprovação na sua prova</span>
    </div>
  );
}

export function DestinoM() {
  const { entrada, falhou, fio } = useJornadaDoFio();
  const { etapasFeitas, passosDados, pousos } = fio.estado;
  const resumo = resumoDoMapa(entrada);
  const atual = materiaAtual(entrada);
  const foraDoMapa = entrada ? Math.max(0, entrada.materias.length - ORDEM_UF.length) : 0;
  // Sem a lei da matéria no app (ou sem artigo que caia nela) o número conta as etapas, que é o que o app sabe do caminho.
  const contaEtapas = resumo === undefined && entrada !== undefined && etapasFeitas > 0;

  // A primeira visita é a do aparelho; sem movimento a entrada não existe, mas a visita conta do mesmo jeito.
  const [intro] = useState(() => modoAgora() === 'normal' && !destinoJaVisto());
  const atraso = intro ? ENTRADA_MS : 0;
  useEffect(() => {
    marcarDestinoVisto();
  }, []);

  // O resto da tela sobe um pouco, um depois do outro, enquanto a estrela escreve o destino (o mapa vem por último).
  const olho = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!intro) return;
    const tela = olho.current?.parentElement;
    if (!tela) return;
    tela.scrollTop = 0;
    [...tela.children]
      .filter((c) => c.id !== 'm-destino' && !c.classList.contains('m-so-leitor'))
      .forEach((c, i) => {
        void animarEDeixar(
          c,
          [
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 520, delay: ENTRADA_MS - 150 + i * 60, easing: SAIR },
        );
      });
  }, [intro]);

  const texto = resumo
    ? `do que mais cai em ${resumo.nome} já é seu. Cada ponto é um artigo que cai; os maiores caem mais. O fio liga um ao outro até o seu destino.`
    : contaEtapas
      ? `${etapasFeitas === 1 ? 'pousada' : 'pousadas'} no caminho, com ${plural(passosDados, 'passo dado', 'passos dados')}.${
          atual
            ? ` Quando ${atual.nome} tiver a lei no app, o mapa passa a contar quanto do que mais cai já é seu.`
            : ''
        }`
      : entrada?.materias.length === 0
        ? 'Escolha a sua prova no Agora para dar a cada estado uma matéria.'
        : entrada === undefined
          ? 'do que cai na prova já é seu. Cada ponto é um artigo que cai; os maiores caem mais. O fio liga um ao outro até o seu destino.'
          : 'Cada etapa que pousa abre um lugar no caminho. Puxe o fio no Agora para o primeiro.';

  return (
    <TelaM nome="mapa" className="m-com-nav">
      <h1 className="m-so-leitor">Destino</h1>
      <span ref={olho} className="m-olho">
        Linha do destino · sua prova
      </span>
      {contaEtapas ? (
        <div className="m-numero">
          {etapasFeitas}
          <small> {etapasFeitas === 1 ? 'etapa' : 'etapas'}</small>
        </div>
      ) : (
        <NumeroM alvo={resumo?.percentual ?? 0} atraso={atraso} />
      )}
      <p className="m-quieto" style={{ marginTop: 6 }}>
        {texto}
      </p>
      {/* A legenda explica os pontos, então vem antes do mapa (desvio 35): depois dele, em 360 de largura, caía no pé do quadro, atrás da pílula. */}
      <div className="m-legenda-mapa">
        <span>
          <i />
          pela frente
        </span>
        <span>
          <i className="m-l2" />
          já é seu
        </span>
        {foraDoMapa > 0 && <span>O mapa mostra as nove primeiras matérias do seu Ciclo.</span>}
      </div>
      {falhou ? (
        <p className="m-quieto" role="alert">
          Não deu para abrir o mapa agora. Tente de novo em instantes.
        </p>
      ) : (
        <MapaM entrada={entrada} intro={intro} atraso={atraso} />
      )}
      {pousos.length > 0 && (
        <ol className="m-so-leitor" aria-label="Seus pousos, do mais recente ao mais antigo">
          {pousos.map((p) => (
            <li key={p.etapa}>
              Etapa {String(p.etapa + 1)}, {p.materia}
              {p.fatos.length > 0 ? `: ${p.fatos.join(', ')}` : ''}
            </li>
          ))}
        </ol>
      )}
      {intro && <IntroDoDestino />}
    </TelaM>
  );
}
