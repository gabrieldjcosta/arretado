import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { descreverPasso } from '../dados/descrever';
import { ROTA_DA_PROVA } from '../lugares';
import { limparPausa, tipoDaPausa, veioDeUmaPausa } from '../dados/pausa';
import { useFio } from '../dados/useFio';
import { resumoDoMapa } from '../destino/resumo';
import { useJornadaDoFio } from '../destino/useJornadaDoFio';
import { CactoMarca } from './CactoMarca';
import { PuxarM } from './PuxarM';
import { TelaM } from './TelaM';
import { avisar } from './toast';

const formatar = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/**
 * O que a pessoa vê quando ainda não escolheu a prova (a tela "prova" do mockup é a que o botão abre). O cartão é
 * o `.m-proximo` do mockup, que é uma grade de duas colunas (texto | min) feita para o "Na ponta do fio": aqui ele
 * leva `m-sem-prova`, que o põe em uma coluna só (desvio 23 de `ajustes.css`).
 */
function SemProva() {
  return (
    <div className="m-proximo m-sem-prova" role="group" aria-label="Para começar">
      <span className="m-olho">Para começar</span>
      <strong>Qual é a sua prova?</strong>
      <span>Sem conta, sem edital. Isso fica para depois, se você quiser.</span>
      <Link to={ROTA_DA_PROVA} className="m-acao">
        Escolher minha prova
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}

/**
 * O Agora do Arretado novo, a tela `inicio` do mockup aprovado: a marca com o cacto e quanto da prova já é da
 * pessoa, o fio para puxar e, embaixo, o que vem na ponta dele. Nunca lista o que ficou para trás: só o
 * próximo passo, ou o pouso quando a etapa fechou.
 */
export function AgoraM() {
  const fio = useFio();
  const { entrada } = useJornadaDoFio();
  const navegar = useNavigate();
  const { avanco } = fio;
  // Vindo de uma pausa, o Agora diz uma vez que está tudo salvo (o aviso do mockup).
  const [pausou] = useState(veioDeUmaPausa);
  useEffect(() => {
    if (!pausou) return;
    // Ao descansar por hoje, o aviso é a frase gentil do fim do dia; numa pausa de passo, só o "tudo salvo".
    const descansou = tipoDaPausa() === 'descanso';
    limparPausa();
    avisar(
      descansou
        ? 'É caminhando que se faz o caminho. Parabéns pelos passos que deu hoje.'
        : 'Tudo salvo. O fio te espera aqui.',
    );
  }, [pausou]);

  // O passo, o pouso e a fonte da lei são pedaços à parte: pedidos já aqui, ficam à mão quando o fio é puxado, e a
  // troca de tela não espera rede nem disco (o mockup troca sem vão).
  useEffect(() => {
    void import('./PassoM').catch(() => undefined);
    void import('./PousoM').catch(() => undefined);
    if (typeof document !== 'undefined' && 'fonts' in document) {
      void document.fonts.load('400 16px "Literata Fio"').catch(() => undefined);
    }
  }, []);

  const percentual = resumoDoMapa(entrada)?.percentual ?? 0;
  const proximo = avanco?.proximo;
  const materia = avanco?.estado.etapa?.materia ?? '';
  const retomar = proximo?.tipo === 'passo' && proximo.retomar;
  const ponta =
    proximo?.tipo === 'passo'
      ? descreverPasso(proximo.passo, materia)
      : proximo?.tipo === 'pouso'
        ? {
            titulo: `Etapa ${String(proximo.pouso.etapa + 1)} pronta para pousar`,
            apoio: `${proximo.pouso.materia} · os passos desta etapa fecharam`,
          }
        : undefined;
  const minutos = ponta && 'minutos' in ponta ? ponta.minutos : undefined;

  return (
    <TelaM nome="inicio" className="m-inicio m-com-nav">
      <h1 className="m-so-leitor">Agora</h1>
      <div className="m-cabeca">
        <button
          type="button"
          className="m-marca"
          aria-label="arretado: sua conta e ajustes"
          onClick={() => {
            void navegar('/conta');
          }}
        >
          arretado
          <CactoMarca />
        </button>
        <span className="m-cobre">
          <b>{formatar(percentual)}%</b>
          <br />
          da prova é seu
        </span>
      </div>
      {proximo?.tipo === 'sem_materia' ? (
        <SemProva />
      ) : (
        <>
          <PuxarM
            titulo={retomar ? 'Puxe para continuar' : 'Puxe o fio'}
            apoio="ou toque no ponto"
            aoPuxar={fio.puxar}
            pronta={proximo !== undefined || fio.falhou}
          />
          {fio.falhou ? (
            <p className="m-quieto" role="alert">
              Não deu para ler seus dados agora. Nada se perdeu; tente de novo em instantes.
            </p>
          ) : (
            <div className="m-proximo" role="group" aria-label="Na ponta do fio">
              <span className="m-olho">Na ponta do fio</span>
              <strong>{ponta?.titulo ?? ' '}</strong>
              <span>{ponta?.apoio ?? ' '}</span>
              {minutos !== undefined && <span className="m-min">{String(minutos)} min</span>}
            </div>
          )}
        </>
      )}
    </TelaM>
  );
}
