import { useEffect, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router';
import type { Passo, ResultadoDoPasso } from '../../../dominios/fio';
import { alvoDaPorteira } from '../dados/alvo';
import { PASSOS_COM_TELA } from '../dados/avancar';
import { desfazivel } from '../dados/desfazer';
import { descreverPasso } from '../dados/descrever';
import { marcarPausa } from '../dados/pausa';
import { useFio } from '../dados/useFio';
import { ROTA_DO_POUSO } from '../lugares';
import { LembrarM } from './LembrarM';
import { LerM, LerSemLeiM } from './LerM';
import { GuardarM, PraticarM, RevisarM, SeuPassoM } from './OutrosPassosM';
import { TelaM } from './TelaM';
import type { TrilhoDoPasso } from './passo-tipos';
import { avisar } from './toast';

/** Os pontos do trilho: um por passo com tela (o Guardar divide o ponto do Lembrar), mais o do pouso. */
function trilhoDoPasso(passos: readonly Passo[], indice: number): TrilhoDoPasso {
  const conta = (p: Passo) => PASSOS_COM_TELA.has(p.tipo) && p.tipo !== 'guardar';
  const de = passos.filter(conta).length;
  const antes = passos.slice(0, indice).filter(conta).length;
  const guardar = passos[indice]?.tipo === 'guardar';
  const aqui = guardar ? Math.max(1, antes) : antes + 1;
  return { feitos: aqui - 1, nos: de + 1, animarNovo: !guardar && aqui > 1 };
}

/** "Frase guardada" (uma ou mais): o aviso do cartão que guardou, no lugar do "Feito". */
function avisoDoFeito(resultado: ResultadoDoPasso): string {
  if (resultado.tipo !== 'lembrar') return 'Feito';
  const n = resultado.guardados?.length ?? 0;
  if (n === 0) return 'Feito';
  return n === 1 ? 'Frase guardada' : 'Frases guardadas';
}

/**
 * O passo da vez no quadro do Fio: um cartão por passo (as telas `ler`, `lembrar`... do mockup), com o trilho
 * ao lado. Terminar leva ao próximo passo ou ao pouso; pular não custa nada; os dois avisam com "Desfazer"
 * quando dá para voltar atrás. O que o passo faz de cada tipo está nos componentes `*M` dele.
 */
export function PassoM() {
  const fio = useFio();
  const navegar = useNavigate();
  const { avanco } = fio;
  const { desfazer, podeDesfazer } = fio;

  // Ctrl/Cmd+Z desfaz o passo que acabou de passar, enquanto o aviso vale.
  useEffect(() => {
    const ouvir = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
      if (!podeDesfazer()) return;
      e.preventDefault();
      if (desfazer()) avisar('Desfeito');
    };
    window.addEventListener('keydown', ouvir);
    return () => {
      window.removeEventListener('keydown', ouvir);
    };
  }, [desfazer, podeDesfazer]);

  if (fio.falhou) {
    return (
      <TelaM nome="passo" rotulo="Passo do Fio">
        <p className="m-quieto" role="alert">
          Não deu para ler seus dados agora. Nada se perdeu; tente de novo em instantes.
        </p>
      </TelaM>
    );
  }
  if (!avanco) {
    return (
      <section className="m-tela" data-tela="passo" aria-busy="true" aria-label="Passo do Fio">
        <p className="m-so-leitor">Abrindo o passo…</p>
      </section>
    );
  }
  const proximo = avanco.proximo;
  if (proximo.tipo === 'pouso') return <Navigate to={ROTA_DO_POUSO} replace />;
  if (proximo.tipo === 'sem_materia') return <Navigate to="/" replace />;

  const { passo } = proximo;
  const etapa = avanco.estado.etapa;
  const materia = etapa?.materia ?? '';
  const d = descreverPasso(passo, materia);
  const semente = (etapa?.numero ?? 0) * 100 + proximo.posicao;
  const trilho = trilhoDoPasso(etapa?.passos ?? [], proximo.indice);

  const concluir = (resultado: ResultadoDoPasso) => {
    fio.concluir(resultado);
    avisar(avisoDoFeito(resultado), desfazivel(resultado) ? voltar : undefined);
  };
  const pular = () => {
    fio.pular();
    avisar('Pulado', voltar);
  };
  // Pausar não grava nada (o passo aberto já está guardado): marca a pausa e volta ao Agora.
  const pausar = () => {
    marcarPausa();
    void navegar('/');
  };
  function voltar() {
    if (desfazer()) avisar('Desfeito');
  }
  const comum = {
    d,
    materia,
    semente,
    trilho,
    aoConcluir: concluir,
    aoPular: pular,
    aoPausar: pausar,
  };

  let tela: ReactNode;
  if (passo.tipo === 'ler' && 'adicionarNorma' in passo) {
    tela = <LerSemLeiM passo={passo} {...comum} />;
  } else if (passo.tipo === 'ler') {
    tela = <LerM passo={passo} {...comum} />;
  } else if (passo.tipo === 'lembrar') {
    tela = <LembrarM passo={passo} {...comum} />;
  } else if (passo.tipo === 'guardar') {
    tela = <GuardarM passo={passo} {...comum} />;
  } else if (passo.tipo === 'praticar') {
    // Sem leitura na matéria a porteira não tem o que perguntar: o passo diz isso e deixa seguir.
    const alvo = (fio.entrada && alvoDaPorteira(fio.entrada, avanco.estado, passo.materiaId)) ?? {
      normaId: '',
      artigos: [],
    };
    tela = <PraticarM passo={passo} alvo={alvo} {...comum} />;
  } else if (passo.tipo === 'revisar') {
    tela = <RevisarM passo={passo} {...comum} />;
  } else if (passo.tipo === 'seu_passo') {
    tela = <SeuPassoM passo={passo} {...comum} />;
  } else {
    // O Fixar súmula ainda não tem tela (a entrada do Fio não traz súmulas): o Fio o pula sozinho.
    tela = null;
  }

  return (
    <TelaM
      key={`${String(etapa?.numero ?? 0)}:${String(proximo.indice)}:${passo.tipo}`}
      nome={passo.tipo}
    >
      {tela}
    </TelaM>
  );
}
