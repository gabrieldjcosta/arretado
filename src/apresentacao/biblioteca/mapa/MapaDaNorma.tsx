import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { Link, useParams } from 'react-router';
import type { Repositorio } from '../../../core/persistencia';
import {
  IncidenciaIndisponivel,
  type MapaDaNormaCarregado,
} from '../../../dominios/legislacao/incidencia-fonte';
import { lerJanela, type NormaAberta } from '../../../dominios/legislacao/leitor';
import {
  CLASSES,
  cobertura,
  concentracao,
  NOME_DA_CLASSE,
  parteCoberta,
  proximoTrecho,
  quadradosDoMapa,
  rotuloDoTrecho,
  type ClasseDoArtigo,
  type QuadradoDoMapa,
} from '../../../dominios/legislacao/mapa-da-norma';
import { AcaoAgora } from '../../componentes/AcaoAgora';
import { Esqueleto, Falha } from '../../componentes/estados';
import { Voltar } from '../../componentes/Voltar';
import { useDados, useRepositorio } from '../../dados/contexto';
import { useFonteIncidencia } from '../../dados/fonteIncidenciaContexto';
import { indiceDaEstrutura, RAIZ } from '../estrutura';
import { coberturaDaNorma, type CoberturaDaNorma } from './cobertura-da-norma';
import { lembrarVisitaAoMapa } from './visita';
import './mapa.css';

/** O Mapa da norma (AP-04): a faixa de cada artigo, o que a pessoa já cobriu e por onde começar. */
export function MapaDaNorma() {
  const { normaId } = useParams();
  return <MapaDaNormaAberta key={normaId} normaId={normaId ?? ''} />;
}

type Leitura = CoberturaDaNorma;

type Arquivo =
  | { estado: 'carregando' }
  | { estado: 'pronto'; carregado: MapaDaNormaCarregado | undefined }
  | { estado: 'falha'; motivo: IncidenciaIndisponivel['motivo'] };

const porcento = (parte: number) => `${String(Math.round(parte * 100))}%`;

function MapaDaNormaAberta({ normaId }: { normaId: string }) {
  const fonte = useFonteIncidencia();
  const carregar = useCallback((r: Repositorio) => coberturaDaNorma(r, normaId), [normaId]);
  const { dados, falha } = useDados(carregar);
  const acervoId = dados?.aberta.norma.origemAcervo?.id;

  const [arquivo, setArquivo] = useState<Arquivo>({ estado: 'carregando' });
  useEffect(() => {
    if (!dados) return;
    let ativo = true;
    (acervoId === undefined ? Promise.resolve(undefined) : fonte.mapaDaNorma(acervoId)).then(
      (carregado) => {
        if (ativo) setArquivo({ estado: 'pronto', carregado });
      },
      (excecao: unknown) => {
        if (!ativo) return;
        setArquivo({
          estado: 'falha',
          motivo: excecao instanceof IncidenciaIndisponivel ? excecao.motivo : 'formato_invalido',
        });
      },
    );
    return () => {
      ativo = false;
    };
  }, [fonte, dados, acervoId]);

  if (falha) {
    return (
      <Falha
        oQue="Não foi possível abrir a norma."
        oQueFazer="Volte à Biblioteca e tente de novo."
      />
    );
  }
  if (!dados || arquivo.estado === 'carregando') return <Esqueleto linhas={6} />;
  const mapa = arquivo.estado === 'pronto' ? arquivo.carregado : undefined;
  return (
    <Mapa
      normaId={normaId}
      leitura={dados}
      mapa={mapa}
      aviso={
        arquivo.estado === 'falha'
          ? arquivo.motivo === 'sem_rede'
            ? 'Sem rede para baixar as faixas de incidência desta vez. Depois do primeiro download, elas ficam guardadas no aparelho.'
            : 'Não foi possível ler o arquivo de incidência desta norma. Os quadrados mostram só o que você já cobriu.'
          : acervoId === undefined
            ? 'Esta norma não veio do acervo, então ainda não tem faixas de incidência. Os quadrados mostram o que você já cobriu.'
            : mapa === undefined
              ? 'Ainda não há faixas de incidência para esta norma. Os quadrados mostram o que você já cobriu.'
              : undefined
      }
    />
  );
}

/** O nome do bloco ou do artigo: a rubrica dobrada (`nome`) logo depois dele, se há. */
async function nomeDe(repo: Repositorio, aberta: NormaAberta, indice: number): Promise<string> {
  const proximo = aberta.nos[indice + 1]?.dispositivo;
  const pai = aberta.nos[indice]?.dispositivo.id;
  if (proximo?.tipo !== 'nome' || proximo.paiId !== pai) return '';
  const [item] = await lerJanela(repo, aberta, { inicio: indice + 1, quantidade: 1 });
  return (
    item?.texto?.trechos
      .map((t) => t.texto)
      .join('')
      .trim() ?? ''
  );
}

/** Em letra de frase: "DA APLICAÇÃO DA PENA" → "Da aplicação da pena". */
function emFrase(texto: string): string {
  if (texto !== texto.toLocaleUpperCase('pt-BR')) return texto;
  const baixo = texto.toLocaleLowerCase('pt-BR');
  return baixo.charAt(0).toLocaleUpperCase('pt-BR') + baixo.slice(1);
}

function Mapa({
  normaId,
  leitura,
  mapa,
  aviso,
}: {
  normaId: string;
  leitura: Leitura;
  mapa: MapaDaNormaCarregado | undefined;
  aviso: string | undefined;
}) {
  const repo = useRepositorio();
  const { aberta, lidoAte, marcados } = leitura;
  const quadrados = useMemo(() => quadradosDoMapa(aberta.nos, mapa?.dados), [aberta, mapa]);
  const cob = useMemo(
    () => cobertura(quadrados, lidoAte, marcados),
    [quadrados, lidoAte, marcados],
  );
  const conc = useMemo(() => concentracao(quadrados), [quadrados]);
  const trecho = useMemo(() => proximoTrecho(quadrados, cob.cobertos), [quadrados, cob]);
  const estrutura = useMemo(() => indiceDaEstrutura(aberta.nos), [aberta]);
  const noTrecho = (i: number) => trecho !== undefined && i >= trecho.de && i <= trecho.ate;

  // O nome do bloco do próximo trecho ("Da aplicação da pena"): texto que chega depois.
  const [blocoDoTrecho, setBlocoDoTrecho] = useState('');
  useEffect(() => {
    if (!trecho) return;
    const bloco = estrutura.dentroDe[quadrados[trecho.de]?.indice ?? 0] ?? RAIZ;
    if (bloco === RAIZ) return;
    let ativo = true;
    nomeDe(repo, aberta, bloco).then(
      (nome) => {
        if (ativo) setBlocoDoTrecho(emFrase(nome));
      },
      () => undefined,
    );
    return () => {
      ativo = false;
    };
  }, [repo, aberta, estrutura, quadrados, trecho]);

  // O quadrado escolhido (toque ou Enter): a leitura dele em palavras, com o nome do artigo.
  const [escolhido, setEscolhido] = useState<{ posicao: number; nome: string } | undefined>();
  const escolher = (posicao: number) => {
    const q = quadrados[posicao];
    if (!q) return;
    setEscolhido({ posicao, nome: '' });
    void nomeDe(repo, aberta, q.indice).then((nome) => {
      setEscolhido((atual) => (atual?.posicao === posicao ? { posicao, nome } : atual));
    });
  };

  // Um só quadrado no Tab; as setas percorrem a grade (as colunas são as da linha de cima).
  const grade = useRef<HTMLDivElement>(null);
  const [foco, setFoco] = useState(() => trecho?.de ?? 0);
  const colunas = () => {
    const filhos = grade.current?.children;
    if (!filhos || filhos.length === 0) return 1;
    const topo = (filhos[0] as HTMLElement).offsetTop;
    let n = 0;
    while (n < filhos.length && (filhos[n] as HTMLElement).offsetTop === topo) n++;
    return Math.max(1, n);
  };
  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    const passo: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: colunas(),
      ArrowUp: -colunas(),
    };
    let alvo: number | undefined;
    if (e.key in passo) alvo = foco + (passo[e.key] ?? 0);
    else if (e.key === 'Home') alvo = 0;
    else if (e.key === 'End') alvo = quadrados.length - 1;
    if (alvo === undefined) return;
    e.preventDefault();
    const limitado = Math.min(quadrados.length - 1, Math.max(0, alvo));
    setFoco(limitado);
    (grade.current?.children[limitado] as HTMLElement | undefined)?.focus();
  };
  const aoClicar = (e: MouseEvent<HTMLDivElement>) => {
    const botao = (e.target as HTMLElement).closest('button');
    const posicao = botao?.dataset.posicao;
    if (posicao === undefined) return;
    setFoco(Number(posicao));
    escolher(Number(posicao));
  };

  const descricao = (q: QuadradoDoMapa, posicao: number) =>
    [
      q.rotulo,
      NOME_DA_CLASSE[q.classe],
      ...(q.foraDeVigor ? ['fora de vigor'] : []),
      ...(cob.cobertos[posicao] ? ['você já cobriu'] : []),
      ...(noTrecho(posicao) ? ['próximo trecho'] : []),
    ].join(', ');

  useEffect(() => {
    lembrarVisitaAoMapa();
  }, []);
  const titulo = aberta.norma.tituloCurto;
  const recorte = mapa?.recorte;
  const q = escolhido === undefined ? undefined : quadrados[escolhido.posicao];
  return (
    <div className="mapa-da-norma">
      <Voltar para={`/biblioteca/normas/${normaId}`} nome={`Voltar a ${titulo}`}>
        {titulo}
      </Voltar>
      <h1>Mapa da norma</h1>
      {recorte && (
        <p className="procedencia">
          {recorte.titulo}
          {recorte.questoes !== undefined &&
            ` · ${recorte.questoes.toLocaleString('pt-BR')} questões lidas`}
          {recorte.periodo !== undefined && ` · ${recorte.periodo}`}
        </p>
      )}
      {aviso !== undefined && <p className="aviso">{aviso}</p>}
      <p className="mapa-resumo">
        {mapa !== undefined && conc.total > 0 && (
          <>
            <strong>
              {conc.artigos.toLocaleString('pt-BR')} dos {conc.total.toLocaleString('pt-BR')}{' '}
              artigos
            </strong>{' '}
            concentram {porcento(conc.parcela)} do que caiu neste recorte.{' '}
          </>
        )}
        {cob.artigos > 0 && (
          <>
            Você cobriu <strong>{porcento(parteCoberta(cob))}</strong>
            {mapa === undefined && ` (${String(cob.artigos)} de ${String(cob.total)} artigos)`}.
          </>
        )}
      </p>
      {trecho && (
        <>
          <p className="mapa-rotulo">Agora no mapa</p>
          <AcaoAgora
            titulo={`Ler ${rotuloDoTrecho(quadrados, trecho)}`}
            motivo={[blocoDoTrecho, NOME_DA_CLASSE[trecho.classe]].filter(Boolean).join(' · ')}
            estimativa={trecho.minutos}
            rotuloBotao="Começar"
            para={`/biblioteca/normas/${normaId}?ir=${encodeURIComponent(quadrados[trecho.de]?.endereco ?? '')}&foco=artigo&mapa=1`}
          />
        </>
      )}
      <ul className="mapa-legenda" aria-label="Legenda do mapa">
        {CLASSES.map((classe: ClasseDoArtigo) => (
          <li key={classe}>
            <span className="mapa-quadrado" data-classe={classe} aria-hidden="true" />
            {NOME_DA_CLASSE[classe]}
          </li>
        ))}
        <li>
          <span className="mapa-quadrado" data-classe="baixa" data-coberto="" aria-hidden="true" />
          círculo: já cobri
        </li>
        <li>
          <span className="mapa-quadrado" data-classe="alta" data-fora="" aria-hidden="true" />
          esmaecido: fora de vigor
        </li>
        <li>
          <span
            className="mapa-quadrado"
            data-classe="altissima"
            data-proximo=""
            aria-hidden="true"
          />
          próximo trecho
        </li>
      </ul>
      <div
        ref={grade}
        role="group"
        aria-label={`Mapa dos ${quadrados.length.toLocaleString('pt-BR')} artigos: cada quadrado é um artigo, mais cheio quanto mais cai. Setas percorrem; Enter lê o artigo.`}
        className="mapa-grade"
        onKeyDown={aoTeclar}
        onClick={aoClicar}
      >
        {quadrados.map((quadrado, posicao) => (
          <button
            key={quadrado.id}
            type="button"
            className="mapa-quadrado"
            data-posicao={posicao}
            data-classe={quadrado.classe}
            data-coberto={cob.cobertos[posicao] ? '' : undefined}
            data-proximo={noTrecho(posicao) ? '' : undefined}
            data-fora={quadrado.foraDeVigor ? '' : undefined}
            tabIndex={posicao === foco ? 0 : -1}
            aria-label={descricao(quadrado, posicao)}
            aria-pressed={escolhido?.posicao === posicao}
          />
        ))}
      </div>
      <p className="mapa-escolhido" role="status">
        {q && escolhido && (
          <>
            <strong>{q.rotulo}</strong>
            {escolhido.nome && ` · ${escolhido.nome}`} · {NOME_DA_CLASSE[q.classe]}
            {q.foraDeVigor && ' · fora de vigor'}
            {cob.cobertos[escolhido.posicao] && ' · você já cobriu'}{' '}
            <Link
              to={`/biblioteca/normas/${normaId}?ir=${encodeURIComponent(q.endereco)}`}
              className="botao botao-texto"
            >
              Ler
            </Link>
          </>
        )}
      </p>
      <p className="dica">
        Ordem de leitura, não previsão: quando uma questão cobre vários artigos, o peso se divide
        entre eles. Cobrir é ler até um ponto, ou deixar grifo, nota, Estrela ou Erro no artigo.
      </p>
    </div>
  );
}
