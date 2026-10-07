import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import type { Leitura, Marcacao, TextoDeDispositivo } from '../../core/modelo';
import { alterarPreferencias, obterPreferencias } from '../../core/preferencias';
import type { Repositorio } from '../../core/persistencia';
import { prepararBusca } from '../../dominios/legislacao/busca';
import {
  abrirNorma,
  lerJanela,
  NormaIndisponivel,
  type ItemDaJanela,
  type NormaAberta,
} from '../../dominios/legislacao/leitor';
import { gravarPosicao, marcarLidoAte, obterLeitura } from '../../dominios/legislacao/leituras';
import { SO_VETADO } from '../../dominios/legislacao/redacoes';
import { Esqueleto, Falha } from '../componentes/estados';
import { teclaForaDosAtalhos } from '../componentes/teclado';
import { useDados, useRepositorio } from '../dados/contexto';
import { BuscaNaNorma, type TextosDaBusca } from './BuscaNaNorma';
import { pedacosDoTexto, type MarcasDoTexto } from './destacar';
import { LegendaDestaques } from './LegendaDestaques';
import { AcoesDaSelecao, AcoesDoGrifo, DialogoDaNota } from './Marcacoes';
import {
  ATRIBUTO_FORA_DO_TEXTO,
  CLASSE_DO_TEXTO,
  lerSelecao,
  type SelecaoNoTexto,
} from './selecao';
import { marcasDoTexto, useMarcacoes } from './usarMarcacoes';
import {
  estimarAltura,
  janelasQueCobrem,
  linhaDoNo,
  montarLinhas,
  referenciaDoNo,
  TEXTOS_POR_PEDIDO,
  type LinhaDoLeitor,
} from './linhas';

/** Nós além da borda da tela cujos textos já vêm: o texto chega antes de a linha aparecer. */
const MARGEM_DE_TEXTOS = 60;
/** Linhas desenhadas além da borda da tela. */
const LINHAS_DE_MARGEM = 8;
const TAMANHO_MINIMO = 12;
const TAMANHO_MAXIMO = 32;
const PASSO_DO_TAMANHO = 2;
const TAMANHO_PADRAO = 18;
const MAXIMO_DE_RECUO = 4;
/**
 * O quanto da linha precisa aparecer abaixo da barra fixa para ela ser a "do alto da tela": a que
 * só mostra o fim (menos que isso) já foi lida. Também absorve a rolagem arredondada ao voltar.
 */
const FOLGA_DO_ALTO = 8;
/** Rolagem parada por este tempo grava a posição (gravar a cada evento escreveria sem parar). */
const ESPERA_PARA_GRAVAR = 800;
/** Quadros seguidos com a linha no lugar para dar a volta à posição por concluída. */
const QUADROS_NO_LUGAR = 3;
/** Depois disto, a tela aparece onde estiver, mesmo sem ter chegado à posição guardada. */
const LIMITE_PARA_VOLTAR = 2000;
/** Atalho da busca na norma (11.6): não é F (modo foco) nem E (registrar erro). */
const TECLA_DA_BUSCA = '/';
/**
 * Depois de um toque no grupo fixo, a seleção que some (o toque no botão a desfaz no celular) não
 * desfaz as ações da marcação: o botão tocado ainda age sobre o trecho escolhido.
 */
const TOQUE_NAS_ACOES = 1500;
/**
 * Modo foco (11.1) na rota (`?foco=texto`; a 11.8 acrescenta o artigo por artigo): recarregar, ou
 * o celular reabrir a aba que matou no fundo, volta ao modo foco, e o "voltar" do navegador sai dele.
 */
const PARAMETRO_DO_FOCO = 'foco';

/** Estado da navegação que entrou no modo foco: sair volta uma entrada no histórico. */
interface EstadoDoFoco {
  entrouNoFoco?: boolean;
}

type Trechos = TextoDeDispositivo['trechos'];

interface Aberta {
  aberta: NormaAberta;
  /** Os textos em volta da posição (ou do começo), lidos junto com a abertura. */
  primeira: ItemDaJanela[];
  /** As janelas de `primeira`: não são pedidas de novo. */
  janelas: number[];
  /** Índice, em `aberta.nos`, do dispositivo da posição guardada; sem ela (ou sem o nó), o começo. */
  alvo: number | undefined;
  /** O "lido até" guardado, se o dispositivo existe na versão aberta. */
  lidoAteId: string | undefined;
}

type Carga =
  { tipo: 'carregando' } | ({ tipo: 'pronta' } & Aberta) | { tipo: 'falha'; erro: unknown };

/** Leitor da norma (F2, 9.6; Parte 2 §10.6): a versão vigente, em lista virtualizada (T16). */
export function Leitor() {
  const { normaId } = useParams();
  // Uma norma por vez: trocar de norma remonta a tela e zera a leitura.
  return <LeitorDaNorma key={normaId} normaId={normaId ?? ''} />;
}

function LeitorDaNorma({ normaId }: { normaId: string }) {
  const repo = useRepositorio();
  const [carga, setCarga] = useState<Carga>({ tipo: 'carregando' });

  useEffect(() => {
    let ativo = true;
    (async (): Promise<Aberta> => {
      const [aberta, leitura] = await Promise.all([
        abrirNorma(repo, normaId),
        // A posição é conveniência: se não puder ser lida, a norma abre no começo.
        obterLeitura(repo, normaId).catch((): Leitura | undefined => undefined),
      ]);
      // Dispositivo que esta versão não tem (versão nova, F6): começo, sem erro.
      const alvo =
        leitura?.posicaoId === undefined ? undefined : aberta.indiceDe.get(leitura.posicaoId);
      const lidoAteId =
        leitura?.lidoAteId !== undefined && aberta.indiceDe.has(leitura.lidoAteId)
          ? leitura.lidoAteId
          : undefined;
      // Os textos em volta da posição vêm junto: a norma abre já com texto, sem esqueleto.
      const inicio = alvo ?? 0;
      const janelas = janelasQueCobrem(
        inicio - 2 * LINHAS_DE_MARGEM,
        inicio + TEXTOS_POR_PEDIDO - 1,
        aberta.nos.length,
      );
      const lidas = await Promise.all(
        janelas.map((janela) =>
          lerJanela(repo, aberta, {
            inicio: janela * TEXTOS_POR_PEDIDO,
            quantidade: TEXTOS_POR_PEDIDO,
          }),
        ),
      );
      return { aberta, primeira: lidas.flat(), janelas, alvo, lidoAteId };
    })().then(
      (lida) => {
        if (ativo) setCarga({ tipo: 'pronta', ...lida });
      },
      (erro: unknown) => {
        if (ativo) setCarga({ tipo: 'falha', erro });
      },
    );
    return () => {
      ativo = false;
    };
  }, [repo, normaId]);

  if (carga.tipo === 'pronta') return <LeitorAberto repo={repo} {...carga} />;
  return (
    <>
      <p>
        <Link to="/biblioteca">← Biblioteca</Link>
      </p>
      {carga.tipo === 'carregando' ? (
        <Esqueleto />
      ) : carga.erro instanceof NormaIndisponivel ? (
        <div role="alert" className="aviso">
          <p>
            <strong>{carga.erro.message}</strong>
          </p>
        </div>
      ) : (
        <Falha
          oQue="Não foi possível abrir a norma."
          oQueFazer="Volte à Biblioteca e tente de novo. Se continuar, feche as outras abas do Arretado."
        />
      )}
    </>
  );
}

/**
 * Os textos já lidos, por índice do nó, e o pedido dos que faltam. Janelas fixas e guardadas: rolar
 * de volta não relê, e a resposta que chega depois de o trecho sair da tela só enche o cache (o
 * índice manda, então nenhuma resposta atrasada desenha no lugar errado).
 */
function useTextos(
  repo: Repositorio,
  aberta: NormaAberta,
  primeira: ItemDaJanela[],
  janelas: number[],
) {
  const [textos, setTextos] = useState<ReadonlyMap<number, ItemDaJanela>>(
    () => new Map(primeira.map((item) => [item.indice, item])),
  );
  const [pedidas] = useState(() => new Set<number>(janelas));
  const [falhou, setFalhou] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const pedir = useCallback(
    (de: number, ate: number) => {
      for (const janela of janelasQueCobrem(de, ate, aberta.nos.length)) {
        if (pedidas.has(janela)) continue;
        pedidas.add(janela);
        lerJanela(repo, aberta, {
          inicio: janela * TEXTOS_POR_PEDIDO,
          quantidade: TEXTOS_POR_PEDIDO,
        }).then(
          (itens) => {
            if (!vivo.current) return;
            setTextos((antes) => {
              const depois = new Map(antes);
              for (const item of itens) depois.set(item.indice, item);
              return depois;
            });
          },
          () => {
            // Volta para a fila: "Tentar de novo" pede outra vez.
            pedidas.delete(janela);
            if (vivo.current) setFalhou(true);
          },
        );
      }
    },
    [repo, aberta, pedidas],
  );

  const tentarDeNovo = useCallback(() => {
    setFalhou(false);
    setTentativa((t) => t + 1);
  }, []);

  return { textos, pedir, falhou, tentarDeNovo, tentativa };
}

/** Onde termina a barra fixa do Shell (`.topo`, sticky): o que fica abaixo dela é o alto da tela. */
function fimDaBarraFixa(): number {
  const barra = document.querySelector('.topo');
  return barra ? Math.max(0, barra.getBoundingClientRect().bottom) : 0;
}

function LeitorAberto({
  repo,
  aberta,
  primeira,
  janelas,
  alvo,
  lidoAteId,
}: { repo: Repositorio } & Aberta) {
  const { norma, nos } = aberta;
  const linhas = useMemo(() => montarLinhas(nos), [nos]);
  const { textos, pedir, falhou, tentarDeNovo, tentativa } = useTextos(
    repo,
    aberta,
    primeira,
    janelas,
  );
  const { dados: preferencias } = useDados(useCallback((r) => obterPreferencias(r), []));
  // Resposta imediata ao toque: o último valor pedido vale até a gravação confirmar. Dois toques
  // seguidos partem do valor pedido, não do gravado (que ainda pode ser o antigo).
  const [pedido, setPedido] = useState<number | null>(null);
  const tamanho = pedido ?? preferencias?.tamanhoFonte ?? TAMANHO_PADRAO;
  // Destaque automático (9.8): a mesma preferência de Conta › Aparência; ausente é desligado.
  const [destaquePedido, setDestaquePedido] = useState<boolean | null>(null);
  const destacar = destaquePedido ?? preferencias?.destacarCondicionantesEPrazos ?? false;
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(new Set());
  // O que o leitor de tela ouve (role=status): o "lido até" marcado e a troca do modo foco.
  const [anuncio, setAnuncio] = useState('');
  const [margem, setMargem] = useState(0);
  const [barraFixa, setBarraFixa] = useState(0);
  // As mesmas medidas, para quem lê a cada rolagem sem forçar o navegador a recalcular o layout.
  const margemMedida = useRef(0);
  const barraFixaMedida = useRef(0);
  // O `scrollY` do último evento de rolagem: o de antes de uma troca de layout (modo foco), que o
  // navegador pode já ter corrigido sozinho quando o efeito da troca roda.
  const rolagem = useRef(0);
  const [busca, setBusca] = useSearchParams();
  const rota = useLocation();
  const estadoDaRota: unknown = rota.state;
  const chaveDaRota = rota.key;
  const navegar = useNavigate();
  const modoFoco = busca.has(PARAMETRO_DO_FOCO);

  // A linha da posição guardada. A primeira linha é o começo: abre no alto da página, com a barra.
  const [linhaInicial] = useState(() => {
    const linha = alvo === undefined ? undefined : linhaDoNo(linhas, alvo);
    return linha === 0 ? undefined : linha;
  });
  const [voltando, setVoltando] = useState(linhaInicial !== undefined);
  const voltandoAgora = useRef(voltando);

  // A lista começa abaixo da barra: o virtualizador precisa do deslocamento para achar o que
  // está na tela. Medido quando a lista entra, quando a janela muda de largura e quando a página
  // muda de altura (a barra quebra em duas linhas no celular). A barra fixa do Shell cobre o
  // alto da tela: a posição e o "ir até" descontam a altura dela.
  const lista = useRef<HTMLDivElement | null>(null);
  const medir = useCallback(() => {
    margemMedida.current = lista.current?.offsetTop ?? 0;
    barraFixaMedida.current = fimDaBarraFixa();
    setMargem(margemMedida.current);
    setBarraFixa(barraFixaMedida.current);
  }, []);
  const definirLista = useCallback(
    (elemento: HTMLDivElement | null) => {
      lista.current = elemento;
      if (elemento) medir();
    },
    [medir],
  );
  useEffect(() => {
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    observador?.observe(document.body);
    window.addEventListener('resize', medir);
    return () => {
      observador?.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [medir]);

  const virtualizador = useWindowVirtualizer({
    count: linhas.length,
    estimateSize: (i) => estimarAltura(tipoDaLinha(nos, linhas, i), tamanho),
    overscan: LINHAS_DE_MARGEM,
    scrollMargin: margem,
    scrollPaddingStart: barraFixa,
    getItemKey: (i) => nos[linhas[i]?.indice ?? 0]?.dispositivo.id ?? i,
  });
  const { measure } = virtualizador;

  // Outro tamanho de texto muda a altura de todas as linhas, inclusive as que não estão na tela.
  useEffect(() => {
    measure();
  }, [tamanho, measure]);

  // A rolagem desta tela é do leitor: a restauração do navegador disputaria com a posição guardada.
  useEffect(() => {
    const antes = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = antes;
    };
  }, []);

  // Volta à posição guardada. As linhas de cima ainda não foram medidas (só há estimativa), então
  // o destino muda à medida que elas aparecem: rola, espera o quadro seguinte e confere de novo,
  // até a linha ficar no alto por alguns quadros. Sem posição, abre no começo (a rolagem da
  // Biblioteca viria junto).
  useEffect(() => {
    if (linhaInicial === undefined) {
      window.scrollTo(0, 0);
      return;
    }
    const inicio = performance.now();
    let noLugar = 0;
    let quadro = 0;
    const conferir = () => {
      const destino = virtualizador.getOffsetForIndex(linhaInicial, 'start')?.[0];
      const desenhada = lista.current?.querySelector(`[data-index="${String(linhaInicial)}"]`);
      if (destino !== undefined && desenhada && Math.abs(window.scrollY - destino) <= 1) {
        noLugar += 1;
      } else {
        noLugar = 0;
        virtualizador.scrollToIndex(linhaInicial, { align: 'start' });
      }
      if (noLugar >= QUADROS_NO_LUGAR || performance.now() - inicio > LIMITE_PARA_VOLTAR) {
        voltandoAgora.current = false;
        setVoltando(false);
        return;
      }
      quadro = requestAnimationFrame(conferir);
    };
    quadro = requestAnimationFrame(conferir);
    return () => {
      cancelAnimationFrame(quadro);
    };
  }, [virtualizador, linhaInicial]);

  // Modo foco (11.1): a moldura do Shell some (atributo na raiz; ver estilos.css) e o leitor tira a
  // barra dele. A troca muda só o que fica acima da lista, não as linhas (a coluna tem a mesma
  // largura): o mesmo dispositivo continua no alto da tela, na mesma altura dentro da linha. A
  // conta parte da rolagem de antes da troca (o navegador pode já tê-la ajustado ao tirar a
  // moldura), é feita antes da pintura e conferida no quadro seguinte. Durante a volta à posição
  // guardada (9.7), quem acerta a rolagem é a volta, que já confere a cada quadro.
  const focoAntes = useRef(modoFoco);
  // O controle com o foco do teclado saiu da tela na troca (a barra do leitor, a do Shell): o foco
  // vai para o botão do canto, em vez de cair no corpo da página.
  const devolverFoco = useRef(false);
  const botaoDoFoco = useRef<HTMLButtonElement | null>(null);
  const caixaDoLeitor = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const raiz = document.documentElement;
    // `data-modo-foco` na raiz esconde a moldura do Shell (barra fixa, navegação, rodapé).
    if (modoFoco) raiz.dataset.modoFoco = 'texto';
    const trocou = focoAntes.current !== modoFoco;
    focoAntes.current = modoFoco;
    if (devolverFoco.current) {
      devolverFoco.current = false;
      botaoDoFoco.current?.focus({ preventScroll: true });
    }
    // Ainda nas medidas de antes da troca: o virtualizador só as refaz depois de `medir`.
    const margemAntes = margemMedida.current;
    const alto = rolagem.current + barraFixaMedida.current;
    const item = virtualizador.getVirtualItemForOffset(alto + FOLGA_DO_ALTO);
    caixaDoLeitor.current?.style.removeProperty('--folga-do-foco');
    medir();
    let quadro = 0;
    if (trocou && !voltandoAgora.current && item !== undefined) {
      const dentro = alto - item.start;
      if (item.index === 0 && dentro <= 0) {
        // No começo da norma, o começo da página, com a barra do leitor (como a volta da 9.7).
        window.scrollTo(0, 0);
      } else {
        const destino = Math.max(
          0,
          alto - barraFixaMedida.current + margemMedida.current - margemAntes,
        );
        // Perto do fim, a moldura que saiu encurta a página e a rolagem seria cortada (o texto
        // desceria e o dispositivo do alto mudaria): a folga do modo foco repõe o que faltou.
        const maximo = document.documentElement.scrollHeight - window.innerHeight;
        if (modoFoco && destino > maximo) {
          caixaDoLeitor.current?.style.setProperty(
            '--folga-do-foco',
            `${String(Math.ceil(destino - maximo))}px`,
          );
        }
        window.scrollTo(0, destino);
        quadro = requestAnimationFrame(() => {
          const desenhada = lista.current?.querySelector(`[data-index="${String(item.index)}"]`);
          if (!desenhada) return;
          const erro = desenhada.getBoundingClientRect().top - (barraFixaMedida.current - dentro);
          if (Math.abs(erro) > 1) window.scrollBy(0, erro);
        });
      }
      rolagem.current = window.scrollY;
    }
    return () => {
      cancelAnimationFrame(quadro);
      delete raiz.dataset.modoFoco;
    };
  }, [modoFoco, medir, virtualizador]);

  // Entrar empilha uma entrada no histórico (o "voltar" do celular sai do modo foco); sair desfaz
  // a entrada que o leitor empilhou ou, se o modo foco veio de fora (recarregar, endereço salvo),
  // troca a rota sem mexer no histórico. Uma troca por rota: o segundo toque antes de a rota
  // mudar (toque duplo, Esc e F seguidos num aparelho lento) não pede outra, porque sair duas
  // vezes por `navigate(-1)` sairia do leitor.
  const pedidaNaRota = useRef<string | undefined>(undefined);
  // O atalho da busca (11.6, definida mais abaixo), sem refazer o ouvinte a cada mudança dela.
  const abrirBuscaAgora = useRef<() => void>(() => undefined);
  // O Esc com trecho selecionado ou grifo escolhido (11.4) desfaz a marcação, não o modo foco.
  const cancelarMarcacaoAgora = useRef<() => boolean>(() => false);
  const alternarFoco = useCallback(() => {
    if (pedidaNaRota.current === chaveDaRota) return;
    pedidaNaRota.current = chaveDaRota;
    const ativo = document.activeElement;
    devolverFoco.current =
      ativo instanceof HTMLElement &&
      ativo !== document.body &&
      !ativo.closest('.lista-leitor, .acoes-leitor');
    setAnuncio(modoFoco ? 'Fora do modo foco.' : 'Modo foco: só o texto.');
    if (!modoFoco) {
      const estado: EstadoDoFoco = { entrouNoFoco: true };
      setBusca({ [PARAMETRO_DO_FOCO]: 'texto' }, { state: estado });
    } else if ((estadoDaRota as EstadoDoFoco | null)?.entrouNoFoco) {
      void navegar(-1);
    } else {
      setBusca({}, { replace: true });
    }
  }, [modoFoco, chaveDaRota, estadoDaRota, setBusca, navegar]);

  // Atalho: F entra e sai; Esc também sai. Fora de campo de texto e de diálogo aberto (a tecla é
  // deles), sem Ctrl/Alt/Cmd (Ctrl+F é a busca do navegador) e sem repetir com a tecla presa.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || teclaForaDosAtalhos(e)) return;
      if (e.key === TECLA_DA_BUSCA) {
        // Sem o `preventDefault`, a barra iria parar no campo da busca.
        e.preventDefault();
        abrirBuscaAgora.current();
        return;
      }
      if (e.key === 'Escape' && cancelarMarcacaoAgora.current()) {
        e.preventDefault();
        return;
      }
      if (e.key.toLowerCase() !== 'f' && !(modoFoco && e.key === 'Escape')) return;
      e.preventDefault();
      alternarFoco();
    };
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
    };
  }, [modoFoco, alternarFoco]);

  const visiveis = virtualizador.getVirtualItems();
  const primeiraVisivel = visiveis[0]?.index;
  const ultimaVisivel = visiveis.at(-1)?.index;
  useEffect(() => {
    if (primeiraVisivel === undefined || ultimaVisivel === undefined) return;
    const inicio = linhas[primeiraVisivel]?.indice ?? 0;
    const ultima = linhas[ultimaVisivel];
    const fim = ultima?.indiceNome ?? ultima?.indice ?? inicio;
    pedir(inicio - MARGEM_DE_TEXTOS, fim + MARGEM_DE_TEXTOS);
  }, [primeiraVisivel, ultimaVisivel, linhas, pedir, tentativa]);

  /** O dispositivo da linha no alto da tela, logo abaixo da barra fixa. */
  const noDoAlto = useCallback((): string | undefined => {
    const item = virtualizador.getVirtualItemForOffset(
      window.scrollY + barraFixaMedida.current + FOLGA_DO_ALTO,
    );
    const linha = item === undefined ? undefined : linhas[item.index];
    return linha === undefined ? undefined : nos[linha.indice]?.dispositivo.id;
  }, [virtualizador, linhas, nos]);

  // A posição (o dispositivo no alto da tela) é gravada ao parar de rolar, ao sair da norma e
  // quando a página some (`pagehide`, ou a aba vai para o fundo no celular), nunca a cada
  // evento. Enquanto volta à posição guardada, a posição é ela, e não o que passa pela tela. A
  // primeira gravação da visita sempre acontece: é ela que marca a última leitura.
  const posicao = useRef(nos[linhas[linhaInicial ?? 0]?.indice ?? 0]?.dispositivo.id);
  const gravada = useRef<string | undefined>(undefined);
  const vivo = useRef(true);
  const [falhaAoGravar, setFalhaAoGravar] = useState(false);

  useEffect(() => {
    vivo.current = true;
    rolagem.current = window.scrollY;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const acompanhar = () => {
      // Saindo da norma, a lista sai da página antes desta limpeza rodar, e a rolagem cortada da
      // tela seguinte ainda chega aqui: a posição seria a primeira linha.
      if (!lista.current) return;
      rolagem.current = window.scrollY;
      if (!voltandoAgora.current) posicao.current = noDoAlto() ?? posicao.current;
    };
    const gravar = () => {
      const id = posicao.current;
      if (id === undefined || id === gravada.current) return;
      gravada.current = id;
      gravarPosicao(repo, norma.id, id).then(
        () => {
          if (vivo.current) setFalhaAoGravar(false);
        },
        () => {
          gravada.current = undefined;
          if (vivo.current) setFalhaAoGravar(true);
        },
      );
    };
    const aoRolar = () => {
      acompanhar();
      clearTimeout(espera);
      espera = setTimeout(() => {
        acompanhar();
        gravar();
      }, ESPERA_PARA_GRAVAR);
    };
    const aoEsconder = () => {
      acompanhar();
      gravar();
    };
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'hidden') aoEsconder();
    };
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('pagehide', aoEsconder);
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => {
      clearTimeout(espera);
      window.removeEventListener('scroll', aoRolar);
      window.removeEventListener('pagehide', aoEsconder);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      vivo.current = false;
      // Saindo da norma: a tela já pode ser a seguinte, então vale a última posição acompanhada.
      gravar();
    };
  }, [repo, norma.id, noDoAlto]);

  // "Lido até": só muda por ação do usuário (o botão marca o dispositivo no alto da tela).
  const [lidoAte, setLidoAte] = useState(lidoAteId);
  const [falhaAoMarcar, setFalhaAoMarcar] = useState(false);
  const indiceLidoAte = lidoAte === undefined ? undefined : aberta.indiceDe.get(lidoAte);
  const referenciaLidoAte =
    indiceLidoAte === undefined ? '' : referenciaDoNo(nos, aberta.indiceDe, indiceLidoAte);

  function marcarAqui() {
    const id = noDoAlto();
    const indice = id === undefined ? undefined : aberta.indiceDe.get(id);
    if (id === undefined || indice === undefined) return;
    const antes = lidoAte;
    setLidoAte(id);
    setFalhaAoMarcar(false);
    setAnuncio(`Lido até ${referenciaDoNo(nos, aberta.indiceDe, indice)}.`);
    marcarLidoAte(repo, norma.id, id).catch(() => {
      if (!vivo.current) return;
      setLidoAte(antes);
      setAnuncio('');
      setFalhaAoMarcar(true);
    });
  }

  // "Ir ao lido até" e "ir para" da busca (11.6): a linha vai ao alto da tela, logo abaixo da barra
  // fixa. Como na volta à posição (9.7), as linhas do caminho ainda não foram medidas e o destino
  // muda à medida que elas aparecem: rola e confere a cada quadro, até a linha ficar no lugar por
  // alguns quadros (ou o fim da página não deixar subir mais). Diferente da volta, os textos do
  // destino não vêm antes: só conta como no lugar quando as linhas desenhadas já têm texto (o
  // texto que chega muda a altura delas). A lista continua à vista.
  const indo = useRef(0);
  useEffect(
    () => () => {
      cancelAnimationFrame(indo.current);
    },
    [],
  );
  const irParaLinha = useCallback(
    (linha: number) => {
      cancelAnimationFrame(indo.current);
      const inicio = performance.now();
      let noLugar = 0;
      virtualizador.scrollToIndex(linha, { align: 'start' });
      const conferir = () => {
        const destino = virtualizador.getOffsetForIndex(linha, 'start')?.[0];
        const maximo = document.documentElement.scrollHeight - window.innerHeight;
        const desenhada = lista.current?.querySelector(`[data-index="${String(linha)}"]`);
        const comTexto = !lista.current?.querySelector('.texto-carregando');
        if (
          destino !== undefined &&
          desenhada &&
          comTexto &&
          Math.abs(window.scrollY - Math.min(destino, maximo)) <= 1
        ) {
          noLugar += 1;
        } else {
          noLugar = 0;
          virtualizador.scrollToIndex(linha, { align: 'start' });
        }
        if (noLugar >= QUADROS_NO_LUGAR || performance.now() - inicio > LIMITE_PARA_VOLTAR) return;
        indo.current = requestAnimationFrame(conferir);
      };
      indo.current = requestAnimationFrame(conferir);
    },
    [virtualizador],
  );

  function irAoLidoAte() {
    const linha = indiceLidoAte === undefined ? undefined : linhaDoNo(linhas, indiceLidoAte);
    if (linha !== undefined) irParaLinha(linha);
  }

  // Busca dentro da norma (11.6). O leitor só tem os textos perto da tela: na primeira busca, lê
  // todos os da versão (uma vez por visita). A consulta fica guardada enquanto a norma está aberta.
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [textosDaBusca, setTextosDaBusca] = useState<TextosDaBusca | undefined>(undefined);
  const [achadoId, setAchadoId] = useState<string | undefined>(undefined);
  const lerTextosDaBusca = useCallback(() => {
    setTextosDaBusca({ estado: 'carregando' });
    prepararBusca(repo, aberta).then(
      (buscaveis) => {
        if (vivo.current) setTextosDaBusca({ estado: 'pronto', buscaveis });
      },
      () => {
        if (vivo.current) setTextosDaBusca({ estado: 'falha' });
      },
    );
  }, [repo, aberta]);
  function abrirBusca() {
    setBuscaAberta(true);
    if (textosDaBusca === undefined || textosDaBusca.estado === 'falha') lerTextosDaBusca();
  }
  useEffect(() => {
    abrirBuscaAgora.current = abrirBusca;
  });
  const enderecos = useMemo(() => {
    const mapa = new Map<string, number>();
    nos.forEach((no, i) => {
      if (!mapa.has(no.dispositivo.endereco)) mapa.set(no.dispositivo.endereco, i);
    });
    return mapa;
  }, [nos]);
  const indiceDoEndereco = useCallback((endereco: string) => enderecos.get(endereco), [enderecos]);
  // A referência da linha que mostra o nó (a rubrica é mostrada na linha do artigo).
  const referenciaDaBusca = useCallback(
    (indice: number) => {
      const linha = linhaDoNo(linhas, indice);
      const doNo = linha === undefined ? indice : (linhas[linha]?.indice ?? indice);
      return referenciaDoNo(nos, aberta.indiceDe, doNo) || 'Início da norma';
    },
    [linhas, nos, aberta.indiceDe],
  );
  // O "lido até" não muda: ir a um achado é só rolar (a posição segue a rolagem, como sempre).
  function irParaAchado(indice: number) {
    const linha = linhaDoNo(linhas, indice);
    setBuscaAberta(false);
    if (linha === undefined) return;
    setAchadoId(nos[linhas[linha]?.indice ?? 0]?.dispositivo.id);
    setAnuncio(`Na busca: ${referenciaDaBusca(indice)}.`);
    irParaLinha(linha);
  }

  // Grifos e notas (11.4). Selecionar um trecho do texto vigente (o mouse, o toque longo do
  // celular, o teclado) troca o grupo fixo pelas ações da marcação: as 3 cores e "Nota". Tocar num
  // grifo o escolhe (trocar a cor, anotar, tirar); tocar no marcador da nota abre a nota. Nada
  // depende de hover. O que muda a posição de leitura: nada (a nota abre num diálogo).
  const marcacoes = useMarcacoes(repo, norma.id, aberta.versao.id, vivo);
  const [selecao, setSelecao] = useState<SelecaoNoTexto | undefined>(undefined);
  const [escolhidaId, setEscolhidaId] = useState<string | undefined>(undefined);
  const [notaAberta, setNotaAberta] = useState<
    { trecho: SelecaoNoTexto; texto: string } | { id: string } | undefined
  >(undefined);
  const tocouNasAcoes = useRef(-Infinity);
  const temSelecao = useRef(false);
  const escolhida = escolhidaId === undefined ? undefined : marcacoes.porId.get(escolhidaId);
  useEffect(() => {
    const aoMudar = () => {
      const lida = lerSelecao(document.getSelection(), lista.current);
      if (lida) {
        setSelecao((antes) =>
          antes?.dispositivoId === lida.dispositivoId &&
          antes.inicio === lida.inicio &&
          antes.fim === lida.fim &&
          antes.cortada === lida.cortada
            ? antes
            : lida,
        );
        setEscolhidaId(undefined);
        // Anunciado uma vez, quando a seleção começa (não a cada letra que a alça percorre).
        if (!temSelecao.current) setAnuncio('Trecho selecionado: grife numa das 3 cores ou anote.');
        temSelecao.current = true;
        return;
      }
      if (performance.now() - tocouNasAcoes.current < TOQUE_NAS_ACOES) return;
      temSelecao.current = false;
      setSelecao(undefined);
    };
    document.addEventListener('selectionchange', aoMudar);
    return () => {
      document.removeEventListener('selectionchange', aoMudar);
    };
  }, []);
  const limparSelecao = useCallback(() => {
    temSelecao.current = false;
    setSelecao(undefined);
    document.getSelection()?.removeAllRanges();
  }, []);
  const referenciaDoDispositivo = (dispositivoId: string) => {
    const indice = aberta.indiceDe.get(dispositivoId);
    return indice === undefined ? '' : referenciaDoNo(nos, aberta.indiceDe, indice);
  };
  const trechoDe = (s: SelecaoNoTexto) => ({
    normaId: norma.id,
    versaoId: aberta.versao.id,
    dispositivoId: s.dispositivoId,
    inicio: s.inicio,
    fim: s.fim,
  });
  /** O texto gravado da seleção (para citar na nota nova): o que está na tela agora. */
  const textoDaSelecao = (s: SelecaoNoTexto) => {
    const indice = aberta.indiceDe.get(s.dispositivoId);
    const trechos = indice === undefined ? undefined : textos.get(indice)?.texto?.trechos;
    return (trechos ?? [])
      .map((t) => t.texto)
      .join('')
      .slice(s.inicio, s.fim)
      .trim();
  };
  function grifarSelecao(cor: 1 | 2 | 3) {
    const s = selecao;
    if (!s) return;
    limparSelecao();
    const onde = referenciaDoDispositivo(s.dispositivoId);
    void marcacoes.grifar(trechoDe(s), cor).then((deu) => {
      if (deu) setAnuncio(`Grifado${onde ? ` no ${onde}` : ''}, cor ${String(cor)}.`);
    });
  }
  function anotarSelecao() {
    const s = selecao;
    if (!s) return;
    setNotaAberta({ trecho: s, texto: textoDaSelecao(s) });
    limparSelecao();
  }
  function anotarGrifo(grifo: Marcacao) {
    setEscolhidaId(undefined);
    setNotaAberta({
      trecho: {
        dispositivoId: grifo.dispositivoId,
        inicio: grifo.ancora.inicio,
        fim: grifo.ancora.fim,
        cortada: false,
      },
      texto: grifo.ancora.texto,
    });
  }
  useEffect(() => {
    cancelarMarcacaoAgora.current = () => {
      if (selecao === undefined && escolhidaId === undefined) return false;
      limparSelecao();
      setEscolhidaId(undefined);
      return true;
    };
  });
  // Os grifos e os marcadores de nota respondem ao toque e ao teclado, pela lista (um ouvinte só).
  function escolherNoTexto(alvo: EventTarget, porTeclado: boolean) {
    if (!(alvo instanceof Element)) return false;
    const marcador = alvo.closest<HTMLElement>('[data-nota]');
    if (marcador?.dataset.nota) {
      setNotaAberta({ id: marcador.dataset.nota });
      return true;
    }
    const grifo = alvo.closest<HTMLElement>('mark[data-marcacao]');
    // O clique que termina uma seleção (arrastar dentro do grifo) é da seleção.
    if (grifo?.dataset.marcacao && (porTeclado || document.getSelection()?.isCollapsed !== false)) {
      setSelecao(undefined);
      setEscolhidaId(grifo.dataset.marcacao);
      setAnuncio('Grifo escolhido: troque a cor, anote ou tire.');
      return true;
    }
    return false;
  }
  const notaDoDialogo =
    notaAberta && 'id' in notaAberta ? marcacoes.porId.get(notaAberta.id) : undefined;

  const alternar = useCallback((id: string) => {
    setAbertos((antes) => {
      const depois = new Set(antes);
      if (!depois.delete(id)) depois.add(id);
      return depois;
    });
  }, []);

  function mudarTamanho(passo: number) {
    const novo = Math.min(TAMANHO_MAXIMO, Math.max(TAMANHO_MINIMO, tamanho + passo));
    if (novo === tamanho) return;
    setPedido(novo);
    // Se não gravar, volta ao que está gravado.
    alterarPreferencias(repo, { tamanhoFonte: novo }).catch(() => {
      setPedido(null);
    });
  }

  function alternarDestaques() {
    const novo = !destacar;
    setDestaquePedido(novo);
    // Se não gravar, volta ao que está gravado.
    alterarPreferencias(repo, { destacarCondicionantesEPrazos: novo }).catch(() => {
      setDestaquePedido(null);
    });
  }

  // No modo foco, só o texto e o grupo fixo do canto ("Sair do foco" e "Lido até aqui"); a barra
  // do leitor (tamanho do texto, destaques), a legenda e a referência do "lido até" ficam fora.
  // O título continua como cabeçalho da página, só para o leitor de tela.
  return (
    <div ref={caixaDoLeitor} className={modoFoco ? 'leitor em-foco' : 'leitor'}>
      {modoFoco ? (
        <h1 className="visualmente-oculto">{norma.tituloCurto}</h1>
      ) : (
        <BarraDoLeitor
          titulo={norma.tituloCurto}
          tamanho={tamanho}
          mudarTamanho={mudarTamanho}
          destacar={destacar}
          alternarDestaques={alternarDestaques}
        />
      )}
      {!modoFoco && destacar && <LegendaDestaques />}
      {!modoFoco && referenciaLidoAte && (
        <p className="lido-ate">
          <span>
            Lido até <strong>{referenciaLidoAte}</strong>
          </span>
          <button type="button" className="discreto" onClick={irAoLidoAte}>
            Ir ao lido até
          </button>
        </p>
      )}
      {falhou && (
        <div role="alert" className="aviso falha">
          <p>Não foi possível carregar parte do texto.</p>
          <button type="button" onClick={tentarDeNovo}>
            Tentar de novo
          </button>
        </div>
      )}
      {marcacoes.falha && (
        <p role="alert" className="aviso falha">
          {marcacoes.falha} Se continuar, feche as outras abas do Arretado.
        </p>
      )}
      {(falhaAoGravar || falhaAoMarcar) && (
        <p role="alert" className="aviso falha">
          {falhaAoMarcar
            ? 'Não foi possível marcar o "lido até".'
            : 'Não foi possível guardar onde você parou.'}{' '}
          Se continuar, feche as outras abas do Arretado.
        </p>
      )}
      <div
        ref={definirLista}
        className={voltando ? 'lista-leitor voltando' : 'lista-leitor'}
        aria-busy={voltando}
        style={{ height: virtualizador.getTotalSize() }}
        onClick={(e) => {
          if (!escolherNoTexto(e.target, false) && escolhidaId !== undefined) {
            setEscolhidaId(undefined);
          }
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && escolherNoTexto(e.target, true)) {
            e.preventDefault();
          }
        }}
      >
        {visiveis.map((virtual) => {
          const linha = linhas[virtual.index];
          if (!linha) return null;
          const id = nos[linha.indice]?.dispositivo.id ?? '';
          return (
            <div
              key={virtual.key}
              data-index={virtual.index}
              ref={virtualizador.measureElement}
              className={id === achadoId ? 'linha-leitor achado-da-busca' : 'linha-leitor'}
              style={{ transform: `translateY(${String(virtual.start - margem)}px)` }}
            >
              <Dispositivo
                aberta={aberta}
                linha={linha}
                item={textos.get(linha.indice)}
                nome={linha.indiceNome === undefined ? undefined : textos.get(linha.indiceNome)}
                expandido={abertos.has(id)}
                alternar={alternar}
                destacar={destacar}
                marcacoes={marcacoes.porDispositivo.get(id)}
                escolhidaId={escolhidaId}
              />
              {id === lidoAte && <p className="marca-lido-ate">Lido até aqui</p>}
            </div>
          );
        })}
      </div>
      {/* Fixo no canto, acompanha a rolagem; no modo foco, semitransparente. O mesmo botão entra e
          sai (o foco do teclado fica nele). */}
      <div
        className="acoes-leitor"
        onPointerDownCapture={() => {
          tocouNasAcoes.current = performance.now();
        }}
        // No desktop, o clique no botão não tira a seleção nem o foco do texto.
        onMouseDown={(e) => {
          if (selecao && e.target instanceof Element && e.target.closest('button')) {
            e.preventDefault();
          }
        }}
      >
        {selecao ? (
          <AcoesDaSelecao
            cortadaEm={selecao.cortada ? referenciaDoDispositivo(selecao.dispositivoId) : undefined}
            grifar={grifarSelecao}
            anotar={anotarSelecao}
            cancelar={() => {
              limparSelecao();
              setAnuncio('');
            }}
          />
        ) : escolhida?.tipo === 'grifo' ? (
          <AcoesDoGrifo
            cor={escolhida.cor ?? 1}
            mudar={(cor) => {
              void marcacoes.mudarCor(escolhida.id, cor).then((deu) => {
                if (deu) setAnuncio(`Grifo na cor ${String(cor)}.`);
              });
            }}
            anotar={() => {
              anotarGrifo(escolhida);
            }}
            tirar={() => {
              setEscolhidaId(undefined);
              void marcacoes.remover(escolhida.id).then((deu) => {
                if (deu) setAnuncio('Grifo tirado.');
              });
            }}
            fechar={() => {
              setEscolhidaId(undefined);
            }}
          />
        ) : (
          <AcoesDaLeitura
            modoFoco={modoFoco}
            botaoDoFoco={botaoDoFoco}
            abrirBusca={abrirBusca}
            alternarFoco={alternarFoco}
            marcarAqui={marcarAqui}
          />
        )}
        <p role="status" className="visualmente-oculto">
          {anuncio}
        </p>
      </div>
      <DialogoDaNota
        aberto={notaAberta !== undefined && ('trecho' in notaAberta || notaDoDialogo !== undefined)}
        trecho={
          notaAberta && 'trecho' in notaAberta
            ? notaAberta.texto
            : (notaDoDialogo?.ancora.texto ?? '')
        }
        nota={notaDoDialogo?.nota}
        guardar={async (texto) => {
          if (!notaAberta) return false;
          if ('trecho' in notaAberta) {
            const deu = await marcacoes.anotar(trechoDe(notaAberta.trecho), texto);
            if (deu) setAnuncio('Nota guardada.');
            return deu;
          }
          const deu = await marcacoes.editarNota(notaAberta.id, texto);
          if (deu) setAnuncio('Nota guardada.');
          return deu;
        }}
        tirar={async () => {
          if (!notaAberta || !('id' in notaAberta)) return false;
          const deu = await marcacoes.remover(notaAberta.id);
          if (deu) setAnuncio('Nota tirada.');
          return deu;
        }}
        fechar={() => {
          setNotaAberta(undefined);
        }}
      />
      <BuscaNaNorma
        aberto={buscaAberta}
        aoFechar={() => {
          setBuscaAberta(false);
        }}
        consulta={consulta}
        mudarConsulta={setConsulta}
        textos={textosDaBusca ?? { estado: 'carregando' }}
        tentarDeNovo={lerTextosDaBusca}
        indiceDoEndereco={indiceDoEndereco}
        referencia={referenciaDaBusca}
        irPara={irParaAchado}
      />
    </div>
  );
}

/** O grupo fixo sem marcação em curso: buscar, modo foco e "lido até". */
function AcoesDaLeitura({
  modoFoco,
  botaoDoFoco,
  abrirBusca,
  alternarFoco,
  marcarAqui,
}: {
  modoFoco: boolean;
  botaoDoFoco: RefObject<HTMLButtonElement | null>;
  abrirBusca: () => void;
  alternarFoco: () => void;
  marcarAqui: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-keyshortcuts={TECLA_DA_BUSCA}
        title={`Buscar na norma, por texto ou endereço (atalho: ${TECLA_DA_BUSCA})`}
        onClick={abrirBusca}
      >
        Buscar
      </button>
      <button
        ref={botaoDoFoco}
        type="button"
        aria-keyshortcuts={modoFoco ? 'F Escape' : 'F'}
        title={
          modoFoco ? 'Sair do modo foco (atalho: F ou Esc)' : 'Modo foco: só o texto (atalho: F)'
        }
        onClick={alternarFoco}
      >
        {modoFoco ? 'Sair do foco' : 'Modo foco'}
      </button>
      <button type="button" onClick={marcarAqui}>
        Lido até aqui
      </button>
    </>
  );
}

/** A barra do leitor (fora do modo foco): voltar, título, tamanho do texto e destaques. */
function BarraDoLeitor({
  titulo,
  tamanho,
  mudarTamanho,
  destacar,
  alternarDestaques,
}: {
  titulo: string;
  tamanho: number;
  mudarTamanho: (passo: number) => void;
  destacar: boolean;
  alternarDestaques: () => void;
}) {
  return (
    <div className="barra-leitor">
      <Link to="/biblioteca" className="botao discreto">
        ← Biblioteca
      </Link>
      <h1>{titulo}</h1>
      <div role="group" aria-label="Tamanho do texto" className="tamanho-texto">
        <button
          type="button"
          aria-label="A−, diminuir o texto"
          disabled={tamanho <= TAMANHO_MINIMO}
          onClick={() => {
            mudarTamanho(-PASSO_DO_TAMANHO);
          }}
        >
          A−
        </button>
        <output aria-label="Tamanho atual do texto">{tamanho} px</output>
        <button
          type="button"
          aria-label="A+, aumentar o texto"
          disabled={tamanho >= TAMANHO_MAXIMO}
          onClick={() => {
            mudarTamanho(PASSO_DO_TAMANHO);
          }}
        >
          A+
        </button>
      </div>
      <button
        type="button"
        className="alternar-destaques"
        aria-pressed={destacar}
        onClick={alternarDestaques}
      >
        Destaques
      </button>
    </div>
  );
}

function tipoDaLinha(nos: NormaAberta['nos'], linhas: LinhaDoLeitor[], i: number) {
  return nos[linhas[i]?.indice ?? 0]?.dispositivo.tipo ?? 'paragrafo';
}

/**
 * Os trechos do texto: ênfase, tachado parcial (redação anterior no meio do texto) e link; com
 * `destacar`, também o destaque automático (9.8); com `marcas`, os grifos e os marcadores das
 * notas (11.4). Uma partição só, aninhada sempre na mesma ordem: link, tachado, ênfase, grifo e
 * destaque (por dentro); o marcador da nota vem depois do pedaço onde a nota termina.
 */
function TrechosDoTexto({
  trechos,
  destacar = false,
  marcas,
  escolhidaId,
}: {
  trechos: Trechos;
  destacar?: boolean;
  marcas?: MarcasDoTexto;
  escolhidaId?: string;
}) {
  const pedacos = pedacosDoTexto(trechos, destacar, marcas);
  return pedacos.map(({ trecho, categoria, grifo, notas }, i) => {
    let conteudo = <>{trecho.texto}</>;
    if (categoria) conteudo = <span className={`destaque destaque-${categoria}`}>{conteudo}</span>;
    if (grifo) {
      conteudo = (
        <mark
          className={`grifo grifo-${String(grifo.cor)}${grifo.id === escolhidaId ? ' grifo-escolhido' : ''}`}
          data-marcacao={grifo.id}
          // Um ponto de parada do teclado por grifo, no primeiro pedaço dele.
          tabIndex={grifo.primeiro ? 0 : undefined}
          title="Grifo: toque para trocar a cor, anotar ou tirar"
        >
          {conteudo}
        </mark>
      );
    }
    if (trecho.enfase) conteudo = <em>{conteudo}</em>;
    if (trecho.tachado) conteudo = <del>{conteudo}</del>;
    if (trecho.link) {
      conteudo = (
        <a href={trecho.link} target="_blank" rel="noopener noreferrer">
          {conteudo}
        </a>
      );
    }
    return (
      <Fragment key={i}>
        {conteudo}
        {notas?.map((id) => (
          <button
            key={id}
            type="button"
            className="marcador-nota"
            data-nota={id}
            {...{ [ATRIBUTO_FORA_DO_TEXTO]: '' }}
            aria-label={`Nota: ${marcas?.notas.find((n) => n.id === id)?.rotulo ?? ''}`}
          >
            <span aria-hidden="true">✎</span>
          </button>
        ))}
      </Fragment>
    );
  });
}

const textoDe = (texto: ItemDaJanela | undefined) =>
  texto?.texto?.trechos.map((t) => t.texto).join('') ?? '';

/** O texto é só "(VETADO)", sem tachado (o tachado fica à mostra, como a redação antiga do anexo). */
const soEsqueletoDoVeto = (trechos: Trechos) =>
  trechos.every((t) => !t.tachado) && SO_VETADO.test(trechos.map((t) => t.texto).join(''));

function Notas({ notas }: { notas: NonNullable<TextoDeDispositivo['notasVigencia']> }) {
  return (
    <ul className="notas-vigencia" aria-label="Notas de vigência">
      {notas.map((nota, i) => (
        <li key={i}>
          {nota.link ? (
            <a href={nota.link} target="_blank" rel="noopener noreferrer">
              {nota.texto}
            </a>
          ) : (
            nota.texto
          )}
        </li>
      ))}
    </ul>
  );
}

type RedacoesAnteriores = NonNullable<TextoDeDispositivo['redacoesAnteriores']>;

/** O texto anterior de cada redação, atenuado; a da heurística ainda não confirmada diz "a confirmar". */
function ListaDeRedacoes({ redacoes }: { redacoes: RedacoesAnteriores }) {
  return (
    <ol className="redacoes-lista" aria-label="Texto anterior">
      {redacoes.map((redacao, i) => (
        <li key={i}>
          <TrechosDoTexto trechos={redacao.trechos} />
          {redacao.nota && <span className="nota-da-redacao"> {redacao.nota}</span>}
          {redacao.origemDeteccao === 'heuristica' && !redacao.confirmada && (
            <span className="nota-da-redacao"> (a confirmar)</span>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Redações anteriores ocultas, com o indicador que as mostra (Parte 2 §10.6, Leitor). */
function Redacoes({
  redacoes,
  aberto,
  aoAlternar,
}: {
  redacoes: RedacoesAnteriores;
  aberto: boolean;
  aoAlternar: () => void;
}) {
  const quantas = redacoes.length;
  const rotulo = quantas === 1 ? '1 redação anterior' : `${String(quantas)} redações anteriores`;
  return (
    <div className="redacoes-anteriores">
      <button
        type="button"
        className="alternar-linha"
        aria-expanded={aberto}
        aria-label={aberto ? `Ocultar ${rotulo}` : `Mostrar ${rotulo} (texto anterior, oculto)`}
        onClick={aoAlternar}
      >
        {rotulo}
        <span aria-hidden="true">{aberto ? ' ▾' : ' ▸'}</span>
      </button>
      {aberto && <ListaDeRedacoes redacoes={redacoes} />}
    </div>
  );
}

interface PropsDoDispositivo {
  aberta: NormaAberta;
  linha: LinhaDoLeitor;
  item: ItemDaJanela | undefined;
  nome: ItemDaJanela | undefined;
  expandido: boolean;
  alternar: (id: string) => void;
  /** Destaque automático (9.8): só no texto vigente (nem rubrica, nem notas, nem redações). */
  destacar: boolean;
  /** Grifos e notas (11.4) do dispositivo, também só no texto vigente. */
  marcacoes: readonly Marcacao[] | undefined;
  escolhidaId: string | undefined;
}

/** Um dispositivo: estrutural como cabeçalho aninhado, normativo com recuo pelo nível. */
function Dispositivo({
  aberta,
  linha,
  item,
  nome,
  expandido,
  alternar,
  destacar,
  marcacoes,
  escolhidaId,
}: PropsDoDispositivo) {
  const no = aberta.nos[linha.indice];
  if (!no) return null;
  const { dispositivo } = no;
  const texto = item?.texto;
  const carregando = item === undefined || (linha.indiceNome !== undefined && nome === undefined);
  const nomeDoNo = textoDe(nome);
  const recuo = Math.min(linha.recuo, MAXIMO_DE_RECUO);
  // As da rubrica (o nome antigo, tachado: CP, art. 218-B) vêm antes das do texto (8.6).
  const redacoes = [
    ...(nome?.texto?.redacoesAnteriores ?? []),
    ...(texto?.redacoesAnteriores ?? []),
  ];
  const notas = texto?.notasVigencia ?? [];
  const alternarEste = () => {
    alternar(dispositivo.id);
  };
  // Nível do cabeçalho: o título da página é o 1; cada nível da árvore desce um.
  const nivelDoCabecalho = linha.nivel + 2;

  if (dispositivo.categoria === 'estrutural') {
    // O nome do nó vem da rubrica dobrada; o `bloco` e o `anexo` trazem o título no próprio texto.
    const titulo = nomeDoNo || textoDe(item);
    return (
      <div
        className={`dispositivo estrutura tipo-${dispositivo.tipo}`}
        aria-busy={carregando}
        data-endereco={dispositivo.endereco}
      >
        <div role="heading" aria-level={nivelDoCabecalho}>
          {dispositivo.rotulo && <span className="rotulo-estrutura">{dispositivo.rotulo}</span>}
          {titulo ? (
            <span className="nome-estrutura">{titulo}</span>
          ) : (
            carregando && <span className="texto-carregando" aria-hidden="true" />
          )}
        </div>
        {redacoes.length > 0 && (
          <Redacoes redacoes={redacoes} aberto={expandido} aoAlternar={alternarEste} />
        )}
      </div>
    );
  }

  const rotulo = dispositivo.rotulo ?? '';
  const ehArtigo = dispositivo.tipo === 'artigo';
  const rotuloEmDestaque = rotulo ? (
    ehArtigo ? (
      <span role="heading" aria-level={nivelDoCabecalho} className="rotulo-dispositivo">
        {rotulo}
      </span>
    ) : (
      <span className="rotulo-dispositivo">{rotulo}</span>
    )
  ) : null;

  if (dispositivo.status === 'revogado' || dispositivo.status === 'vetado') {
    // O vetado guarda "(VETADO)" no texto (e, no CP, arts. 359-O…, na rubrica): é o esqueleto que a
    // legenda já diz, não conta como "mais" nem se repete ao abrir (8.10).
    const vetado = dispositivo.status === 'vetado';
    const nomeVisivel = vetado && soEsqueletoDoVeto(nome?.texto?.trechos ?? []) ? '' : nomeDoNo;
    const trechos = texto && !(vetado && soEsqueletoDoVeto(texto.trechos)) ? texto.trechos : [];
    const temMais =
      nomeVisivel !== '' || notas.length > 0 || redacoes.length > 0 || trechos.length > 0;
    const legenda = `${rotulo || 'Dispositivo'} — (${dispositivo.status})`;
    return (
      <div
        className={`dispositivo ${dispositivo.status} tipo-${dispositivo.tipo}`}
        data-recuo={recuo}
        data-endereco={dispositivo.endereco}
        aria-busy={carregando}
      >
        {temMais ? (
          <button
            type="button"
            className="alternar-linha linha-atenuada"
            aria-expanded={expandido}
            onClick={alternarEste}
          >
            {legenda}
            <span aria-hidden="true">{expandido ? ' ▾' : ' ▸'}</span>
          </button>
        ) : (
          <p className="linha-atenuada">{legenda}</p>
        )}
        {expandido && (
          <div className="linha-atenuada-aberta">
            {nomeVisivel && <p className="rubrica">{nomeVisivel}</p>}
            {trechos.length > 0 && (
              <p className="texto-dispositivo">
                <TrechosDoTexto trechos={trechos} />
              </p>
            )}
            {notas.length > 0 && <Notas notas={notas} />}
            {redacoes.length > 0 && <ListaDeRedacoes redacoes={redacoes} />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`dispositivo normativo tipo-${dispositivo.tipo}`}
      data-recuo={recuo}
      data-endereco={dispositivo.endereco}
      aria-busy={carregando}
    >
      {nomeDoNo && <p className="rubrica">{nomeDoNo}</p>}
      <p className="texto-dispositivo">
        {rotuloEmDestaque}
        {rotuloEmDestaque && ' '}
        {texto ? (
          // O texto vigente, onde a seleção vira grifo ou nota (`lerSelecao`).
          <span className={CLASSE_DO_TEXTO} data-dispositivo={dispositivo.id}>
            <TrechosDoTexto
              trechos={texto.trechos}
              // A eficácia cessada não é texto vigente; o revogado e o vetado nem chegam aqui.
              destacar={destacar && dispositivo.status !== 'eficacia_cessada'}
              marcas={marcasDoTexto(marcacoes)}
              escolhidaId={escolhidaId}
            />
          </span>
        ) : (
          <span className="texto-carregando" aria-hidden="true" />
        )}
      </p>
      {notas.length > 0 && <Notas notas={notas} />}
      {redacoes.length > 0 && (
        <Redacoes redacoes={redacoes} aberto={expandido} aoAlternar={alternarEste} />
      )}
    </div>
  );
}
