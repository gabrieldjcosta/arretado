import { useEffect, useState } from 'react';
import { LinkDoFio } from '../LinkDoFio';
import { Esqueleto } from '../../componentes/estados';
import { descreverPasso } from '../dados/descrever';
import { limparPausa, tipoDaPausa } from '../dados/pausa';
import { useFio } from '../dados/useFio';
import { FioQueSePuxa } from './FioQueSePuxa';
import './fio-agora.css';

function SemMateria() {
  return (
    <section className="fio-comeco" aria-labelledby="fio-comeco-titulo">
      <span className="fio-olho">Para começar</span>
      <h1 className="fio-titulo" id="fio-comeco-titulo">
        Qual é a sua prova?
      </h1>
      <p className="fio-quieto">Sem conta, sem edital. Isso fica para depois, se você quiser.</p>
      <LinkDoFio to="/comecar" className="fio-acao">
        Escolher minha prova
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </LinkDoFio>
    </section>
  );
}

/**
 * O Agora do Arretado novo (D-D25): o fio para puxar e, embaixo, o que vem na ponta dele. Nunca
 * lista o que ficou para trás; só o próximo passo, ou o pouso quando a etapa fechou.
 */
export function AgoraDoFio() {
  const fio = useFio();
  const { avanco } = fio;
  // Vindo de uma pausa, o Agora diz uma vez que está tudo salvo e some sozinho. Vindo do "descansar por
  // hoje", fecha o dia em voz baixa: o fio se recolhe e vem uma frase gentil, por mais tempo.
  const [pausa, setPausa] = useState(tipoDaPausa);
  useEffect(() => {
    if (!pausa) return;
    limparPausa();
    const id = window.setTimeout(
      () => {
        setPausa(undefined);
      },
      pausa === 'descanso' ? 12_000 : 5000,
    );
    return () => {
      window.clearTimeout(id);
    };
  }, [pausa]);

  if (fio.falhou) {
    return (
      <p className="fio-quieto" role="alert">
        Não deu para ler seus dados agora. Nada se perdeu; tente de novo em instantes.
      </p>
    );
  }
  if (!avanco) return <Esqueleto linhas={3} />;

  const proximo = avanco.proximo;
  if (proximo.tipo === 'sem_materia') return <SemMateria />;

  const materia = avanco.estado.etapa?.materia ?? '';
  const retomar = proximo.tipo === 'passo' && proximo.retomar;
  const ponta =
    proximo.tipo === 'passo'
      ? descreverPasso(proximo.passo, materia)
      : {
          titulo: `Etapa ${String(proximo.pouso.etapa + 1)} pronta para pousar`,
          apoio: `${proximo.pouso.materia} · os passos desta etapa fecharam`,
        };

  return (
    <section
      className="fio-agora"
      aria-label="Agora"
      data-fim={pausa === 'descanso' ? 'dia' : undefined}
    >
      <h1 className="visualmente-oculto">Agora</h1>
      {pausa === 'passo' && (
        <p className="fio-aviso" role="status">
          Tudo salvo. O fio te espera aqui.
        </p>
      )}
      {pausa === 'descanso' && (
        <div className="fio-aviso fio-fim-do-dia" role="status">
          <p>É caminhando que se faz o caminho. Parabéns pelos passos que deu hoje.</p>
          <p>Tudo salvo. O fio te espera aqui.</p>
        </div>
      )}
      <FioQueSePuxa
        aoPuxar={fio.puxar}
        titulo={retomar ? 'Puxe para continuar' : 'Puxe o fio'}
        apoio="ou toque no ponto"
      />
      <div className="fio-proximo" role="group" aria-label="Na ponta do fio">
        <span className="fio-olho">Na ponta do fio</span>
        <strong>{ponta.titulo}</strong>
        <span>{ponta.apoio}</span>
        {'minutos' in ponta && ponta.minutos !== undefined && (
          <span className="fio-min">{String(ponta.minutos)} min</span>
        )}
      </div>
    </section>
  );
}
