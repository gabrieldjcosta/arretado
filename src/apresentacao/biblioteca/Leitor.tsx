import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { TextoDeDispositivo } from '../../core/modelo';
import { alterarPreferencias, obterPreferencias } from '../../core/preferencias';
import type { Repositorio } from '../../core/persistencia';
import {
  abrirNorma,
  lerJanela,
  NormaIndisponivel,
  type ItemDaJanela,
  type NormaAberta,
} from '../../dominios/legislacao/leitor';
import { Esqueleto, Falha } from '../componentes/estados';
import { useDados, useRepositorio } from '../dados/contexto';
import {
  estimarAltura,
  janelasQueCobrem,
  montarLinhas,
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

type Trechos = TextoDeDispositivo['trechos'];

interface Aberta {
  aberta: NormaAberta;
  primeira: ItemDaJanela[];
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
    (async () => {
      const aberta = await abrirNorma(repo, normaId);
      // A primeira janela vem junto: a norma abre já com texto, sem esqueleto.
      const primeira = await lerJanela(repo, aberta, { inicio: 0, quantidade: TEXTOS_POR_PEDIDO });
      return { aberta, primeira };
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
function useTextos(repo: Repositorio, aberta: NormaAberta, primeira: ItemDaJanela[]) {
  const [textos, setTextos] = useState<ReadonlyMap<number, ItemDaJanela>>(
    () => new Map(primeira.map((item) => [item.indice, item])),
  );
  const [pedidas] = useState(() => new Set<number>([0]));
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

function LeitorAberto({ repo, aberta, primeira }: { repo: Repositorio } & Aberta) {
  const { norma, nos } = aberta;
  const linhas = useMemo(() => montarLinhas(nos), [nos]);
  const { textos, pedir, falhou, tentarDeNovo, tentativa } = useTextos(repo, aberta, primeira);
  const { dados: preferencias } = useDados(useCallback((r) => obterPreferencias(r), []));
  // Resposta imediata ao toque: o último valor pedido vale até a gravação confirmar. Dois toques
  // seguidos partem do valor pedido, não do gravado (que ainda pode ser o antigo).
  const [pedido, setPedido] = useState<number | null>(null);
  const tamanho = pedido ?? preferencias?.tamanhoFonte ?? TAMANHO_PADRAO;
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(new Set());
  const [margem, setMargem] = useState(0);

  // A lista começa abaixo da barra: o virtualizador precisa do deslocamento para achar o que
  // está na tela. Medido quando a lista entra, quando a janela muda de largura e quando a página
  // muda de altura (a barra quebra em duas linhas no celular).
  const lista = useRef<HTMLDivElement | null>(null);
  const definirLista = useCallback((elemento: HTMLDivElement | null) => {
    lista.current = elemento;
    if (elemento) setMargem(elemento.offsetTop);
  }, []);
  useEffect(() => {
    const medir = () => {
      setMargem(lista.current?.offsetTop ?? 0);
    };
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    observador?.observe(document.body);
    window.addEventListener('resize', medir);
    return () => {
      observador?.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, []);

  // Abre no começo: a posição lembrada é da 9.7.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const virtualizador = useWindowVirtualizer({
    count: linhas.length,
    estimateSize: (i) => estimarAltura(tipoDaLinha(nos, linhas, i), tamanho),
    overscan: LINHAS_DE_MARGEM,
    scrollMargin: margem,
    getItemKey: (i) => nos[linhas[i]?.indice ?? 0]?.dispositivo.id ?? i,
  });
  const { measure } = virtualizador;

  // Outro tamanho de texto muda a altura de todas as linhas, inclusive as que não estão na tela.
  useEffect(() => {
    measure();
  }, [tamanho, measure]);

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

  return (
    <div className="leitor">
      <div className="barra-leitor">
        <Link to="/biblioteca" className="botao discreto">
          ← Biblioteca
        </Link>
        <h1>{norma.tituloCurto}</h1>
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
      </div>
      {falhou && (
        <div role="alert" className="aviso falha">
          <p>Não foi possível carregar parte do texto.</p>
          <button type="button" onClick={tentarDeNovo}>
            Tentar de novo
          </button>
        </div>
      )}
      <div
        ref={definirLista}
        className="lista-leitor"
        style={{ height: virtualizador.getTotalSize() }}
      >
        {visiveis.map((virtual) => {
          const linha = linhas[virtual.index];
          if (!linha) return null;
          return (
            <div
              key={virtual.key}
              data-index={virtual.index}
              ref={virtualizador.measureElement}
              className="linha-leitor"
              style={{ transform: `translateY(${String(virtual.start - margem)}px)` }}
            >
              <Dispositivo
                aberta={aberta}
                linha={linha}
                item={textos.get(linha.indice)}
                nome={linha.indiceNome === undefined ? undefined : textos.get(linha.indiceNome)}
                expandido={abertos.has(aberta.nos[linha.indice]?.dispositivo.id ?? '')}
                alternar={alternar}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function tipoDaLinha(nos: NormaAberta['nos'], linhas: LinhaDoLeitor[], i: number) {
  return nos[linhas[i]?.indice ?? 0]?.dispositivo.tipo ?? 'paragrafo';
}

/** Os trechos do texto: ênfase, tachado parcial (redação anterior no meio do texto) e link. */
function TrechosDoTexto({ trechos }: { trechos: Trechos }) {
  return trechos.map((trecho, i) => {
    let conteudo = <>{trecho.texto}</>;
    if (trecho.enfase) conteudo = <em>{conteudo}</em>;
    if (trecho.tachado) conteudo = <del>{conteudo}</del>;
    if (trecho.link) {
      conteudo = (
        <a href={trecho.link} target="_blank" rel="noopener noreferrer">
          {conteudo}
        </a>
      );
    }
    return <Fragment key={i}>{conteudo}</Fragment>;
  });
}

const textoDe = (texto: ItemDaJanela | undefined) =>
  texto?.texto?.trechos.map((t) => t.texto).join('') ?? '';

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
}

/** Um dispositivo: estrutural como cabeçalho aninhado, normativo com recuo pelo nível. */
function Dispositivo({ aberta, linha, item, nome, expandido, alternar }: PropsDoDispositivo) {
  const no = aberta.nos[linha.indice];
  if (!no) return null;
  const { dispositivo } = no;
  const texto = item?.texto;
  const carregando = item === undefined || (linha.indiceNome !== undefined && nome === undefined);
  const nomeDoNo = textoDe(nome);
  const recuo = Math.min(linha.recuo, MAXIMO_DE_RECUO);
  const redacoes = texto?.redacoesAnteriores ?? [];
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

  if (dispositivo.status === 'revogado') {
    const temMais = notas.length > 0 || redacoes.length > 0 || (texto?.trechos.length ?? 0) > 0;
    const legenda = `${rotulo || 'Dispositivo'} — (revogado)`;
    return (
      <div
        className={`dispositivo revogado tipo-${dispositivo.tipo}`}
        data-recuo={recuo}
        data-endereco={dispositivo.endereco}
      >
        {temMais ? (
          <button
            type="button"
            className="alternar-linha linha-revogada"
            aria-expanded={expandido}
            onClick={alternarEste}
          >
            {legenda}
            <span aria-hidden="true">{expandido ? ' ▾' : ' ▸'}</span>
          </button>
        ) : (
          <p className="linha-revogada">{legenda}</p>
        )}
        {expandido && (
          <div className="revogado-aberto">
            {texto && texto.trechos.length > 0 && (
              <p className="texto-dispositivo">
                <TrechosDoTexto trechos={texto.trechos} />
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
          <TrechosDoTexto trechos={texto.trechos} />
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
