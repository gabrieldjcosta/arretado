// O mapa do Destino na caixa do mockup aprovado (`tracarDestino`): o Nordeste de verdade, uma matéria do Ciclo em cada
// estado, o caminho pelos municípios da pesquisa, os artigos que caem como pontos e uma porteira em cada divisa. A
// câmera abre o Nordeste inteiro e, passada a entrada, voa até onde a pessoa está; arrastar passeia, a roda e o
// beliscão aproximam. O desenho, as marcas e os tempos são os do mockup, com as classes dele (prefixo `m-`); o que o
// app sabe de verdade (jornada, artigos lidos, porteiras) entra no lugar dos números de exemplo, e o que o app
// acrescenta está nos desvios 29 a 34 de `docs/design/desvios.md` (o 29, o 33 e o 34, os do CSS, em `mockup/ajustes.css`).
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { Link } from 'react-router';
import { LARGURA_DE_LONGE, enquadrar, type Caixa, type Camera } from '../destino/camera';
import {
  montarJornada,
  type EntradaDaJornada,
  type Jornada,
  type SituacaoDoEstado,
} from '../destino/jornada';
import dadosBrutos from '../destino/nordeste.json';
import type { DadosDoNordeste, LugarDoMapa } from '../destino/nordeste';
import { caminhoDoTrecho, posicaoDoLugar } from '../destino/trilha';
import { animar, animarEDeixar, modoAgora, MOLA, SAIR } from './anima';
import { esconderOQueSeCobre } from './mapa-cobertura';
import { avisar } from './toast';
import { useCameraM } from './useCameraM';

const dados = dadosBrutos as unknown as DadosDoNordeste;

/**
 * As fichas dos lugares vêm da pesquisa da Marca e ainda esperam a conferência do Gabriel. Enquanto isto for `false`, a
 * ficha diz que é rascunho (o mockup também diz). Quando ele conferir, vira `true` e o aviso some.
 */
const FICHAS_CONFERIDAS = false as boolean;

/** A posição de uma marca no desenho; o CSS acha o lugar dela na tela pela câmera (desvio 29 de `ajustes.css`). */
const ponto = (x: number, y: number): CSSProperties => ({ '--x': x, '--y': y }) as CSSProperties;

/** A classe do estado no desenho: o mockup chama de `feito` o que a pessoa já andou e de `sombra` o que está longe. */
const CLASSE_DO_ESTADO: Record<SituacaoDoEstado, string> = {
  agora: 'm-uf-agora',
  seguinte: 'm-uf-seguinte',
  visitado: 'm-uf-feito',
  sombra: 'm-uf-sombra',
  livre: 'm-uf-sombra',
};

/** O rótulo fica do lado esquerdo do ponto nos lugares da costa leste e em dois que o mockup vira à mão. */
const ficaNaEsquerda = (l: LugarDoMapa) =>
  l.x > 1100 || l.n === 'Barreirinhas' || l.n === 'Fortaleza';

const textoDaPorta = (situacao: Jornada['portas'][number]['situacao']) =>
  situacao === 'aberta' ? 'porteira aberta' : 'porteira';

const subtituloDoEstado = (e: Jornada['estados'][number], jornada: Jornada) =>
  e.situacao === 'agora' && jornada.total > 0
    ? `${e.nome} · ${String(jornada.total)} artigos`
    : e.nome;

const hrefDoLeitor = (normaId: string, endereco: string) =>
  `/biblioteca/normas/${normaId}?ir=${encodeURIComponent(endereco)}&foco=artigo&mapa=1`;

/** A caixa já vem na largura do monitor? Então a câmera em torno da pessoa mostra mais chão (o mockup: 620, senão 380). */
const larguraDeVoce = (caixa: Caixa) => (caixa.largura > 600 ? 620 : 380);

export function MapaM({
  entrada,
  intro,
  atraso,
}: {
  /** O que o app sabe do estudo; sem ele a caixa mostra só o mar. */
  entrada: EntradaDaJornada | undefined;
  /** É a primeira vez neste aparelho: a caixa se revela de cima, depois de `atraso`. */
  intro: boolean;
  /** Quanto a entrada segura o mapa, em ms (o `D0` do mockup: 2350 na primeira visita, 0 depois). */
  atraso: number;
}) {
  const jornada = useMemo(() => (entrada ? montarJornada(dados, entrada) : undefined), [entrada]);
  const lugares = dados.ordem;
  const idDaDica = `ne-dica-${useId().replace(/\W/g, '')}`;
  const aqui = jornada?.aqui ?? 0;
  const pronto = jornada !== undefined;

  const [ficha, setFicha] = useState<number>();
  const fichaRef = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLElement | null>(null);

  const caminhos = useMemo(() => {
    if (!jornada) return undefined;
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

  const vistas = useCallback(
    (caixa: Caixa) => {
      const ultimo = lugares.length - 1;
      const aquiNoMapa = Math.min(aqui, ultimo);
      const doCaminho = [
        aquiNoMapa,
        Math.min(aquiNoMapa + 1, ultimo),
        Math.min(aquiNoMapa + 2, ultimo),
      ].flatMap((i) => lugares[i] ?? []);
      return {
        todo: enquadrar(
          [
            { x: 20, y: 0 },
            { x: 1400, y: 1740 },
          ],
          10,
          caixa,
        ),
        voce: enquadrar(doCaminho, 70, caixa, larguraDeVoce(caixa)),
      };
    },
    [aqui, lugares],
  );

  const aoPosicionar = useCallback((cam: Camera, _caixa: Caixa, el: HTMLElement) => {
    const camada = el.querySelector('.m-ne-marcas');
    if (camada) esconderOQueSeCobre(camada, cam.w > LARGURA_DE_LONGE);
  }, []);

  const { caixaRef, desenhoRef, vista, alternar, reposicionar, eventos } = useCameraM({
    pronto,
    limites: { largura: dados.caixa[2], altura: dados.caixa[3] },
    vistas,
    aoPosicionar,
    seguir: aqui,
    atraso,
  });

  // Veio outra leitura dos dados (um pouso, uma porteira): as marcas novas ainda não passaram pelo teste de quem se cobre.
  useLayoutEffect(() => {
    if (pronto) reposicionar();
  }, [jornada, pronto, reposicionar]);

  // A entrada do mockup: a caixa se revela de cima (só na primeira visita); o "você está aqui" pula e o caminho que a
  // pessoa já andou se desenha, os dois depois que a entrada acaba.
  useLayoutEffect(() => {
    if (!intro) return;
    void animarEDeixar(
      caixaRef.current,
      [
        { clipPath: 'inset(0 0 100% 0)', opacity: 0.3 },
        { clipPath: 'inset(0 0 72% 0)', opacity: 1, offset: 0.45 },
        { clipPath: 'inset(0 0 0% 0)', opacity: 1 },
      ],
      { duration: 2600, delay: atraso, easing: 'cubic-bezier(.3,.1,.3,1)' },
    );
  }, [intro, atraso, caixaRef]);

  useLayoutEffect(() => {
    if (!pronto || modoAgora() !== 'normal') return;
    const caixa = caixaRef.current;
    if (!caixa) return;
    void animar(
      caixa.querySelector('.m-no-aqui'),
      [
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
      ],
      { duration: 600, delay: 400 + atraso, easing: MOLA },
    );
    for (const p of caixa.querySelectorAll<SVGPathElement>('.m-andado, .m-andado-b')) {
      p.style.strokeDasharray = '1 1';
      void animar(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
        duration: 900,
        delay: 1500 + atraso,
        easing: 'cubic-bezier(.2,.7,.2,1)',
      });
    }
  }, [pronto, atraso, caixaRef]);

  // A ficha abre com o foco nela: o teclado e o leitor de tela seguem de lá.
  useEffect(() => {
    if (ficha === undefined) return;
    fichaRef.current?.focus({ preventScroll: true });
    if (modoAgora() !== 'reduzido') {
      void animar(
        fichaRef.current,
        [
          { opacity: 0, transform: 'translateY(12px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 320, easing: SAIR },
      );
    }
  }, [ficha]);

  const abrirFicha = (indice: number, el: HTMLElement) => {
    gatilho.current = el;
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

  const indiceAtual = jornada ? jornada.estados.indexOf(jornada.atual) : 0;
  const lugarDaFicha = ficha === undefined ? undefined : lugares[ficha];
  const aquiLugar = lugares[aqui];
  const ultimoLugar = lugares[lugares.length - 1];

  // Como no mockup, só os lugares e as porteiras do estado de agora, dos de trás e do seguinte entram.
  const dosLugares = jornada
    ? lugares.flatMap((l, k) => {
        if (k === lugares.length - 1) return [];
        const dono = jornada.estados.find((e) => e.uf === l.uf);
        if (!dono || jornada.estados.indexOf(dono) > indiceAtual + 1) return [];
        return [{ l, k, dono, aberto: jornada.abertos[k] === true }];
      })
    : [];
  const dasPortas = jornada
    ? jornada.portas.filter(
        (p) => jornada.estados.findIndex((e) => e.uf === p.de) <= indiceAtual + 1,
      )
    : [];

  return (
    <div
      ref={caixaRef}
      id="m-destino"
      className="m-destino m-ne"
      role="group"
      aria-label="Mapa do caminho pelo Nordeste"
      aria-describedby={idDaDica}
      aria-busy={!pronto}
      tabIndex={0}
      {...eventos}
    >
      <p id={idDaDica} className="m-so-leitor">
        Arraste para passear. A roda do mouse e o beliscão aproximam e afastam. Com o foco no mapa,
        as setas andam, mais e menos aproximam e afastam, e zero volta para você.
      </p>

      {jornada && caminhos && (
        <>
          <svg ref={desenhoRef} className="m-ne-svg" aria-hidden="true" focusable="false">
            <g className="m-ne-resto" mask="url(#m-ne-longe)">
              {dados.resto.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <g className="m-ne-estados">
              {jornada.estados.map((e) => (
                <path
                  key={e.uf}
                  className={`m-ne-uf ${CLASSE_DO_ESTADO[e.situacao]}`}
                  d={dados.estados[e.uf].d}
                />
              ))}
            </g>
            <g className="m-territorio-grao">
              {jornada.estados.map((e) => (
                <path key={e.uf} d={dados.estados[e.uf].d} />
              ))}
            </g>
            <path className="m-trilha-halo" d={caminhos.nitida} />
            <path className="m-tracejado" d={caminhos.nitida} />
            <path className="m-tracejado m-longe" d={caminhos.longe} />
            {caminhos.andado !== '' && (
              <>
                <path className="m-andado-b m-brilho" d={caminhos.andado} pathLength={1} />
                <path className="m-andado" d={caminhos.andado} pathLength={1} />
              </>
            )}
          </svg>

          <div className="m-ne-marcas">
            {jornada.estados.map((e) => {
              const [cx, cy] = dados.estados[e.uf].c;
              const dx = e.uf === 'MA' ? 40 : e.uf === 'BA' ? -30 : 0;
              const dy = e.uf === 'MA' ? 60 : 0;
              return (
                <div
                  key={e.uf}
                  className={`m-ne-rotulo ${CLASSE_DO_ESTADO[e.situacao]}`}
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
                className={s.artigo.lido ? 'm-estrela-art m-lido' : 'm-estrela-art'}
                style={{ ...ponto(s.x, s.y), width: s.tam, height: s.tam }}
                aria-label={`${s.artigo.rotulo}${s.artigo.lido ? ', já lido' : ''}: abrir no Leitor`}
              />
            ))}

            {dasPortas.map((p) => {
              const nome = p.materia?.nome ?? 'uma matéria que ainda não está no Ciclo';
              const quando =
                p.situacao === 'aberta'
                  ? ': aberta'
                  : p.situacao === 'pronta'
                    ? ': pronta para você'
                    : '';
              return (
                <Porteira
                  key={`porta-${String(p.seg)}`}
                  situacao={p.situacao}
                  x={p.x}
                  y={p.y}
                  rotulo={`Porteira de ${nome}${quando}`}
                  aoTocar={() => {
                    avisar(
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
              );
            })}

            {dosLugares.map(({ l, k, dono, aberto }) => {
              const comVoce = k === aqui;
              const classe = [
                'm-ne-lugar',
                aberto ? 'm-aberto' : dono.situacao === 'agora' ? 'm-fechado' : 'm-longe',
                ficaNaEsquerda(l) ? 'm-esq' : '',
                comVoce ? 'm-com-voce' : '',
              ]
                .filter(Boolean)
                .join(' ');
              const comNome = aberto || dono.situacao === 'agora';
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
                      avisar(`${l.n} se abre num pouso, quando o fio passar por lá.`);
                    }
                  }}
                >
                  <i />
                  {comNome && <span>{l.n}</span>}
                </button>
              );
            })}

            {aquiLugar && (
              <div
                className="m-no-aqui"
                style={ponto(aquiLugar.x, aquiLugar.y)}
                aria-hidden="true"
              />
            )}

            {ultimoLugar && (
              <button
                type="button"
                className="m-ne-fim"
                style={ponto(ultimoLugar.x, ultimoLugar.y)}
                onClick={() => {
                  setFicha(undefined);
                  avisar(
                    `${ultimoLugar.n}: a chegada. O caminho até lá vai clareando conforme você anda.`,
                  );
                }}
              >
                <i>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.5l2.6 6.2 6.7.6-5.1 4.4 1.6 6.6L12 16.8l-5.8 3.5 1.6-6.6-5.1-4.4 6.7-.6z" />
                  </svg>
                </i>
                <span>
                  <b>Seu destino</b>A aprovação na sua prova
                </span>
              </button>
            )}
          </div>

          <button type="button" className="m-ne-vista" onClick={alternar}>
            {vista === 'voce' ? 'Ver o Nordeste' : 'Voltar para você'}
          </button>

          {lugarDaFicha && (
            <div
              ref={fichaRef}
              className="m-ne-ficha"
              role="region"
              aria-label={`Ficha de ${lugarDaFicha.n}`}
              tabIndex={-1}
              onKeyDown={aoTeclarNaFicha}
            >
              <button
                type="button"
                className="m-fecha"
                aria-label="Fechar a ficha"
                onClick={fecharFicha}
              >
                ×
              </button>
              <span className="m-olho">
                {lugarDaFicha.n} · {lugarDaFicha.uf}
              </span>
              <p>{lugarDaFicha.porque}</p>
              {lugarDaFicha.caso !== undefined && <small>{lugarDaFicha.caso}</small>}
              {!FICHAS_CONFERIDAS && (
                <em>Rascunho da pesquisa, a conferir antes de entrar no app</em>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Uma porteira na divisa: o losango e, ao lado, o nome (que o mockup escreve junto de cada uma). */
function Porteira({
  situacao,
  x,
  y,
  rotulo,
  aoTocar,
}: {
  situacao: Jornada['portas'][number]['situacao'];
  x: number;
  y: number;
  rotulo: string;
  aoTocar: () => void;
}) {
  const marca = situacao === 'aberta' ? ' m-aberta' : situacao === 'pronta' ? ' m-pronta' : '';
  return (
    <>
      <button
        type="button"
        className={`m-porteira${marca}`}
        style={ponto(x, y)}
        aria-label={rotulo}
        onClick={aoTocar}
      />
      <span
        className={`m-rotulo-porteira${situacao === 'pronta' ? ' m-pronta' : ''}`}
        style={ponto(x, y)}
        aria-hidden="true"
      >
        {textoDaPorta(situacao)}
      </span>
    </>
  );
}
