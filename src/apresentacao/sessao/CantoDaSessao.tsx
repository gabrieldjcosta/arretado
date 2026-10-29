// Canto da Sessão: com uma Sessão aberta, um relógio discreto no canto de baixo à esquerda de toda tela
// (menos as de começar e de encerrar a Sessão). Tocar abre o bloquinho: anotar uma distração sem sair do estudo,
// pausar ou encerrar. Mostra só o tempo decorrido, sem alarme nem cobrança.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import type { Sessao } from '../../core/modelo';
import { estacionar } from '../../dominios/sessao/estacionamento';
import { duracaoEmSegundos, pausarSessao, retomarSessao } from '../../dominios/sessao/servico';
import { useDados, useRepositorio } from '../dados/contexto';
import { rotuloDaAtividade } from './atividades';
import { sessaoAberta } from './carregadores';
import './estilos-canto.css';

const minutosDe = (s: Sessao, agora: string) => Math.floor(duracaoEmSegundos(s, agora) / 60);

// Com o temporizador escolhido (padrão das preferências), só informa até onde: sem alarme nem cobrança.
// O "N de M min" vale até os M min, inclusive. Depois volta a "N min": "40 de 25 min" lê como estouro, e o
// aviso gentil (o que o Temporizador da tela dava) mora no bloquinho, a partir dos M min.
const textoDoTempo = (s: Sessao, agora: string) => {
  const min = minutosDe(s, agora);
  if (min < 1) return 'agora';
  return s.temporizadorMin && min <= s.temporizadorMin
    ? `${String(min)} de ${String(s.temporizadorMin)} min`
    : `${String(min)} min`;
};

const passouDoTempo = (s: Sessao, agora: string) =>
  s.temporizadorMin !== undefined && minutosDe(s, agora) >= s.temporizadorMin;

export function CantoDaSessao() {
  const { pathname } = useLocation();
  const { dados: sessao } = useDados(sessaoAberta);
  if (!sessao || pathname === '/sessao/iniciar' || pathname === '/sessao/fechar') return null;
  return <Canto sessao={sessao} naSessao={pathname === '/sessao/atual'} />;
}

function Canto({ sessao, naSessao }: { sessao: Sessao; naSessao: boolean }) {
  const repo = useRepositorio();
  const campo = useRef<HTMLInputElement>(null);
  const relogio = useRef<HTMLButtonElement>(null);
  const mensagem = useRef<HTMLParagraphElement>(null);
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState('');
  const [agora, setAgora] = useState(() => repo.ctx.agora().toISOString());
  useEffect(() => {
    const id = setInterval(() => {
      setAgora(repo.ctx.agora().toISOString());
    }, 30_000);
    return () => {
      clearInterval(id);
    };
  }, [repo]);
  // O bloquinho rola por dentro (tela baixa, texto a 200%): o aviso de guardou ou falhou nasce abaixo da
  // dobra, então vem à vista, sem animar.
  useEffect(() => {
    if (aviso) mensagem.current?.scrollIntoView({ block: 'nearest' });
  }, [aviso]);
  const pausada = sessao.estado === 'pausada';
  const tempo = textoDoTempo(sessao, agora);
  const passou = passouDoTempo(sessao, agora);
  const alternar = () => {
    setAberto((v) => !v);
    setAviso('');
    setAgora(repo.ctx.agora().toISOString());
  };
  const guardar = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    estacionar(repo, sessao.id, texto).then(
      () => {
        setTexto('');
        setAviso('Guardado para depois.');
        campo.current?.focus();
      },
      () => {
        setAviso('Não foi possível guardar. Tente de novo.');
      },
    );
  };
  const pausarOuVoltar = () => {
    (pausada ? retomarSessao : pausarSessao)(repo, sessao.id).catch(() => {
      setAviso('Não foi possível salvar. Tente de novo.');
    });
  };
  return (
    <div
      className={naSessao ? 'canto-sessao canto-sessao--na-tela' : 'canto-sessao'}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !aberto) return;
        // Só o bloquinho fecha (o modo foco do Leitor respeita o `defaultPrevented`), e o foco volta ao relógio.
        e.preventDefault();
        setAberto(false);
        relogio.current?.focus();
      }}
    >
      <button
        ref={relogio}
        type="button"
        className="canto-sessao__relogio"
        aria-expanded={aberto}
        aria-label={`Sessão${pausada ? ' pausada' : ''}, ${tempo}. ${aberto ? 'Fechar' : 'Abrir'} o bloquinho`}
        onClick={alternar}
      >
        {/* Um invólucro só: o botão é flex, e rótulo e tempo soltos virariam duas colunas que quebram cada uma por si. */}
        <span>
          <span className="canto-sessao__rotulo">{pausada ? 'Sessão ' : 'Sessão · '}</span>
          <span className="canto-sessao__tempo">{pausada ? 'pausada' : tempo}</span>
        </span>
      </button>
      {aberto && (
        <div className="canto-sessao__painel" role="group" aria-label="Bloquinho da Sessão">
          <p className="canto-sessao__titulo">
            {sessao.atividade ? rotuloDaAtividade(sessao.atividade) : 'Sessão'}
            {pausada ? ' (pausada)' : ''}
          </p>
          {passou && (
            <p className="dica">
              Os {sessao.temporizadorMin} min do temporizador passaram. Siga, pause ou encerre
              quando quiser. Nada é cobrado.
            </p>
          )}
          <form onSubmit={guardar} className="canto-sessao__nota">
            <label htmlFor="canto-nota" className="visualmente-oculto">
              Anotar uma distração
            </label>
            <input
              ref={campo}
              id="canto-nota"
              type="text"
              maxLength={500}
              autoComplete="off"
              placeholder="Anotar uma distração"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setAviso('');
              }}
            />
            <button type="submit">Guardar</button>
          </form>
          <p ref={mensagem} role="status" className="dica">
            {aviso}
          </p>
          <div className="linha-acoes">
            <button type="button" onClick={pausarOuVoltar}>
              {pausada ? 'Voltar' : 'Pausar'}
            </button>
            {!naSessao && (
              <Link to="/sessao/atual" className="botao botao-texto">
                Ver a Sessão
              </Link>
            )}
            <Link to="/sessao/fechar" className="botao botao-texto">
              Encerrar
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
