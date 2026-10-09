import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import type {
  Dispositivo as DispositivoDoModelo,
  Leitura,
  Marcacao,
  TextoDeDispositivo,
  TipoDispositivo,
} from '../../core/modelo';
import { alterarPreferencias, obterPreferencias } from '../../core/preferencias';
import type { Repositorio } from '../../core/persistencia';
import { prepararBusca } from '../../dominios/legislacao/busca';
import { arvoreDaEstrela, estrelavel } from '../../dominios/legislacao/estrelas';
import {
  aplicarFiltro,
  nomeDoCriterio,
  type CriterioDoFiltro,
} from '../../dominios/legislacao/filtros';
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
import { AcoesDoDispositivo, type AlvoDasAcoes } from './AcoesDoDispositivo';
import { BuscaNaNorma, type TextosDaBusca } from './BuscaNaNorma';
import { BotaoDaEstrela } from './Estrela';
import { dispositivosComErro } from './errosVinculados';
import { FiltroDaNorma, type OpcaoDeBloco } from './FiltroDaNorma';
import { pedacosDoTexto, type MarcasDoTexto, type RemissaoNoTexto } from './destacar';
import { PreviaDaRemissao, type EstadoDaPrevia } from './PreviaDaRemissao';
import { criarResolvedorDeRemissoes, type ResolvedorDeRemissoes } from './remissoes';
import { fraseDaEstrela, rotuloTipo } from './rotulos';
import { LegendaDestaques } from './LegendaDestaques';
import { AcoesDaSelecao, AcoesDoGrifo, DialogoDaNota } from './Marcacoes';
import {
  ATRIBUTO_FORA_DO_TEXTO,
  CLASSE_DO_TEXTO,
  lerSelecao,
  type SelecaoNoTexto,
} from './selecao';
import { useEstrelas } from './usarEstrelas';
import { marcasDoTexto, useMarcacoes } from './usarMarcacoes';
import {
  blocosAcima,
  estimarAltura,
  fimDaUnidade,
  janelasQueCobrem,
  linhaDoNo,
  montarLinhas,
  referenciaDe,
  referenciaDoNo,
  TEXTOS_POR_PEDIDO,
  unidadeDaLinha,
  unidadesDeLeitura,
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
/** Quanto tempo a origem da estrela fica por extenso acima do grupo fixo, depois do toque. */
const AVISO_DA_ESTRELA = 4_000;

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
/** `?foco=artigo` (11.8): o modo foco com um artigo por vez. */
const VALOR_DO_ARTIGO = 'artigo';
/** Quanto o dedo precisa andar de lado para virar o artigo, e quanto mais de lado que de cima. */
const DESLIZE_MINIMO = 70;
/** Linhas do vizinho que aparecem esmaecidas acima e abaixo do cartão. */
const LINHAS_DO_VIZINHO = 5;

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

/** O filtro do leitor (11.3) aplicado: o critério, a frase da tela e os nós, guardados na hora. */
interface FiltroAplicado {
  criterio: CriterioDoFiltro;
  /** "estrelados", "Art. 5º a Art. 20": a frase "Mostrando só: …". */
  descricao: string;
  /** Os nós que casam e os que casam mais o contexto (índices em `NormaAberta.nos`). */
  casados: ReadonlySet<number>;
  visiveis: ReadonlySet<number>;
  /** Quantos dispositivos casam (a rubrica não conta: é da linha do pai). */
  quantos: number;
  /** O bloco escolhido, para o diálogo abrir nele. */
  blocoIndice?: number;
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
  const linhasTodas = useMemo(() => montarLinhas(nos), [nos]);
  // Filtro do leitor (11.3): o que foi aplicado e o resultado, guardado na hora de aplicar (um
  // artigo que perde a estrela com o filtro ligado continua à vista, para poder estrelar de novo).
  const [filtro, setFiltro] = useState<FiltroAplicado | undefined>(undefined);
  const linhas = useMemo(
    () => (filtro ? linhasTodas.filter((l) => filtro.visiveis.has(l.indice)) : linhasTodas),
    [linhasTodas, filtro],
  );
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
  // Artigo por artigo (11.8): o modo foco com o cartão de um artigo no lugar da lista.
  const porArtigo = busca.get(PARAMETRO_DO_FOCO) === VALOR_DO_ARTIGO;
  const porArtigoAgora = useRef(porArtigo);

  // A linha da posição guardada. A primeira linha é o começo: abre no alto da página, com a barra.
  // Sair do artigo por artigo volta a lista à posição do artigo (`vez` refaz a volta).
  const [retorno, setRetorno] = useState<{ linha: number | undefined; vez: number }>(() => {
    const linha = alvo === undefined ? undefined : linhaDoNo(linhasTodas, alvo);
    return { linha: linha === 0 ? undefined : linha, vez: 0 };
  });
  const linhaInicial = retorno.linha;
  const [voltando, setVoltando] = useState(linhaInicial !== undefined && !porArtigo);
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
    if (porArtigo) {
      // O cartão não tem a lista para voltar: a volta é de quando ela reaparecer.
      voltandoAgora.current = false;
      return;
    }
    if (linhaInicial === undefined) {
      voltandoAgora.current = false;
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
  }, [virtualizador, linhaInicial, retorno.vez, porArtigo]);

  // Artigo por artigo (11.8). `artigoAtual` é um nó (índice em `nos`); o artigo mostrado é a unidade
  // que o contém (o título e o capítulo valem o primeiro artigo abaixo deles). Derivado das linhas de
  // agora, então o filtro (11.3) vale sem conta a mais: o artigo que o filtro escondeu vira o mais
  // próximo que ficou.
  const [artigoAtual, setArtigoAtual] = useState(alvo ?? 0);
  const unidades = useMemo(() => unidadesDeLeitura(linhas, nos), [linhas, nos]);
  const ordem = useMemo(
    () => unidadeDaLinha(linhas, unidades, linhaDoNo(linhas, artigoAtual) ?? 0),
    [linhas, unidades, artigoAtual],
  );
  const cartao = useRef<HTMLElement | null>(null);
  // O dispositivo do artigo mostrado: o "alto da tela" do cartão.
  const artigoNoAlto = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    porArtigoAgora.current = porArtigo;
    const inicio = ordem === undefined ? undefined : unidades[ordem];
    const no = inicio === undefined ? undefined : linhas[inicio]?.indice;
    artigoNoAlto.current = no === undefined ? undefined : nos[no]?.dispositivo.id;
  });
  // Entrar tira a rolagem da página (o cartão é o que se lê); sair devolve a lista ao artigo que
  // estava no cartão, com a mesma volta da posição guardada (9.7). Vale também para o "voltar" do
  // navegador, que muda só a rota. Antes do efeito do modo foco, que respeita a volta em curso.
  const porArtigoAntes = useRef(porArtigo);
  useLayoutEffect(() => {
    const antes = porArtigoAntes.current;
    porArtigoAntes.current = porArtigo;
    if (antes && !porArtigo) {
      const inicio = ordem === undefined ? undefined : unidades[ordem];
      const linha = inicio ?? linhaDoNo(linhas, artigoAtual);
      const volta = linha === 0 ? undefined : linha;
      voltandoAgora.current = volta !== undefined;
      setVoltando(volta !== undefined);
      setRetorno((r) => ({ linha: volta, vez: r.vez + 1 }));
    } else if (!antes && porArtigo) {
      window.scrollTo(0, 0);
    }
  }, [porArtigo, ordem, unidades, linhas, artigoAtual]);

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
    if (trocou && !voltandoAgora.current && item !== undefined && !porArtigoAgora.current) {
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

  // Navegação do artigo por artigo (11.8); as funções ficam em refs para o ouvinte de teclado não
  // ser refeito a cada artigo.
  const irAoProximo = useRef<() => void>(() => undefined);
  const irAoAnterior = useRef<() => void>(() => undefined);
  // Atalho: F entra e sai; Esc também sai. Fora de campo de texto e de diálogo aberto (a tecla é
  // deles), sem Ctrl/Alt/Cmd (Ctrl+F é a busca do navegador) e sem repetir com a tecla presa.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || teclaForaDosAtalhos(e)) return;
      if (
        porArtigo &&
        (e.key === 'ArrowRight' || e.key === 'ArrowLeft') &&
        !e.shiftKey &&
        document.getSelection()?.isCollapsed !== false
      ) {
        e.preventDefault();
        (e.key === 'ArrowRight' ? irAoProximo : irAoAnterior).current();
        return;
      }
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
  }, [modoFoco, porArtigo, alternarFoco]);

  const visiveis = virtualizador.getVirtualItems();
  const primeiraVisivel = visiveis[0]?.index;
  const ultimaVisivel = visiveis.at(-1)?.index;
  useEffect(() => {
    if (porArtigo || primeiraVisivel === undefined || ultimaVisivel === undefined) return;
    if (filtro) {
      // Com filtro, as linhas vizinhas na tela podem estar longe na norma: cada uma pede o seu texto
      // (o intervalo entre a primeira e a última leria a norma toda).
      for (let k = primeiraVisivel; k <= ultimaVisivel; k++) {
        const linha = linhas[k];
        if (linha) pedir(linha.indice, linha.indiceNome ?? linha.indice);
      }
      return;
    }
    const inicio = linhas[primeiraVisivel]?.indice ?? 0;
    const ultima = linhas[ultimaVisivel];
    const fim = ultima?.indiceNome ?? ultima?.indice ?? inicio;
    pedir(inicio - MARGEM_DE_TEXTOS, fim + MARGEM_DE_TEXTOS);
  }, [porArtigo, primeiraVisivel, ultimaVisivel, linhas, filtro, pedir, tentativa]);

  // Artigo por artigo (11.8): os textos do artigo, dos vizinhos que aparecem esmaecidos e dos blocos
  // acima dele (o contexto do alto do cartão). Um pedido por unidade: com o filtro, os vizinhos
  // podem estar longe, e o intervalo entre eles leria a norma toda.
  useEffect(() => {
    if (!porArtigo || ordem === undefined) return;
    for (const o of [ordem - 1, ordem, ordem + 1]) {
      const inicio = linhas[unidades[o] ?? -1];
      const ultima = linhas[fimDaUnidade(linhas, unidades, o) - 1];
      if (inicio && ultima) pedir(inicio.indice, ultima.indiceNome ?? ultima.indice);
    }
    const primeira = linhas[unidades[ordem] ?? -1];
    if (primeira) {
      for (const bloco of blocosAcima(nos, aberta.indiceDe, primeira.indice))
        pedir(bloco, bloco + 1);
    }
  }, [porArtigo, ordem, unidades, linhas, nos, aberta.indiceDe, pedir, tentativa]);

  /** O dispositivo da linha no alto da tela, logo abaixo da barra fixa. */
  const noDoAlto = useCallback((): string | undefined => {
    // No cartão, o "alto da tela" é o artigo mostrado.
    if (porArtigoAgora.current) return artigoNoAlto.current;
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
  const agendarGravacao = useRef<() => void>(() => undefined);
  // Artigo por artigo: a posição é o artigo mostrado, gravada ao parar nele (como a rolagem parada).
  useEffect(() => {
    if (!porArtigo || artigoNoAlto.current === undefined) return;
    posicao.current = artigoNoAlto.current;
    agendarGravacao.current();
  }, [porArtigo, ordem, unidades]);

  useEffect(() => {
    vivo.current = true;
    rolagem.current = window.scrollY;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const acompanhar = () => {
      // No cartão a posição é o artigo, e muda quando ele muda (não pela rolagem da página).
      if (porArtigoAgora.current) return;
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
    agendarGravacao.current = () => {
      clearTimeout(espera);
      espera = setTimeout(gravar, ESPERA_PARA_GRAVAR);
    };
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('pagehide', aoEsconder);
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => {
      clearTimeout(espera);
      agendarGravacao.current = () => undefined;
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

  function marcarLidoAteNo(id: string, indice: number, anunciar: boolean) {
    const antes = lidoAte;
    setLidoAte(id);
    setFalhaAoMarcar(false);
    if (anunciar) setAnuncio(`Lido até ${referenciaDoNo(nos, aberta.indiceDe, indice)}.`);
    marcarLidoAte(repo, norma.id, id).catch(() => {
      if (!vivo.current) return;
      setLidoAte(antes);
      setAnuncio('');
      setFalhaAoMarcar(true);
    });
  }
  function marcarAqui() {
    const id = noDoAlto();
    const indice = id === undefined ? undefined : aberta.indiceDe.get(id);
    if (id === undefined || indice === undefined) return;
    marcarLidoAteNo(id, indice, true);
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

  // Filtro (11.3). Depois de trocar o filtro, a lista é outra: o leitor volta ao dispositivo que
  // estava no alto da tela (ou ao mais próximo acima dele que ficou) quando as linhas novas já
  // estão desenhadas. `irDepois` guarda o dispositivo (índice do nó) até lá.
  const irDepois = useRef<number | undefined>(undefined);
  useEffect(() => {
    const indice = irDepois.current;
    if (indice === undefined) return;
    irDepois.current = undefined;
    // No cartão não há rolagem da lista: o artigo é o que a conta das linhas de agora dá.
    if (porArtigoAgora.current) return;
    const linha = linhaDoNo(linhas, indice);
    if (linha === undefined || linha === 0) window.scrollTo(0, 0);
    else irParaLinha(linha);
  }, [linhas, irParaLinha]);
  /** O nó tem linha na lista de agora (o filtro não o escondeu; a rubrica vale a linha do pai). */
  const visivelNoFiltro = (indice: number) => {
    if (!filtro) return true;
    const linha = linhas[linhaDoNo(linhas, indice) ?? -1];
    return linha !== undefined && (linha.indice === indice || linha.indiceNome === indice);
  };
  /**
   * Leva o nó ao alto da tela. Se o filtro o escondeu, o filtro é desligado (avisando): ir até um
   * dispositivo e não achá-lo seria pior do que perder o filtro.
   */
  function irAoNo(indice: number): boolean {
    if (porArtigo) setArtigoAtual(indice);
    if (!visivelNoFiltro(indice)) {
      irDepois.current = indice;
      setFiltro(undefined);
      return true;
    }
    if (porArtigo) return false;
    const linha = linhaDoNo(linhas, indice);
    if (linha !== undefined) irParaLinha(linha);
    return false;
  }

  function irAoLidoAte() {
    if (indiceLidoAte === undefined) return;
    if (irAoNo(indiceLidoAte)) setAnuncio('Filtro desligado para mostrar onde você parou.');
  }

  // Artigo por artigo (11.8): a frase do artigo para o leitor de tela, e a navegação.
  const nomeDaUnidade = (o: number) => {
    const linha = linhas[unidades[o] ?? 0];
    const no = linha === undefined ? undefined : nos[linha.indice];
    if (!linha || !no) return '';
    return referenciaDoNo(nos, aberta.indiceDe, linha.indice) || rotuloTipo(no.dispositivo.tipo, 1);
  };
  const fraseDaUnidade = (o: number) =>
    `${nomeDaUnidade(o)}, ${String(o + 1)} de ${String(unidades.length)}.`;
  const fraseDoArtigo = (indice: number) => {
    const o = unidadeDaLinha(linhas, unidades, linhaDoNo(linhas, indice) ?? 0);
    return o === undefined ? 'Nenhum artigo para ler aqui.' : fraseDaUnidade(o);
  };
  const definirArtigoDoAlto = () => {
    const id = noDoAlto();
    const indice = id === undefined ? undefined : aberta.indiceDe.get(id);
    if (indice !== undefined) setArtigoAtual(indice);
    return indice ?? artigoAtual;
  };
  // O botão "Por artigo" / "Texto corrido": de fora do modo foco, entra direto no artigo (uma
  // entrada no histórico, como o modo foco); dentro dele, troca a rota no lugar, sem empilhar nada.
  function alternarArtigo() {
    if (!modoFoco) {
      if (pedidaNaRota.current === chaveDaRota) return;
      pedidaNaRota.current = chaveDaRota;
      const estado: EstadoDoFoco = { entrouNoFoco: true };
      const indice = definirArtigoDoAlto();
      setAnuncio(`Artigo por artigo. ${fraseDoArtigo(indice)}`);
      setBusca({ [PARAMETRO_DO_FOCO]: VALOR_DO_ARTIGO }, { state: estado });
    } else if (!porArtigo) {
      const indice = definirArtigoDoAlto();
      setAnuncio(`Artigo por artigo. ${fraseDoArtigo(indice)}`);
      setBusca({ [PARAMETRO_DO_FOCO]: VALOR_DO_ARTIGO }, { replace: true, state: estadoDaRota });
    } else {
      setAnuncio('Modo foco: só o texto.');
      setBusca({ [PARAMETRO_DO_FOCO]: 'texto' }, { replace: true, state: estadoDaRota });
    }
  }

  function irParaUnidade(nova: number) {
    const linha = linhas[unidades[nova] ?? -1];
    if (!linha || ordem === undefined || nova === ordem) return;
    if (nova > ordem) {
      // Passar ao próximo é ter lido o que ficou para trás: o "lido até" avança sozinho, e só
      // avança (voltar, ou ir a um artigo já lido, nunca o recua).
      const saindo = linhas[unidades[ordem] ?? -1]?.indice;
      const saindoId = saindo === undefined ? undefined : nos[saindo]?.dispositivo.id;
      if (saindo !== undefined && saindoId !== undefined) {
        if (indiceLidoAte === undefined || saindo > indiceLidoAte) {
          marcarLidoAteNo(saindoId, saindo, false);
        }
      }
    }
    setArtigoAtual(linha.indice);
    setAnuncio(fraseDaUnidade(nova));
  }
  useEffect(() => {
    irAoProximo.current = () => {
      if (ordem !== undefined && ordem + 1 < unidades.length) irParaUnidade(ordem + 1);
    };
    irAoAnterior.current = () => {
      if (ordem !== undefined && ordem > 0) irParaUnidade(ordem - 1);
    };
  });
  // Cada artigo novo abre no alto: o cartão e a página voltam ao começo.
  useEffect(() => {
    if (!porArtigo) return;
    if (cartao.current) cartao.current.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [porArtigo, ordem]);

  // Busca dentro da norma (11.6). O leitor só tem os textos perto da tela: na primeira busca, lê
  // todos os da versão (uma vez por visita). A consulta fica guardada enquanto a norma está aberta.
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [textosDaBusca, setTextosDaBusca] = useState<TextosDaBusca | undefined>(undefined);
  const [achadoId, setAchadoId] = useState<string | undefined>(undefined);
  // O achado da busca num artigo longo: o cartão rola até ele.
  useEffect(() => {
    if (!porArtigo || achadoId === undefined) return;
    cartao.current?.querySelector('.achado-da-busca')?.scrollIntoView({ block: 'nearest' });
  }, [porArtigo, achadoId, ordem]);
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
  const resolverRemissoes = useMemo(
    () => criarResolvedorDeRemissoes(indiceDoEndereco),
    [indiceDoEndereco],
  );
  // A referência da linha que mostra o nó (a rubrica é mostrada na linha do artigo).
  const referenciaDaBusca = useCallback(
    (indice: number) => {
      const linha = linhaDoNo(linhasTodas, indice);
      const doNo = linha === undefined ? indice : (linhasTodas[linha]?.indice ?? indice);
      return referenciaDoNo(nos, aberta.indiceDe, doNo) || 'Início da norma';
    },
    [linhasTodas, nos, aberta.indiceDe],
  );
  // Prévia de remissões (11.9). Tocar numa citação ("art. 84, XIX") abre o dispositivo citado num
  // balão (desktop) ou folha inferior (celular), sem sair do lugar. "Ir para" empilha de onde se
  // veio; "Voltar" desempilha. O "lido até" não muda (segue a rolagem, como sempre).
  const [previa, setPrevia] = useState<{ origem: number | undefined; alvo: number } | undefined>(
    undefined,
  );
  const [dadosDaPrevia, setDadosDaPrevia] = useState<EstadoDaPrevia | undefined>(undefined);
  const [pilhaDeRemissoes, setPilhaDeRemissoes] = useState<number[]>([]);
  const alvoDaPrevia = previa?.alvo;
  useEffect(() => {
    if (alvoDaPrevia === undefined) return;
    let ativo = true;
    lerJanela(repo, aberta, { inicio: alvoDaPrevia, quantidade: 2 }).then(
      ([item, seguinte]) => {
        if (!ativo) return;
        const dispositivo = item?.dispositivo;
        if (!item || !dispositivo) {
          setDadosDaPrevia({ estado: 'falha' });
          return;
        }
        const rubrica =
          seguinte?.dispositivo.tipo === 'nome' && seguinte.dispositivo.paiId === dispositivo.id
            ? textoDe(seguinte)
            : '';
        setDadosDaPrevia({
          rubrica,
          texto: item.texto ? <TrechosDoTexto trechos={item.texto.trechos} /> : null,
          aviso: AVISO_DE_STATUS[dispositivo.status],
          notas: item.texto?.notasVigencia?.map((n) => n.texto) ?? [],
        });
      },
      () => {
        if (ativo) setDadosDaPrevia({ estado: 'falha' });
      },
    );
    return () => {
      ativo = false;
    };
  }, [repo, aberta, alvoDaPrevia]);
  function irParaRemissao() {
    if (!previa) return;
    const { origem, alvo } = previa;
    setPrevia(undefined);
    if (origem !== undefined) setPilhaDeRemissoes((p) => [...p, origem]);
    const desligou = irAoNo(alvo);
    setAnuncio(
      `Aberto: ${referenciaDaBusca(alvo)}.${desligou ? ' Filtro desligado para mostrar o dispositivo.' : ''}`,
    );
  }
  const origemDoVoltar = pilhaDeRemissoes.at(-1);
  function voltarDaRemissao() {
    if (origemDoVoltar === undefined) return;
    setPilhaDeRemissoes((p) => p.slice(0, -1));
    const desligou = irAoNo(origemDoVoltar);
    setAnuncio(
      `De volta a ${referenciaDaBusca(origemDoVoltar)}.${desligou ? ' Filtro desligado para mostrar o dispositivo.' : ''}`,
    );
  }
  // O "lido até" não muda: ir a um achado é só rolar (a posição segue a rolagem, como sempre).
  function irParaAchado(indice: number) {
    const linha = linhaDoNo(linhasTodas, indice);
    setBuscaAberta(false);
    if (linha === undefined) return;
    setAchadoId(nos[linhasTodas[linha]?.indice ?? 0]?.dispositivo.id);
    const desligou = irAoNo(indice);
    setAnuncio(
      `Na busca: ${referenciaDaBusca(indice)}.${desligou ? ' Filtro desligado para mostrar o achado.' : ''}`,
    );
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
    if (indice === undefined) return '';
    // Sem rótulo (o preâmbulo), o tipo: "Preâmbulo".
    const tipo = nos[indice]?.dispositivo.tipo;
    return referenciaDoNo(nos, aberta.indiceDe, indice) || (tipo ? rotuloTipo(tipo, 1) : '');
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
    const citacao = alvo.closest<HTMLElement>('[data-remissao]');
    if (citacao?.dataset.remissao) {
      // O clique que termina uma seleção (arrastar por cima da citação) é da seleção.
      if (!porTeclado && document.getSelection()?.isCollapsed === false) return false;
      const id = citacao.closest<HTMLElement>('[data-dispositivo]')?.dataset.dispositivo;
      setSelecao(undefined);
      setEscolhidaId(undefined);
      setDadosDaPrevia(undefined);
      setPrevia({
        origem: id === undefined ? undefined : aberta.indiceDe.get(id),
        alvo: Number(citacao.dataset.remissao),
      });
      return true;
    }
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

  // Estrela (11.2): o controle fica na calha de cada linha que pode ter estrela (nunca no grupo
  // fixo: agiria sobre qual dispositivo?). Tocar põe ou tira; a origem nova aparece por extenso,
  // por um instante, acima do grupo fixo (e é anunciada), e fica no nome acessível do botão.
  const arvore = useMemo(() => arvoreDaEstrela(norma.id, nos), [norma.id, nos]);
  const estrelas = useEstrelas(repo, arvore, vivo);
  const [avisoDaEstrela, setAvisoDaEstrela] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (avisoDaEstrela === undefined) return;
    const tempo = window.setTimeout(() => {
      setAvisoDaEstrela(undefined);
    }, AVISO_DA_ESTRELA);
    return () => {
      window.clearTimeout(tempo);
    };
  }, [avisoDaEstrela]);
  function alternarEstrelaDe(alvoId: string) {
    void estrelas.alternar(alvoId).then((estado) => {
      if (!estado) return;
      const frase = fraseDaEstrela(referenciaDoDispositivo(alvoId), estado, (id) =>
        referenciaDoDispositivo(id),
      );
      setAvisoDaEstrela(frase);
      setAnuncio(frase);
    });
  }

  // Filtros (11.3): a lista mostra só o que casa e o contexto. Aplicar guarda o resultado (não
  // recalcula a cada estrela, para o artigo não sumir sob o dedo); "Atualizar" refaz a conta.
  const [filtroAberto, setFiltroAberto] = useState(false);
  // Ações por dispositivo (11.5): agem no dispositivo do alto da tela, ou, sem texto nele (um
  // título, um capítulo), no primeiro com texto logo abaixo, que é o que está à vista.
  const [alvoDasAcoes, setAlvoDasAcoes] = useState<AlvoDasAcoes | undefined>(undefined);
  function abrirAcoes() {
    const id = noDoAlto() ?? posicao.current;
    const indice = id === undefined ? undefined : aberta.indiceDe.get(id);
    if (indice === undefined) return;
    // As linhas à vista (com o filtro, só as que ficaram), não todos os nós: o de baixo é o de baixo na tela.
    let alvo = indice;
    for (let i = linhaDoNo(linhas, indice) ?? linhas.length; i < linhas.length; i++) {
      const proximo = linhas[i]?.indice;
      if (proximo !== undefined && nos[proximo]?.dispositivo.categoria !== 'estrutural') {
        alvo = proximo;
        break;
      }
    }
    const no = nos[alvo];
    if (!no) return;
    const trechos = textos.get(alvo)?.texto?.trechos;
    const texto =
      no.dispositivo.categoria === 'estrutural' || trechos === undefined
        ? undefined
        : trechos
            .filter((t) => t.tachado !== true)
            .map((t) => t.texto)
            .join('')
            .trim() || undefined;
    const referencia = referenciaDe(nos, aberta.indiceDe, alvo, norma.tituloCurto);
    const rotulo = referenciaDoNo(nos, aberta.indiceDe, alvo);
    setAlvoDasAcoes({
      dispositivoId: no.dispositivo.id,
      nome: rotulo || rotuloTipo(no.dispositivo.tipo, 1),
      referencia,
      texto,
    });
  }
  const [falhaDoFiltro, setFalhaDoFiltro] = useState<string | undefined>(undefined);
  const blocos = useMemo(() => blocosDaNorma(nos), [nos]);
  function trocarFiltro(novo: FiltroAplicado | undefined) {
    if (novo === undefined && filtro === undefined) return;
    const id = noDoAlto();
    irDepois.current = (id === undefined ? undefined : aberta.indiceDe.get(id)) ?? 0;
    setFiltro(novo);
  }
  async function aplicarCriterio(
    criterio: CriterioDoFiltro,
    descricaoDoTrecho?: string,
    blocoIndice?: number,
  ): Promise<string | undefined> {
    let comErros: ReadonlySet<string> = new Set();
    if (criterio.tipo === 'com_erros') {
      try {
        comErros = await dispositivosComErro(repo, aberta.indiceDe);
      } catch {
        return 'Não foi possível ler os erros. Tente de novo.';
      }
      if (!vivo.current) return undefined;
    }
    const resultado = aplicarFiltro(nos, aberta.indiceDe, criterio, {
      estrelas: estrelas.estados,
      marcados: new Set(marcacoes.porDispositivo.keys()),
      comErros,
    });
    let quantos = 0;
    for (const i of resultado.casados) if (nos[i]?.dispositivo.tipo !== 'nome') quantos++;
    const descricao = nomeDoCriterio(criterio, descricaoDoTrecho);
    trocarFiltro({ criterio, descricao, ...resultado, quantos, blocoIndice });
    setFalhaDoFiltro(undefined);
    setFiltroAberto(false);
    setAnuncio(
      quantos === 0
        ? `Nenhum dispositivo ${descricao}.`
        : `Mostrando só: ${descricao}, ${String(quantos)} ${quantos === 1 ? 'dispositivo' : 'dispositivos'}.`,
    );
    return undefined;
  }
  function mostrarTudo() {
    trocarFiltro(undefined);
    setFalhaDoFiltro(undefined);
    setFiltroAberto(false);
    setAnuncio('Mostrando a norma toda.');
  }
  function atualizarFiltro() {
    if (!filtro) return;
    const { criterio, descricao, blocoIndice } = filtro;
    void aplicarCriterio(
      criterio,
      criterio.tipo === 'trecho' ? descricao : undefined,
      blocoIndice,
    ).then((falha) => {
      if (falha) setFalhaDoFiltro(falha);
    });
  }

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

  // O que a lista e o cartão desenham de uma linha: o dispositivo e a marca do "lido até".
  function propriedadesDaLinha(linha: LinhaDoLeitor) {
    const dispositivo = nos[linha.indice]?.dispositivo;
    const id = dispositivo?.id ?? '';
    const estado = dispositivo && estrelavel(dispositivo) ? estrelas.estados.get(id) : undefined;
    return {
      className: id === achadoId ? 'linha-leitor achado-da-busca' : 'linha-leitor',
      'data-estrelada': estado?.estrelado ? '' : undefined,
      'data-contexto': filtro && !filtro.casados.has(linha.indice) ? '' : undefined,
    };
  }
  function conteudoDaLinha(linha: LinhaDoLeitor) {
    const dispositivo = nos[linha.indice]?.dispositivo;
    const id = dispositivo?.id ?? '';
    const estado = dispositivo && estrelavel(dispositivo) ? estrelas.estados.get(id) : undefined;
    return (
      <>
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
          resolverRemissoes={resolverRemissoes}
          estrela={
            estado && (
              <BotaoDaEstrela
                alvoId={id}
                alvo={referenciaDoDispositivo(id)}
                estado={estado}
                nomeDaOrigem={estado.deId ? referenciaDoDispositivo(estado.deId) : ''}
              />
            )
          }
        />
        {id === lidoAte && <p className="marca-lido-ate">Lido até aqui</p>}
      </>
    );
  }
  // O toque no texto (estrela, grifo, marcador de nota) e o teclado nos grifos: um ouvinte só, na
  // lista ou no cartão.
  function aoClicarNaLista(e: ReactMouseEvent) {
    const estrela =
      e.target instanceof Element ? e.target.closest<HTMLElement>('[data-estrela-de]') : null;
    if (estrela?.dataset.estrelaDe) {
      alternarEstrelaDe(estrela.dataset.estrelaDe);
      return;
    }
    if (!escolherNoTexto(e.target, false) && escolhidaId !== undefined) {
      setEscolhidaId(undefined);
    }
  }
  function aoTeclarNaLista(e: ReactKeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ' ') && escolherNoTexto(e.target, true)) {
      e.preventDefault();
    }
  }

  // Artigo por artigo (11.8). O vizinho é só uma espiada: as primeiras linhas, esmaecidas e sem
  // interação (`inert`: nem foco, nem seleção, nem leitor de tela), no tom atenuado das cores.
  const rotuloDoCartao = ordem === undefined ? '' : nomeDaUnidade(ordem);
  const contextoDoCartao = useMemo(() => {
    const primeira = ordem === undefined ? undefined : linhas[unidades[ordem] ?? -1];
    if (!primeira) return '';
    return blocosAcima(nos, aberta.indiceDe, primeira.indice)
      .map((i) => {
        const rotulo = nos[i]?.dispositivo.rotulo ?? '';
        const nome = nos[i + 1]?.dispositivo.tipo === 'nome' ? textoDe(textos.get(i + 1)) : '';
        return [rotulo, nome].filter(Boolean).join(' ');
      })
      .filter(Boolean)
      .join(' › ');
  }, [ordem, linhas, unidades, nos, aberta.indiceDe, textos]);
  // Rodapé do cartão (11.9): os dispositivos que o artigo cita, sem repetir, na ordem do texto.
  const remissoesDoCartao = useMemo(() => {
    if (ordem === undefined) return [];
    const vistos = new Set<number>();
    const lista: { alvo: number; origem: number }[] = [];
    for (const linha of linhas.slice(unidades[ordem], fimDaUnidade(linhas, unidades, ordem))) {
      const dispositivo = nos[linha.indice]?.dispositivo;
      const trechos = textos.get(linha.indice)?.texto?.trechos;
      if (!dispositivo || !trechos || dispositivo.status === 'eficacia_cessada') continue;
      if (dispositivo.status === 'revogado' || dispositivo.status === 'vetado') continue;
      for (const r of resolverRemissoes(trechos, dispositivo.endereco)) {
        if (vistos.has(r.alvo)) continue;
        vistos.add(r.alvo);
        lista.push({ alvo: r.alvo, origem: linha.indice });
      }
    }
    return lista;
  }, [ordem, linhas, unidades, nos, textos, resolverRemissoes]);
  function vizinho(o: number, lado: 'anterior' | 'seguinte') {
    const inicio = unidades[o];
    if (inicio === undefined) return null;
    const fim = Math.min(fimDaUnidade(linhas, unidades, o), inicio + LINHAS_DO_VIZINHO);
    return (
      <div className={`vizinho vizinho-${lado}`} inert>
        {linhas.slice(inicio, fim).map((linha) => (
          <div key={linha.indice} className="linha-leitor">
            <Dispositivo
              aberta={aberta}
              linha={linha}
              item={textos.get(linha.indice)}
              nome={linha.indiceNome === undefined ? undefined : textos.get(linha.indiceNome)}
              expandido={false}
              alternar={alternar}
              destacar={false}
              marcacoes={undefined}
              escolhidaId={undefined}
              estrela={undefined}
            />
          </div>
        ))}
      </div>
    );
  }
  // Deslizar de lado vira o artigo (celular), mas nunca com um trecho selecionado: o toque que
  // arrasta a alça da seleção do grifo é da seleção.
  const toqueInicial = useRef<{ x: number; y: number } | null>(null);
  function comecouODeslize(e: ReactTouchEvent) {
    const toque = e.touches[0];
    toqueInicial.current =
      toque && e.touches.length === 1 ? { x: toque.clientX, y: toque.clientY } : null;
  }
  function terminouODeslize(e: ReactTouchEvent) {
    const inicio = toqueInicial.current;
    toqueInicial.current = null;
    const toque = e.changedTouches[0];
    if (!inicio || !toque || document.getSelection()?.isCollapsed === false) return;
    const dx = toque.clientX - inicio.x;
    const dy = toque.clientY - inicio.y;
    if (Math.abs(dx) < DESLIZE_MINIMO || Math.abs(dx) < 2 * Math.abs(dy)) return;
    (dx < 0 ? irAoProximo : irAoAnterior).current();
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
      {filtro && (
        <div className="filtro-ativo">
          {linhas.length > 0 ? (
            !modoFoco && (
              <p>
                <span>
                  Mostrando só: <strong>{filtro.descricao}</strong> (
                  {filtro.quantos.toLocaleString('pt-BR')}{' '}
                  {filtro.quantos === 1 ? 'dispositivo' : 'dispositivos'}), com o que está acima
                  deles.
                </span>
                {filtro.criterio.tipo !== 'trecho' && (
                  <button type="button" className="discreto" onClick={atualizarFiltro}>
                    Atualizar
                  </button>
                )}
                <button type="button" className="discreto" onClick={mostrarTudo}>
                  Mostrar tudo
                </button>
              </p>
            )
          ) : (
            <div role="status" className="aviso">
              <p>{semResultado(filtro.criterio)}</p>
              <div className="linha-acoes">
                <button type="button" onClick={mostrarTudo}>
                  Mostrar tudo
                </button>
                <button type="button" onClick={atualizarFiltro}>
                  Atualizar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {falhaDoFiltro && (
        <p role="alert" className="aviso falha">
          {falhaDoFiltro}
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
      {estrelas.falha && (
        <p role="alert" className="aviso falha">
          {estrelas.falha} Se continuar, feche as outras abas do Arretado.
        </p>
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
      {porArtigo ? (
        <div
          key="artigo"
          ref={definirLista}
          className="area-artigo"
          onClick={aoClicarNaLista}
          onKeyDown={aoTeclarNaLista}
          onTouchStart={comecouODeslize}
          onTouchEnd={terminouODeslize}
        >
          {ordem === undefined ? (
            <div role="status" className="aviso">
              <p>Nenhum artigo para ler por aqui.</p>
              <p className="dica">
                {filtro
                  ? 'O filtro deixou só títulos e capítulos. Mude o filtro ou volte ao texto corrido.'
                  : 'Esta norma não tem artigos. Volte ao texto corrido.'}
              </p>
            </div>
          ) : (
            <>
              <NavegacaoDoArtigo
                rotulo={rotuloDoCartao}
                posicao={ordem + 1}
                total={unidades.length}
                anterior={() => {
                  irAoAnterior.current();
                }}
                proximo={() => {
                  irAoProximo.current();
                }}
              />
              {vizinho(ordem - 1, 'anterior')}
              <section
                ref={cartao}
                className="cartao-artigo"
                aria-label={`${rotuloDoCartao}, ${String(ordem + 1)} de ${String(unidades.length)}`}
                tabIndex={0}
              >
                {contextoDoCartao && <p className="contexto-artigo">{contextoDoCartao}</p>}
                {linhas
                  .slice(unidades[ordem], fimDaUnidade(linhas, unidades, ordem))
                  .map((linha) => (
                    <div key={linha.indice} {...propriedadesDaLinha(linha)}>
                      {conteudoDaLinha(linha)}
                    </div>
                  ))}
                {remissoesDoCartao.length > 0 && (
                  <div className="remissoes-do-artigo">
                    <h3>Remissões deste artigo</h3>
                    <ul>
                      {remissoesDoCartao.map(({ alvo, origem }) => (
                        <li key={alvo}>
                          <button
                            type="button"
                            onClick={() => {
                              setDadosDaPrevia(undefined);
                              setPrevia({ origem, alvo });
                            }}
                          >
                            {referenciaDaBusca(alvo)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
              {vizinho(ordem + 1, 'seguinte')}
            </>
          )}
        </div>
      ) : (
        <div
          key="lista"
          ref={definirLista}
          className={voltando ? 'lista-leitor voltando' : 'lista-leitor'}
          aria-busy={voltando}
          style={{ height: virtualizador.getTotalSize() }}
          onClick={aoClicarNaLista}
          onKeyDown={aoTeclarNaLista}
        >
          {visiveis.map((virtual) => {
            const linha = linhas[virtual.index];
            if (!linha) return null;
            return (
              <div
                key={virtual.key}
                data-index={virtual.index}
                ref={virtualizador.measureElement}
                {...propriedadesDaLinha(linha)}
                style={{ transform: `translateY(${String(virtual.start - margem)}px)` }}
              >
                {conteudoDaLinha(linha)}
              </div>
            );
          })}
        </div>
      )}
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
          <>
            {avisoDaEstrela && (
              // Visível por um instante; quem anuncia é o `role="status"` abaixo.
              <p className="aviso-da-estrela" aria-hidden="true">
                <span>{avisoDaEstrela}</span>
              </p>
            )}
            <AcoesDaLeitura
              modoFoco={modoFoco}
              botaoDoFoco={botaoDoFoco}
              abrirBusca={abrirBusca}
              abrirFiltro={() => {
                setFiltroAberto(true);
              }}
              abrirAcoes={abrirAcoes}
              filtro={filtro?.descricao}
              alternarFoco={alternarFoco}
              porArtigo={porArtigo}
              alternarArtigo={alternarArtigo}
              marcarAqui={marcarAqui}
              voltarDaRemissao={
                origemDoVoltar === undefined
                  ? undefined
                  : { para: referenciaDaBusca(origemDoVoltar), voltar: voltarDaRemissao }
              }
            />
          </>
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
      <AcoesDoDispositivo
        alvo={alvoDasAcoes}
        aoFechar={() => {
          setAlvoDasAcoes(undefined);
        }}
      />
      <FiltroDaNorma
        aberto={filtroAberto}
        aoFechar={() => {
          setFiltroAberto(false);
        }}
        atual={filtro && { criterio: filtro.criterio, blocoIndice: filtro.blocoIndice }}
        blocos={blocos}
        indiceDoEndereco={indiceDoEndereco}
        referencia={referenciaDaBusca}
        aplicar={aplicarCriterio}
        mostrarTudo={mostrarTudo}
      />
      <PreviaDaRemissao
        aberta={previa !== undefined}
        titulo={previa === undefined ? '' : referenciaDaBusca(previa.alvo)}
        dados={dadosDaPrevia}
        irPara={irParaRemissao}
        aoFechar={() => {
          setPrevia(undefined);
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
  abrirFiltro,
  abrirAcoes,
  filtro,
  alternarFoco,
  porArtigo,
  alternarArtigo,
  marcarAqui,
  voltarDaRemissao,
}: {
  modoFoco: boolean;
  botaoDoFoco: RefObject<HTMLButtonElement | null>;
  abrirBusca: () => void;
  abrirFiltro: () => void;
  abrirAcoes: () => void;
  /** A frase do filtro ligado ("estrelados"), se há um. */
  filtro: string | undefined;
  alternarFoco: () => void;
  /** Artigo por artigo (11.8): o botão troca entre o cartão de um artigo e o texto corrido. */
  porArtigo: boolean;
  alternarArtigo: () => void;
  marcarAqui: () => void;
  /** Depois de "ir para" uma remissão (11.9): de onde se veio, e a volta. */
  voltarDaRemissao: { para: string; voltar: () => void } | undefined;
}) {
  return (
    <>
      {voltarDaRemissao && (
        <button
          type="button"
          className="voltar-da-remissao"
          title={`Voltar a ${voltarDaRemissao.para}`}
          onClick={voltarDaRemissao.voltar}
        >
          ← Voltar a {voltarDaRemissao.para}
        </button>
      )}
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
        type="button"
        className={filtro === undefined ? undefined : 'filtro-ligado'}
        aria-haspopup="dialog"
        aria-label={filtro === undefined ? 'Filtrar' : `Filtrado: ${filtro}. Mudar o filtro`}
        title={
          filtro === undefined
            ? 'Filtrar a norma: estrelados, com grifo ou nota, com erro, um trecho'
            : `Mostrando só: ${filtro}. Toque para mudar o filtro`
        }
        onClick={abrirFiltro}
      >
        {filtro === undefined ? 'Filtrar' : 'Filtrado'}
      </button>
      <button
        type="button"
        aria-haspopup="dialog"
        title="Ações do dispositivo no alto da tela: registrar erro, criar cartão, copiar a referência"
        onClick={abrirAcoes}
      >
        Ações
      </button>
      <button
        type="button"
        aria-pressed={porArtigo}
        title={
          porArtigo
            ? 'Voltar ao texto corrido, no modo foco'
            : 'Ler um artigo por vez, com os vizinhos esmaecidos (setas ← e →)'
        }
        onClick={alternarArtigo}
      >
        Por artigo
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

/** Anterior, posição e próximo do artigo por artigo (11.8). Desabilitado só no papel (`aria-disabled`): o foco não some. */
function NavegacaoDoArtigo({
  rotulo,
  posicao,
  total,
  anterior,
  proximo,
}: {
  rotulo: string;
  posicao: number;
  total: number;
  anterior: () => void;
  proximo: () => void;
}) {
  return (
    <nav className="navegacao-artigo" aria-label="Artigo por artigo">
      <button
        type="button"
        aria-disabled={posicao <= 1}
        aria-keyshortcuts="ArrowLeft"
        title="Artigo anterior (seta ←)"
        onClick={anterior}
      >
        ← Anterior
      </button>
      <p className="posicao-artigo">
        <strong>{rotulo}</strong>
        <span>
          {posicao.toLocaleString('pt-BR')} de {total.toLocaleString('pt-BR')}
        </span>
      </p>
      <button
        type="button"
        aria-disabled={posicao >= total}
        aria-keyshortcuts="ArrowRight"
        title="Próximo artigo (seta →)"
        onClick={proximo}
      >
        Próximo →
      </button>
    </nav>
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

/** Os tipos que são blocos da norma (o filtro por bloco da 11.3 lista estes). */
const TIPOS_DE_BLOCO: ReadonlySet<TipoDispositivo> = new Set([
  'parte',
  'livro',
  'titulo',
  'capitulo',
  'secao',
  'subsecao',
  'bloco',
]);

/** Os blocos com rótulo, com o caminho até eles ("TÍTULO II › CAPÍTULO I"): o capítulo se repete. */
function blocosDaNorma(nos: NormaAberta['nos']): OpcaoDeBloco[] {
  const caminho: string[] = [];
  const blocos: OpcaoDeBloco[] = [];
  nos.forEach(({ dispositivo, nivel }, indice) => {
    caminho.length = Math.min(caminho.length, nivel);
    if (!TIPOS_DE_BLOCO.has(dispositivo.tipo) || !dispositivo.rotulo) return;
    caminho[nivel] = dispositivo.rotulo;
    blocos.push({ indice, nivel, rotulo: caminho.filter(Boolean).join(' › ') });
  });
  return blocos;
}

/** O que a tela diz quando o filtro não acha nada, e o que fazer. */
function semResultado(criterio: CriterioDoFiltro): string {
  switch (criterio.tipo) {
    case 'estrelados':
      return 'Nenhum dispositivo estrelado nesta norma. Estrele um artigo ou um bloco inteiro pela estrela ao lado dele.';
    case 'marcados':
      return 'Nenhum grifo nem nota nesta norma. Selecione um trecho do texto para grifar ou anotar.';
    case 'com_erros':
      return 'Nenhum erro vinculado a dispositivos desta norma.';
    case 'trecho':
      return 'Nenhum dispositivo neste trecho.';
  }
}

function tipoDaLinha(nos: NormaAberta['nos'], linhas: LinhaDoLeitor[], i: number) {
  return nos[linhas[i]?.indice ?? 0]?.dispositivo.tipo ?? 'paragrafo';
}

/** O aviso da prévia de uma remissão para o dispositivo que não vale como o texto corrido. */
const AVISO_DE_STATUS: Partial<Record<DispositivoDoModelo['status'], string>> = {
  revogado: 'Este dispositivo foi revogado.',
  vetado: 'Este dispositivo foi vetado.',
  eficacia_cessada: 'A eficácia deste dispositivo cessou.',
  renumerado: 'Este dispositivo foi renumerado.',
};

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
  remissoes,
}: {
  trechos: Trechos;
  destacar?: boolean;
  marcas?: MarcasDoTexto;
  escolhidaId?: string;
  remissoes?: readonly RemissaoNoTexto[];
}) {
  const pedacos = pedacosDoTexto(trechos, destacar, marcas, remissoes);
  return pedacos.map(({ trecho, categoria, grifo, notas, remissao }, i) => {
    let conteudo = <>{trecho.texto}</>;
    if (categoria) conteudo = <span className={`destaque destaque-${categoria}`}>{conteudo}</span>;
    if (remissao) {
      conteudo = (
        <span
          className="remissao"
          role="button"
          data-remissao={remissao.alvo}
          // Um ponto de parada do teclado por citação, no primeiro pedaço dela.
          tabIndex={remissao.primeiro ? 0 : undefined}
          title="Citação: toque para ler o dispositivo citado"
        >
          {conteudo}
        </span>
      );
    }
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
  /** As remissões do texto vigente (11.9); ausente nos vizinhos esmaecidos. */
  resolverRemissoes?: ResolvedorDeRemissoes;
  /** O controle da estrela (11.2); ausente no que não leva estrela (revogado, vetado). */
  estrela: ReactNode;
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
  resolverRemissoes,
  estrela,
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
        {estrela}
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
      {estrela}
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
              remissoes={
                dispositivo.status === 'eficacia_cessada'
                  ? undefined
                  : resolverRemissoes?.(texto.trechos, dispositivo.endereco)
              }
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
