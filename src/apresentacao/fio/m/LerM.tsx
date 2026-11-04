import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { CategoriaDestaque } from '../../../dominios/legislacao/destaques';
import { abrirNorma } from '../../../dominios/legislacao/leitor';
import { registrarArtigosFeitos } from '../../biblioteca/mapa/feitos';
import { useRepositorio } from '../../dados/contexto';
import {
  LEGENDA_DA_CATEGORIA,
  leiDoPasso,
  legendaFinal,
  type ParagrafoDaLei,
} from '../passos/lei-do-passo';
import { useCargaDoPasso } from '../passos/carregar';
import { animar, espera, modoAgora, useSinal } from './anima';
import { CartaoM } from './CartaoM';
import { BotaoPular, BotaoSeguir, ChipSeguir } from './BotoesM';
import { GestoM, SetaM } from './IconesM';
import type { PropsDoPassoM, Variante } from './passo-tipos';

type PassoLer = Extract<Variante<'ler'>, { normaId: string }>;

/** Um dispositivo da lei, com os grifos como `<span class="grifo">` numerados para acender em ordem. */
function Paragrafo({ p, primeiro }: { p: ParagrafoDaLei; primeiro: number }) {
  const partes: ReactNode[] = [];
  let pos = 0;
  p.grifos.forEach((g, i) => {
    if (g.inicio > pos) partes.push(p.texto.slice(pos, g.inicio));
    partes.push(
      <span key={i} className="m-grifo" data-g={primeiro + i} data-c={g.categoria}>
        {p.texto.slice(g.inicio, g.fim)}
      </span>,
    );
    pos = g.fim;
  });
  partes.push(p.texto.slice(pos));
  return (
    <p>
      <span className="m-art">{p.rotulo}.</span> {partes}
    </p>
  );
}

/**
 * O passo Ler, a tela `ler` do mockup: a lei no cartão, e o app a grifa na frente da pessoa, um trecho de
 * cada vez, com a legenda dizendo o que está grifando. Depois, "Pronto, li" (ou arrastar o cartão).
 */
export function LerM({
  passo,
  d,
  materia,
  trilho,
  aoConcluir,
  aoPular,
  aoPausar,
}: PropsDoPassoM<PassoLer>) {
  const repo = useRepositorio();
  const chave = `ler|${passo.normaId}|${passo.artigos.map((a) => a.endereco).join(',')}`;
  const carga = useCargaDoPasso(chave, (r) => leiDoPasso(r, passo));
  const lei = useRef<HTMLDivElement>(null);
  const [legenda, setLegenda] = useState('');
  const sinal = useSinal();
  const paragrafos = carga.estado === 'pronto' ? carga.dados : undefined;

  // O app grifa a lei na frente da pessoa (o `ler()` do mockup): espera um instante, acende um grifo de cada
  // vez e atualiza a legenda quando a categoria muda. O tempo por grifo encolhe quando são muitos.
  useEffect(() => {
    const raiz = lei.current;
    if (!paragrafos || !raiz) return;
    const grifos = [...raiz.querySelectorAll<HTMLElement>('.m-grifo')].sort(
      (a, b) => Number(a.dataset.g) - Number(b.dataset.g),
    );
    const categorias = new Set<CategoriaDestaque>(
      grifos.map((g) => g.dataset.c as CategoriaDestaque),
    );
    const final = legendaFinal(categorias);
    const modo = modoAgora();
    if (modo === 'reduzido' || grifos.length === 0) {
      grifos.forEach((g) => {
        g.classList.add('m-aceso');
      });
      setLegenda(final);
      return;
    }
    const calmo = modo === 'calmo';
    const passoMs = calmo ? 150 : Math.max(120, Math.min(330, 2600 / grifos.length));
    grifos.forEach((g) => {
      g.style.transition = 'none';
    });
    void (async () => {
      await espera(450, sinal());
      let ultima: string | undefined;
      for (const g of grifos) {
        if (sinal().aborted) return;
        g.style.transition = calmo
          ? 'none'
          : 'background-size 420ms cubic-bezier(.2,.7,.2,1), color 180ms';
        g.classList.add('m-aceso');
        if (calmo) void animar(g, [{ opacity: 0.3 }, { opacity: 1 }], { duration: 240 });
        const categoria = g.dataset.c as CategoriaDestaque;
        if (categoria !== ultima) {
          ultima = categoria;
          setLegenda(LEGENDA_DA_CATEGORIA[categoria]);
        }
        await espera(passoMs, sinal());
      }
      if (!sinal().aborted) setLegenda(final);
    })();
    // O sinal é uma função estável do hook; os grifos só mudam com o texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paragrafos]);

  /** "Li": o que a pessoa leu no cartão entra pelo mesmo caminho do Leitor no modo mapa. */
  const concluir = async () => {
    try {
      const aberta = await abrirNorma(repo, passo.normaId);
      const enderecos = new Set(passo.artigos.map((a) => a.endereco));
      const ids = aberta.nos
        .filter((no) => enderecos.has(no.dispositivo.endereco))
        .map((no) => no.dispositivo.id);
      registrarArtigosFeitos(passo.normaId, ids);
    } catch {
      /* a norma sumiu: o passo fecha mesmo assim, só não conta na cobertura */
    }
    aoConcluir({ tipo: 'ler', lidos: passo.artigos.length });
  };

  const primeiro = passo.artigos[0];
  let acumulado = 0;
  return (
    <CartaoM
      nome="ler"
      etiqueta={`Ler · ${materia}`}
      carimbo="LI"
      resolvido
      aoSeguir={() => void concluir()}
      aoPular={aoPular}
      aoPausar={aoPausar}
      trilho={trilho}
    >
      <>
        <p className="m-porque" style={{ marginTop: 2 }}>
          <span className="m-ponto-azul" />
          {d.apoio}
        </p>
        <div className="m-lei" ref={lei}>
          {carga.estado === 'carregando' && <p>…</p>}
          {carga.estado === 'falhou' && (
            <p>Não deu para abrir o artigo agora. Você ainda pode seguir.</p>
          )}
          {paragrafos?.map((p) => {
            const primeiroDele = acumulado;
            acumulado += p.grifos.length;
            return <Paragrafo key={p.chave} p={p} primeiro={primeiroDele} />;
          })}
        </div>
        <p className="m-legenda" aria-live="polite">
          {legenda}
        </p>
        {primeiro && (
          <Link
            className="m-chip"
            style={{ alignSelf: 'flex-start', marginTop: 10 }}
            to={`/biblioteca/normas/${passo.normaId}?ir=${encodeURIComponent(primeiro.endereco)}&foco=artigo&mapa=1`}
          >
            Abrir no Leitor
          </Link>
        )}
        <div className="m-vazio" />
        <div className="m-rodape-cartao">
          <BotaoPular />
          <BotaoSeguir>Pronto, li</BotaoSeguir>
        </div>
        <div className="m-dica-gesto">
          <GestoM />
          arraste o cartão pro lado
        </div>
      </>
    </CartaoM>
  );
}

/** O Ler de uma matéria sem lei no app: "Adicionar a lei desta matéria" (regra 3 do gerador). */
export function LerSemLeiM({
  d,
  materia,
  trilho,
  aoConcluir,
  aoPular,
  aoPausar,
}: PropsDoPassoM<Extract<Variante<'ler'>, { adicionarNorma: true }>>) {
  return (
    <CartaoM
      nome="ler"
      etiqueta={`Ler · ${materia}`}
      carimbo="FEITO"
      resolvido={false}
      aoSeguir={() => {
        aoConcluir({ tipo: 'ler', lidos: 0 });
      }}
      aoPular={aoPular}
      aoPausar={aoPausar}
      trilho={trilho}
    >
      <>
        <h2 style={{ margin: '4px 0 6px' }}>{d.titulo}</h2>
        <p className="m-quieto">{d.apoio}</p>
        <div className="m-vazio" />
        <div className="m-rodape-cartao">
          <BotaoPular />
          <Link to="/biblioteca/acervo" className="m-acao">
            Escolher a lei
            <SetaM />
          </Link>
        </div>
        <ChipSeguir>Já adicionei</ChipSeguir>
      </>
    </CartaoM>
  );
}
