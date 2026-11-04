import type { ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import type { Passo, ResultadoDoPasso } from '../../../dominios/fio';
import { useRepositorio } from '../../dados/contexto';
import { abrirNorma } from '../../../dominios/legislacao/leitor';
import { registrarArtigosFeitos } from '../../biblioteca/mapa/feitos';
import { concluirTarefa } from '../../../dominios/tarefas';
import { Esqueleto } from '../../componentes/estados';
import { alvoDaPorteira } from '../dados/alvo';
import { PASSOS_COM_TELA } from '../dados/avancar';
import { descreverPasso } from '../dados/descrever';
import { marcarPausa } from '../dados/pausa';
import { useFio } from '../dados/useFio';
import { ROTA_DO_POUSO } from '../lugares';
import { GuardarDoPasso, LembrarDoPasso, PraticarDoPasso, type AlvoDaPorteira } from '../passos';
import './fio-etapa.css';

type Ler = Extract<Passo, { tipo: 'ler'; normaId: string }>;
type LerSemLei = Extract<Passo, { tipo: 'ler'; adicionarNorma: true }>;
type Lembrar = Extract<Passo, { tipo: 'lembrar' }>;
type Guardar = Extract<Passo, { tipo: 'guardar' }>;
type Praticar = Extract<Passo, { tipo: 'praticar' }>;
type Revisar = Extract<Passo, { tipo: 'revisar' }>;
type SeuPasso = Extract<Passo, { tipo: 'seu_passo' }>;

interface PropsDaTela<P> {
  passo: P;
  materia: string;
  aoConcluir: (resultado: ResultadoDoPasso) => void;
  aoPular: () => void;
  aoPausar: () => void;
}

const Seta = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function CartaoDoPasso({
  etiqueta,
  titulo,
  apoio,
  minutos,
  children,
  aoPular,
  aoPausar,
}: {
  etiqueta: string;
  titulo: string;
  apoio: string;
  minutos?: number | undefined;
  children: ReactNode;
  aoPular: () => void;
  aoPausar: () => void;
}) {
  return (
    <article className="fio-cartao-do-passo">
      <div className="fio-topo-do-cartao">
        <span className="fio-olho">
          {etiqueta}
          {minutos !== undefined && ` · ${String(minutos)} min`}
        </span>
        <button
          type="button"
          className="fio-icone"
          aria-label="Pausar: tudo fica salvo"
          onClick={aoPausar}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6v12M15 6v12" />
          </svg>
        </button>
      </div>
      <h1 className="fio-titulo fio-titulo-passo">{titulo}</h1>
      <p className="fio-quieto">{apoio}</p>
      {children}
      <div className="fio-passo-acoes">
        {/* As ações do passo entram aqui; pular fica sempre à mão e não custa nada. */}
        <button type="button" className="fio-pular" onClick={aoPular}>
          Pular este passo
        </button>
      </div>
    </article>
  );
}

function LerDoPasso({ passo, materia, aoConcluir, aoPular, aoPausar }: PropsDaTela<Ler>) {
  const repo = useRepositorio();
  const d = descreverPasso(passo, materia);
  const primeiro = passo.artigos[0];

  // "Li": o que a pessoa leu fora do cartão entra pelo mesmo caminho do Leitor no modo mapa.
  const li = async () => {
    try {
      const aberta = await abrirNorma(repo, passo.normaId);
      const enderecos = new Set(passo.artigos.map((a) => a.endereco));
      const ids = aberta.nos
        .filter((no) => enderecos.has(no.dispositivo.endereco))
        .map((no) => no.dispositivo.id);
      registrarArtigosFeitos(passo.normaId, ids);
    } catch {
      /* a norma sumiu: o passo fecha mesmo assim, só não conta na cobertura */
    }
    aoConcluir({ tipo: 'ler', lidos: passo.artigos.length });
  };

  return (
    <CartaoDoPasso
      etiqueta="Ler"
      titulo={d.titulo}
      apoio={d.apoio}
      minutos={d.minutos}
      aoPular={aoPular}
      aoPausar={aoPausar}
    >
      <ul className="fio-chips" aria-label="Artigos deste passo">
        {passo.artigos.map((a) => (
          <li key={a.endereco}>{a.rotulo}</li>
        ))}
      </ul>
      <div className="fio-passo-acoes">
        {primeiro && (
          <Link
            to={`/biblioteca/normas/${passo.normaId}?ir=${encodeURIComponent(primeiro.endereco)}&foco=artigo&mapa=1`}
            className="fio-acao"
          >
            Abrir no Leitor
            <Seta />
          </Link>
        )}
        <button
          type="button"
          className="fio-secundario"
          onClick={() => {
            void li();
          }}
        >
          Já li
        </button>
      </div>
    </CartaoDoPasso>
  );
}

function LerSemLeiDoPasso({
  passo,
  materia,
  aoConcluir,
  aoPular,
  aoPausar,
}: PropsDaTela<LerSemLei>) {
  const d = descreverPasso(passo, materia);
  return (
    <CartaoDoPasso
      etiqueta="Ler"
      titulo={d.titulo}
      apoio={d.apoio}
      aoPular={aoPular}
      aoPausar={aoPausar}
    >
      <div className="fio-passo-acoes">
        <Link to="/biblioteca/acervo" className="fio-acao">
          Escolher a lei
          <Seta />
        </Link>
        <button
          type="button"
          className="fio-secundario"
          onClick={() => {
            aoConcluir({ tipo: 'ler', lidos: 0 });
          }}
        >
          Já adicionei
        </button>
      </div>
    </CartaoDoPasso>
  );
}

/** Estável para o mesmo passo: sair e voltar refaz as mesmas perguntas. */
interface ComSemente {
  semente: number;
}

function LembrarDaTela({
  passo,
  materia,
  semente,
  aoConcluir,
  aoPular,
  aoPausar,
}: PropsDaTela<Lembrar> & ComSemente) {
  const d = descreverPasso(passo, materia);
  return (
    <CartaoDoPasso
      etiqueta="Lembrar"
      titulo={d.titulo}
      apoio={d.apoio}
      minutos={d.minutos}
      aoPular={aoPular}
      aoPausar={aoPausar}
    >
      <LembrarDoPasso passo={passo} semente={semente} aoConcluir={aoConcluir} aoPular={aoPular} />
    </CartaoDoPasso>
  );
}

function GuardarDaTela({
  passo,
  materia,
  semente,
  aoConcluir,
  aoPular,
  aoPausar,
}: PropsDaTela<Guardar> & ComSemente) {
  const d = descreverPasso(passo, materia);
  return (
    <CartaoDoPasso
      etiqueta="Guardar"
      titulo={d.titulo}
      apoio={d.apoio}
      minutos={d.minutos}
      aoPular={aoPular}
      aoPausar={aoPausar}
    >
      <GuardarDoPasso passo={passo} semente={semente} aoConcluir={aoConcluir} aoPular={aoPular} />
    </CartaoDoPasso>
  );
}

function PraticarDaTela({
  passo,
  materia,
  semente,
  alvo,
  aoConcluir,
  aoPular,
  aoPausar,
}: PropsDaTela<Praticar> & ComSemente & { alvo: AlvoDaPorteira }) {
  const d = descreverPasso(passo, materia);
  return (
    <CartaoDoPasso
      etiqueta="Praticar"
      titulo={d.titulo}
      apoio={d.apoio}
      minutos={d.minutos}
      aoPular={aoPular}
      aoPausar={aoPausar}
    >
      <PraticarDoPasso
        passo={passo}
        alvo={alvo}
        semente={semente}
        aoConcluir={aoConcluir}
        aoPular={aoPular}
      />
    </CartaoDoPasso>
  );
}

function RevisarDoPasso({ passo, materia, aoConcluir, aoPular, aoPausar }: PropsDaTela<Revisar>) {
  const d = descreverPasso(passo, materia);
  return (
    <CartaoDoPasso
      etiqueta="Revisar"
      titulo={d.titulo}
      apoio={d.apoio}
      minutos={d.minutos}
      aoPular={aoPular}
      aoPausar={aoPausar}
    >
      <div className="fio-passo-acoes">
        <Link to={`/recall/revisar?itens=${String(passo.quantidade)}`} className="fio-acao">
          Revisar agora
          <Seta />
        </Link>
        <button
          type="button"
          className="fio-secundario"
          onClick={() => {
            aoConcluir({ tipo: 'revisar', revisados: passo.quantidade, voltamAmanha: 0 });
          }}
        >
          Já revisei
        </button>
      </div>
    </CartaoDoPasso>
  );
}

function SeuPassoDoPasso({ passo, materia, aoConcluir, aoPular, aoPausar }: PropsDaTela<SeuPasso>) {
  const repo = useRepositorio();
  const d = descreverPasso(passo, materia);
  return (
    <CartaoDoPasso
      etiqueta="Seu passo"
      titulo={d.titulo}
      apoio={d.apoio}
      aoPular={aoPular}
      aoPausar={aoPausar}
    >
      <div className="fio-passo-acoes">
        <button
          type="button"
          className="fio-acao"
          onClick={() => {
            void concluirTarefa(repo, passo.tarefaId)
              .catch(() => undefined)
              .then(() => {
                aoConcluir({ tipo: 'seu_passo' });
              });
          }}
        >
          Fiz
          <Seta />
        </button>
      </div>
    </CartaoDoPasso>
  );
}

/** A fileira de pontos: uma bolinha por passo, a da vez acesa. */
/**
 * Os pontos contam só os passos que têm tela: os que o Fio pula sozinho não aparecem, para o ponto aceso
 * não saltar. Com um passo só, a fileira não diz nada e some.
 */
function Fileira({
  passos,
  posicao,
}: {
  passos: readonly Passo[];
  /** Posição do passo aberto na etapa, contando a partir de 1. */
  posicao: number;
}) {
  const comTela = passos.map((p) => PASSOS_COM_TELA.has(p.tipo));
  const de = comTela.filter(Boolean).length;
  const aqui = comTela.slice(0, posicao).filter(Boolean).length;
  if (de < 2) return null;
  return (
    <ol className="fio-fileira" aria-label={`Passo ${String(aqui)} de ${String(de)}`}>
      {Array.from({ length: de }, (_, i) => (
        <li
          key={i}
          className={i + 1 === aqui ? 'fio-fileira-atual' : i + 1 < aqui ? 'fio-fileira-feito' : ''}
          aria-current={i + 1 === aqui ? 'step' : undefined}
        />
      ))}
    </ol>
  );
}

/**
 * O passo da vez (D-D25): um cartão por passo, com o que fazer e a saída sempre à mão. Só o Fixar
 * súmula ainda não tem tela (a entrada do Fio não traz súmulas); o Fio o pula sozinho.
 */
export function PassoDoFio() {
  const fio = useFio();
  const navegar = useNavigate();
  const { avanco } = fio;
  if (fio.falhou) {
    return (
      <p className="fio-quieto" role="alert">
        Não deu para ler seus dados agora. Nada se perdeu; tente de novo em instantes.
      </p>
    );
  }
  if (!avanco) return <Esqueleto linhas={3} />;
  const proximo = avanco.proximo;
  if (proximo.tipo === 'pouso') return <Navigate to={ROTA_DO_POUSO} replace />;
  if (proximo.tipo === 'sem_materia') return <Navigate to="/" replace />;

  const { passo } = proximo;
  const materia = avanco.estado.etapa?.materia ?? '';
  // Pausar não grava nada (o passo aberto já está guardado): marca a pausa e volta ao Agora.
  const pausar = () => {
    marcarPausa();
    void navegar('/');
  };
  const comum = { materia, aoConcluir: fio.concluir, aoPular: fio.pular, aoPausar: pausar };
  const semente = (avanco.estado.etapa?.numero ?? 0) * 100 + proximo.posicao;
  let tela: ReactNode = null;
  if (passo.tipo === 'ler' && 'adicionarNorma' in passo) {
    tela = <LerSemLeiDoPasso passo={passo} {...comum} />;
  } else if (passo.tipo === 'ler') {
    tela = <LerDoPasso passo={passo} {...comum} />;
  } else if (passo.tipo === 'lembrar') {
    tela = <LembrarDaTela passo={passo} semente={semente} {...comum} />;
  } else if (passo.tipo === 'guardar') {
    tela = <GuardarDaTela passo={passo} semente={semente} {...comum} />;
  } else if (passo.tipo === 'praticar') {
    // Sem leitura na matéria a porteira não tem o que perguntar: o passo diz isso e deixa seguir.
    const alvo = (fio.entrada && alvoDaPorteira(fio.entrada, avanco.estado, passo.materiaId)) ?? {
      normaId: '',
      artigos: [],
    };
    tela = <PraticarDaTela passo={passo} alvo={alvo} semente={semente} {...comum} />;
  } else if (passo.tipo === 'revisar') {
    tela = <RevisarDoPasso passo={passo} {...comum} />;
  } else if (passo.tipo === 'seu_passo') {
    tela = <SeuPassoDoPasso passo={passo} {...comum} />;
  }
  return (
    <section className="fio-etapa" aria-label="Passo do Fio">
      <Fileira passos={avanco.estado.etapa?.passos ?? []} posicao={proximo.posicao} />
      {tela}
    </section>
  );
}
