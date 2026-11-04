import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router';
import { useLarguraMinima } from '../../componentes/largura';
import { ORDEM_UF } from './nordeste';
import { materiaAtual, resumoDoMapa } from './resumo';
import { useJornadaDoFio } from './useJornadaDoFio';
import './fio-destino.css';

// O mapa (e o JSON dele) vai num pedaço à parte do pacote: só quem abre o Destino o carrega.
const MapaDoNordeste = lazy(() =>
  import('./MapaDoNordeste').then((m) => ({ default: m.MapaDoNordeste })),
);

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

/** A tela larga (a casca alarga a partir daqui, em fio-base.css): a lista dos pousos já vem aberta. */
const LARGURA_DO_MONITOR = 980;

/**
 * O Destino do Arretado novo (D-D25): o Nordeste de verdade, uma matéria do Ciclo em cada estado, e o
 * caminho que a pessoa já fez, um pouso atrás do outro. O mapa é o que se vê; a lista dos pousos fica
 * logo abaixo, em palavras, para quem prefere ler a ver.
 */
export function DestinoDoFio() {
  const { entrada, falhou, fio } = useJornadaDoFio();
  const { etapasFeitas, passosDados, pousos } = fio.estado;
  const resumo = resumoDoMapa(entrada);
  const atual = materiaAtual(entrada);
  const foraDoMapa = entrada ? Math.max(0, entrada.materias.length - ORDEM_UF.length) : 0;
  // O número do Destino não some: com a lei da matéria no app ele é a fração que já é da pessoa; sem a lei
  // (ou sem artigo que caia nela), conta as etapas, que é o que o app sabe do caminho.
  const contaEtapas = resumo === undefined && entrada !== undefined && etapasFeitas > 0;
  // Os pousos vêm abertos no monitor, onde a coluna da esquerda tem sobra de altura; a pessoa decide depois.
  const larga = useLarguraMinima(LARGURA_DO_MONITOR);
  const [pousosAbertos, setPousosAbertos] = useState<boolean | undefined>(undefined);

  return (
    <section className="fio-destino" aria-labelledby="fio-destino-titulo">
      <div className="fio-destino-texto">
        <span className="fio-olho">Destino</span>
        <h1 className="fio-titulo" id="fio-destino-titulo">
          {etapasFeitas === 0 ? 'O caminho começa aqui' : 'Seu caminho até aqui'}
        </h1>
        {resumo && (
          <>
            <p className="fio-numero">
              {String(resumo.percentual)}
              <small>%</small>
            </p>
            <p className="fio-quieto">
              do que mais cai em {resumo.nome} já é seu. Cada ponto no caminho é um artigo que cai;
              os maiores caem mais.
            </p>
          </>
        )}
        {contaEtapas && (
          <>
            <p className="fio-numero">
              {String(etapasFeitas)}
              <small> {etapasFeitas === 1 ? 'etapa' : 'etapas'}</small>
            </p>
            <p className="fio-quieto">
              {etapasFeitas === 1 ? 'pousada' : 'pousadas'} no caminho, com{' '}
              {plural(passosDados, 'passo dado', 'passos dados')}.
              {atual &&
                ` Quando ${atual.nome} tiver a lei no app, o mapa passa a contar quanto do que mais cai já é seu.`}
            </p>
          </>
        )}
        {etapasFeitas === 0 ? (
          <>
            <p className="fio-quieto">
              Cada etapa que pousa abre um lugar no caminho. Puxe o fio no Agora para o primeiro.
            </p>
            <Link to="/" className="fio-acao">
              Ir ao Agora
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </>
        ) : (
          !contaEtapas && (
            <p className="fio-quieto">
              {plural(etapasFeitas, 'etapa pousada', 'etapas pousadas')} ·{' '}
              {plural(passosDados, 'passo dado', 'passos dados')}
            </p>
          )
        )}
        {entrada?.materias.length === 0 && (
          <p className="fio-quieto">
            Escolha a sua prova no Agora para dar a cada estado uma matéria.
          </p>
        )}
      </div>

      <div className="fio-destino-mapa">
        {falhou ? (
          <p className="fio-quieto" role="alert">
            Não deu para abrir o mapa agora. Tente de novo em instantes.
          </p>
        ) : entrada ? (
          <Suspense fallback={<div className="fio-mapa-vazio" aria-hidden="true" />}>
            <MapaDoNordeste entrada={entrada} />
          </Suspense>
        ) : (
          <div className="fio-mapa-vazio" aria-hidden="true" />
        )}
      </div>

      <div className="fio-destino-pe">
        <ul className="fio-legenda" aria-label="Legenda do mapa">
          <li>
            <i className="pela-frente" aria-hidden="true" />
            artigo pela frente
          </li>
          <li>
            <i className="ja-e-seu" aria-hidden="true" />
            já é seu
          </li>
          <li>
            <i className="porta" aria-hidden="true" />
            porteira
          </li>
        </ul>
        {foraDoMapa > 0 && (
          <p className="fio-quieto">O mapa mostra as nove primeiras matérias do seu Ciclo.</p>
        )}
        {pousos.length > 0 && (
          <details
            className="fio-pousos"
            open={pousosAbertos ?? larga}
            onToggle={(e) => {
              setPousosAbertos(e.currentTarget.open);
            }}
          >
            <summary>Seus pousos, em palavras</summary>
            <ol className="fio-caminho" aria-label="Pousos, do mais recente ao mais antigo">
              {pousos.map((p) => (
                <li key={p.etapa}>
                  <strong>
                    Etapa {String(p.etapa + 1)} · {p.materia}
                  </strong>
                  {p.fatos.length > 0 && <span>{p.fatos.join(' · ')}</span>}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </section>
  );
}
