// O mapa do Destino (D-D25): o Nordeste de verdade, com uma matéria do Ciclo em cada estado, o caminho pelos
// municípios da pesquisa, os artigos que caem como pontos e uma porteira em cada divisa. A câmera abre o
// Nordeste inteiro e se aproxima de onde a pessoa está; arrastar passeia, a roda, o beliscão e os botões
// aproximam. Este arquivo é o único que importa o JSON do mapa, então ele e o desenho vão num pedaço à
// parte do pacote, carregado só quando a pessoa abre o Destino.
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { Link } from 'react-router';
import {
  LARGURA_DE_LONGE,
  enquadrar,
  escala,
  esconderSobrepostos,
  estimarLargura,
  type Caixa,
  type Camera,
  type RotuloEmTela,
} from './camera';
import { montarJornada, type EntradaDaJornada, type Jornada } from './jornada';
import dadosBrutos from './nordeste.json';
import type { DadosDoNordeste, LugarDoMapa } from './nordeste';
import { caminhoDoTrecho, posicaoDoLugar } from './trilha';
import { useCamera } from './useCamera';
import './fio-mapa.css';

const dados = dadosBrutos as unknown as DadosDoNordeste;

/**
 * As fichas dos lugares vêm da pesquisa da Marca e ainda esperam a conferência do Gabriel. Enquanto isto
 * for `false`, a ficha diz que é rascunho. Quando ele conferir, vira `true` e o aviso some.
 */
const FICHAS_CONFERIDAS = false as boolean;

/** Quanto do desenho cabe na caixa em torno da pessoa: cerca de um pixel por unidade, de um celular a um monitor. */
const larguraDeVoce = (caixa: Caixa) => Math.min(760, Math.max(380, Math.round(caixa.largura)));

/** A posição de uma marca no desenho; o CSS acha o lugar dela na tela pela câmera. */
const ponto = (x: number, y: number): CSSProperties => ({ '--x': x, '--y': y }) as CSSProperties;

type Regime = 'perto' | 'longe';

/** Um rótulo que pode ficar escondido para não cobrir outro. */
interface RotuloDoMapa {
  id: string;
  x: number;
  y: number;
  prioridade: number;
  regimes: readonly Regime[];
  /** Onde o rótulo fica em relação ao ponto, em pixels, e o quanto ocupa. */
  forma: (sx: number, sy: number) => Pick<RotuloEmTela, 'esq' | 'dir' | 'topo' | 'base'>;
}

/** Os rótulos do mapa em ordem de prioridade: quem fala de onde a pessoa está vence os demais. */
function rotulosDoMapa(jornada: Jornada, lugares: readonly LugarDoMapa[]): RotuloDoMapa[] {
  const rotulos: RotuloDoMapa[] = [];
  const ultimo = lugares.length - 1;
  const ambos: readonly Regime[] = ['perto', 'longe'];

  lugares.forEach((l, k) => {
    if (k === ultimo) return;
    const dono = jornada.estados.find((e) => e.uf === l.uf);
    if (!dono || !(dono.situacao === 'agora' || dono.situacao === 'seguinte' || dono.abertos > 0)) {
      return;
    }
    const aberto = jornada.abertos[k] === true;
    if (!aberto && dono.situacao !== 'agora') return;
    const comVoce = k === jornada.aqui;
    const larg = estimarLargura(l.n, 12, 0.6) + (comVoce ? 8 : 0);
    const esq = l.x > 1100;
    rotulos.push({
      id: `lugar-${String(k)}`,
      x: l.x,
      y: l.y,
      prioridade: comVoce ? 0 : aberto ? 3 : 5,
      regimes: ['perto'],
      forma: (sx, sy) =>
        esq
          ? { esq: sx - 14 - larg, dir: sx + 7, topo: sy - 10, base: sy + 10 }
          : { esq: sx - 7, dir: sx + 14 + larg, topo: sy - 10, base: sy + 10 },
    });
  });

  for (const p of jornada.portas) {
    if (p.de !== jornada.atual.uf && p.situacao === 'fechada') continue;
    const larg = estimarLargura(textoDaPorta(p.situacao), 12, 0.6);
    rotulos.push({
      id: `porta-${String(p.seg)}`,
      x: p.x,
      y: p.y,
      prioridade: 4,
      regimes: ['perto'],
      forma: (sx, sy) => ({ esq: sx + 18, dir: sx + 18 + larg, topo: sy - 9, base: sy + 9 }),
    });
  }

  for (const e of jornada.estados) {
    const [cx, cy] = dados.estados[e.uf].c;
    const dx = e.uf === 'MA' ? 40 : e.uf === 'BA' ? -30 : 0;
    const dy = e.uf === 'MA' ? 60 : 0;
    const larg = Math.max(
      estimarLargura(e.materia?.nome ?? '', 11, 0.82),
      estimarLargura(subtituloDoEstado(e, jornada), 11, 0.52),
    );
    // Longe, todos os nomes aparecem; perto, só os dos estados de sombra e livres (o CSS os deixa de marca-d'água).
    const fraco = e.situacao === 'sombra' || e.situacao === 'livre';
    rotulos.push({
      id: `uf-${e.uf}`,
      x: cx + dx,
      y: cy + dy,
      prioridade: e.situacao === 'agora' ? 3 : e.situacao === 'seguinte' ? 4 : 6,
      regimes: fraco ? ambos : ['longe'],
      forma: (sx, sy) => ({ esq: sx - larg / 2, dir: sx + larg / 2, topo: sy - 16, base: sy + 16 }),
    });
  }

  const fim = lugares[ultimo];
  if (fim) {
    // O elemento (estrela e texto) fica centrado no ponto; só o texto some quando não cabe, e a estrela fica.
    const larg = 34 + 8 + estimarLargura('A aprovação na sua prova', 11.5, 0.5);
    rotulos.push({
      id: 'fim',
      x: fim.x,
      y: fim.y,
      prioridade: 1,
      regimes: ambos,
      forma: (sx, sy) => ({
        esq: sx - larg / 2 + 42,
        dir: sx + larg / 2,
        topo: sy - 16,
        base: sy + 16,
      }),
    });
  }
  return rotulos.sort((a, b) => a.prioridade - b.prioridade);
}

const textoDaPorta = (situacao: Jornada['portas'][number]['situacao']) =>
  situacao === 'aberta' ? 'porteira aberta' : 'porteira';

function subtituloDoEstado(e: Jornada['estados'][number], jornada: Jornada): string {
  return e.situacao === 'agora' && jornada.total > 0
    ? `${e.nome} · ${String(jornada.total)} artigos`
    : e.nome;
}

const hrefDoLeitor = (normaId: string, endereco: string) =>
  `/biblioteca/normas/${normaId}?ir=${encodeURIComponent(endereco)}&foco=artigo&mapa=1`;

export function MapaDoNordeste({ entrada }: { entrada: EntradaDaJornada }) {
  const jornada = useMemo(() => montarJornada(dados, entrada), [entrada]);
  const lugares = dados.ordem;
  const idDaMascara = `ne-longe-${useId().replace(/\W/g, '')}`;
  const idDaDica = `ne-dica-${useId().replace(/\W/g, '')}`;

  const [ficha, setFicha] = useState<number>();
  const [aviso, setAviso] = useState('');
  const fichaRef = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (aviso === '') return;
    const espera = window.setTimeout(() => {
      setAviso('');
    }, 5000);
    return () => {
      window.clearTimeout(espera);
    };
  }, [aviso]);

  useEffect(() => {
    if (ficha !== undefined) fichaRef.current?.focus();
  }, [ficha]);

  const caminhos = useMemo(() => {
    const ultimo = lugares.length - 1;
    const nitida = caminhoDoTrecho(lugares, posicaoDoLugar(0), posicaoDoLugar(jornada.nitidaAte));
    const longe = caminhoDoTrecho(
      lugares,
      posicaoDoLugar(jornada.nitidaAte),
      posicaoDoLugar(ultimo),
    );
    const andado = jornada.andado.map(([de, ate]) => caminhoDoTrecho(lugares, de, ate)).join('');
    return { nitida, longe, andado };
  }, [jornada, lugares]);

  const rotulos = useMemo(() => rotulosDoMapa(jornada, lugares), [jornada, lugares]);

  const vistas = useCallback(
    (caixa: Caixa) => {
      const ultimo = lugares.length - 1;
      const aqui = Math.min(jornada.aqui, ultimo);
      const doCaminho = [aqui, Math.min(aqui + 1, ultimo), Math.min(aqui + 2, ultimo)].flatMap(
        (i) => lugares[i] ?? [],
      );
      return {
        todo: enquadrar(
          [
            { x: 20, y: 0 },
            { x: 1400, y: 1740 },
          ],
          10,
          caixa,
        ),
        // Num monitor a caixa é maior: a câmera mostra mais chão, não o mesmo chão mais perto.
        voce: enquadrar(doCaminho, 70, caixa, larguraDeVoce(caixa)),
      };
    },
    [jornada.aqui, lugares],
  );

  const aoAssentar = useCallback(
    (cam: Camera, caixa: Caixa, el: HTMLElement) => {
      const regime: Regime = cam.w > LARGURA_DE_LONGE ? 'longe' : 'perto';
      const k = escala(cam, caixa);
      const emTela: RotuloEmTela[] = rotulos
        .filter((r) => r.regimes.includes(regime))
        .map((r) => ({
          id: r.id,
          prioridade: r.prioridade,
          ...r.forma((r.x - cam.x) * k, (r.y - cam.y) * k),
        }));
      const escondidos = esconderSobrepostos(emTela, caixa);
      for (const n of el.querySelectorAll<HTMLElement>('[data-rot]')) {
        n.toggleAttribute('data-oculto', escondidos.has(n.dataset.rot ?? ''));
      }
    },
    [rotulos],
  );

  // Chegou um pouso com o mapa aberto: a câmera acompanha a pessoa até o lugar novo.
  const { caixaRef, desenhoRef, vista, alternar, aproximar, afastar, eventos } = useCamera({
    limites: { largura: dados.caixa[2], altura: dados.caixa[3] },
    vistas,
    aoAssentar,
    seguir: jornada.aqui,
  });

  const abrirFicha = (indice: number, el: HTMLElement) => {
    gatilho.current = el;
    setAviso('');
    setFicha(indice);
  };
  const fecharFicha = () => {
    setFicha(undefined);
    gatilho.current?.focus();
  };
  const aoTeclarNaFicha = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    fecharFicha();
  };

  const dosLugares = lugares.flatMap((l, k) => {
    if (k === lugares.length - 1) return [];
    const dono = jornada.estados.find((e) => e.uf === l.uf);
    if (!dono) return [];
    const aberto = jornada.abertos[k] === true;
    const visivel =
      dono.situacao === 'agora' || dono.situacao === 'seguinte' || dono.abertos > 0 || aberto;
    return visivel ? [{ l, k, dono, aberto }] : [];
  });
  const lugarDaFicha = ficha === undefined ? undefined : lugares[ficha];
  const aqui = lugares[jornada.aqui];
  const ultimoLugar = lugares[lugares.length - 1];

  return (
    <div
      ref={caixaRef}
      className="fio-mapa"
      role="group"
      aria-label="Mapa do caminho pelo Nordeste"
      aria-describedby={idDaDica}
      tabIndex={0}
      {...eventos}
    >
      <p id={idDaDica} className="visualmente-oculto">
        Arraste para passear. A roda do mouse e os botões aproximam e afastam. Com o foco no mapa,
        as setas andam, mais e menos aproximam e afastam, e zero volta para você.
      </p>

      <svg ref={desenhoRef} className="ne-svg" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient
            id={`${idDaMascara}-g`}
            gradientUnits="userSpaceOnUse"
            cx="720"
            cy="900"
            r="1050"
          >
            <stop offset=".5" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
          <mask
            id={idDaMascara}
            maskUnits="userSpaceOnUse"
            x="-3000"
            y="-3000"
            width="8000"
            height="8000"
          >
            <rect x="-3000" y="-3000" width="8000" height="8000" fill={`url(#${idDaMascara}-g)`} />
          </mask>
        </defs>
        <g className="ne-resto" mask={`url(#${idDaMascara})`}>
          {dados.resto.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g className="ne-estados">
          {jornada.estados.map((e) => (
            <path key={e.uf} className={`ne-uf uf-${e.situacao}`} d={dados.estados[e.uf].d} />
          ))}
        </g>
        <path className="ne-trilha-halo" d={caminhos.nitida} />
        <path className="ne-tracejado" d={caminhos.nitida} />
        <path className="ne-tracejado longe" d={caminhos.longe} />
        {caminhos.andado !== '' && (
          <>
            <path className="ne-andado-brilho" d={caminhos.andado} pathLength={1} />
            <path className="ne-andado" d={caminhos.andado} pathLength={1} />
          </>
        )}
      </svg>
      <div className="ne-grao" aria-hidden="true" />

      <div className="ne-marcas">
        {jornada.estados.map((e) => {
          const [cx, cy] = dados.estados[e.uf].c;
          const dx = e.uf === 'MA' ? 40 : e.uf === 'BA' ? -30 : 0;
          const dy = e.uf === 'MA' ? 60 : 0;
          return (
            <div
              key={e.uf}
              className={`ne-rotulo uf-${e.situacao}`}
              data-rot={`uf-${e.uf}`}
              style={ponto(cx + dx, cy + dy)}
            >
              {e.materia && <b>{e.materia.nome}</b>}
              <span>{subtituloDoEstado(e, jornada)}</span>
            </div>
          );
        })}

        {jornada.estrelas.map((s) => (
          <Link
            key={`${s.artigo.normaId}-${s.artigo.endereco}`}
            to={hrefDoLeitor(s.artigo.normaId, s.artigo.endereco)}
            className={s.artigo.lido ? 'estrela-art lido' : 'estrela-art'}
            style={{ ...ponto(s.x, s.y), width: s.tam, height: s.tam }}
            aria-label={`${s.artigo.rotulo}${s.artigo.lido ? ', já lido' : ''}: abrir no Leitor`}
          />
        ))}

        {jornada.portas.map((p) => {
          const comRotulo = p.de === jornada.atual.uf || p.situacao !== 'fechada';
          const nome = p.materia?.nome ?? 'uma matéria que ainda não está no Ciclo';
          const quando =
            p.situacao === 'aberta'
              ? ': aberta'
              : p.situacao === 'pronta'
                ? ': pronta para você'
                : '';
          return (
            <Fragment key={`porta-${String(p.seg)}`}>
              <button
                type="button"
                className={`porteira ${p.situacao}`}
                style={ponto(p.x, p.y)}
                aria-label={`Porteira de ${nome}${quando}`}
                onClick={() => {
                  setFicha(undefined);
                  setAviso(
                    p.situacao === 'aberta'
                      ? `Porteira aberta. O caminho segue para ${dados.estados[p.para].nome}.`
                      : p.situacao === 'pronta'
                        ? `Porteira pronta. Ela aparece num passo seu de ${nome}.`
                        : p.materia
                          ? `Essa porteira fica pronta quando você ler o que mais cai em ${nome}.`
                          : 'Essa porteira é de uma matéria que ainda não está no seu Ciclo.',
                  );
                }}
              />
              {comRotulo && (
                <span
                  className={`rotulo-porteira${p.situacao === 'pronta' ? ' pronta' : ''}`}
                  data-rot={`porta-${String(p.seg)}`}
                  style={ponto(p.x, p.y)}
                  aria-hidden="true"
                >
                  {textoDaPorta(p.situacao)}
                </span>
              )}
            </Fragment>
          );
        })}

        {dosLugares.map(({ l, k, dono, aberto }) => {
          const comVoce = k === jornada.aqui;
          const classe = [
            'ne-lugar',
            aberto ? 'aberto' : dono.situacao === 'agora' ? 'fechado' : 'longe',
            l.x > 1100 ? 'esq' : '',
            comVoce ? 'com-voce' : '',
          ]
            .filter(Boolean)
            .join(' ');
          const mostraNome = aberto || dono.situacao === 'agora';
          return (
            <button
              key={`${l.uf}-${l.n}`}
              type="button"
              className={classe}
              style={ponto(l.x, l.y)}
              aria-label={
                aberto
                  ? `${l.n}, ${l.uf}${comVoce ? ', você está aqui' : ''}: abrir a ficha`
                  : `${l.n}: abre num pouso`
              }
              onClick={(e) => {
                if (aberto) abrirFicha(k, e.currentTarget);
                else {
                  setFicha(undefined);
                  setAviso(`${l.n} se abre num pouso, quando o fio passar por lá.`);
                }
              }}
            >
              <i />
              {mostraNome && <span data-rot={`lugar-${String(k)}`}>{l.n}</span>}
            </button>
          );
        })}

        {aqui && <div className="no-aqui" style={ponto(aqui.x, aqui.y)} aria-hidden="true" />}

        {ultimoLugar && (
          <button
            type="button"
            className="ne-fim"
            style={ponto(ultimoLugar.x, ultimoLugar.y)}
            onClick={() => {
              setFicha(undefined);
              setAviso(
                `${ultimoLugar.n}: a chegada. O caminho até lá vai clareando conforme você anda.`,
              );
            }}
          >
            <i>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.5l2.6 6.2 6.7.6-5.1 4.4 1.6 6.6L12 16.8l-5.8 3.5 1.6-6.6-5.1-4.4 6.7-.6z" />
              </svg>
            </i>
            <span data-rot="fim">
              <b>Seu destino</b>A aprovação na sua prova
            </span>
          </button>
        )}
      </div>

      <button type="button" className="ne-vista" onClick={alternar}>
        {vista === 'voce' ? 'Ver o Nordeste' : 'Voltar para você'}
      </button>
      <div className="ne-zoom">
        <button type="button" aria-label="Afastar" onClick={afastar}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>
        <button type="button" aria-label="Aproximar" onClick={aproximar}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {lugarDaFicha && (
        <div
          ref={fichaRef}
          className="ne-ficha"
          role="region"
          aria-label={`Ficha de ${lugarDaFicha.n}`}
          tabIndex={-1}
          onKeyDown={aoTeclarNaFicha}
        >
          <button type="button" className="fecha" aria-label="Fechar a ficha" onClick={fecharFicha}>
            ×
          </button>
          <span className="olho">
            {lugarDaFicha.n} · {lugarDaFicha.uf}
          </span>
          <p>{lugarDaFicha.porque}</p>
          {lugarDaFicha.caso !== undefined && <small>{lugarDaFicha.caso}</small>}
          {!FICHAS_CONFERIDAS && <em>Rascunho da pesquisa, a conferir antes de entrar no app</em>}
        </div>
      )}

      <p className="ne-aviso" role="status">
        {aviso}
      </p>
    </div>
  );
}
