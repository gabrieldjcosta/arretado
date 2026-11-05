// As folhas que sobem de um folheto do Varal (as do mockup aprovado: `folha-organizar` e `folha-item`) e as duas que o app
// acrescenta para o que o mockup só avisa por um toast: escolher a disciplina e conferir a norma com o Planalto.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { OUTROS } from '../../../dominios/acervo/vinculos';
import { useRepositorio } from '../../dados/contexto';
import { CONTORNO } from './contorno';
import { FolhaM } from './FolhaM';
import {
  mudarOrganizacao,
  ORDEM_DAS_ORDENS,
  ORDEM_DAS_VISTAS,
  ORDENS,
  useOrganizacao,
  VISTAS,
} from './organizar';
import type { LinhaDoFolheto } from './varal-lista';

/** Organizar: a ordem, o que fica à vista em cada linha, o agrupamento e "Escolher vários" (a `folha-organizar` do mockup). */
export function OrganizarM({
  aberta,
  aoFechar,
  titulo,
  haTirados,
  aoEscolherVarios,
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  /** A pessoa já tirou linhas deste folheto do varal: só então aparece "Mostrar as que tirei". */
  haTirados: boolean;
  aoEscolherVarios: () => void;
}) {
  const org = useOrganizacao();
  const idDoTitulo = useId();
  return (
    <FolhaM
      aberta={aberta}
      aoFechar={aoFechar}
      idDoTitulo={idDoTitulo}
      classeDoCorpo="m-opcoes-org"
    >
      {(fechar) => (
        <>
          <span className="m-olho">Organizar · {titulo}</span>
          <h2 id={idDoTitulo}>Do seu jeito</h2>
          <h3>Ordem</h3>
          <div className="m-chips" role="group" aria-label="Ordem">
            {ORDEM_DAS_ORDENS.map((k) => (
              <button
                key={k}
                type="button"
                className="m-chip"
                aria-pressed={org.ordem === k}
                onClick={() => {
                  mudarOrganizacao({ ordem: k });
                }}
              >
                {ORDENS[k]}
              </button>
            ))}
          </div>
          <h3>À vista em cada linha</h3>
          <div className="m-chips" role="group" aria-label="À vista em cada linha">
            {ORDEM_DAS_VISTAS.map((k) => (
              <button
                key={k}
                type="button"
                className="m-chip"
                aria-pressed={org.vista === k}
                onClick={() => {
                  mudarOrganizacao({ vista: k });
                }}
              >
                {VISTAS[k]}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="m-chave"
            role="switch"
            aria-checked={org.grupo}
            onClick={() => {
              mudarOrganizacao({ grupo: !org.grupo });
            }}
          >
            <span>
              Agrupar por disciplina
              <small>Separa a lista em blocos: Penal, Execução Penal…</small>
            </span>
            <i />
          </button>
          {(haTirados || org.mostrarTirados) && (
            <button
              type="button"
              className="m-chave"
              role="switch"
              aria-checked={org.mostrarTirados}
              onClick={() => {
                mudarOrganizacao({ mostrarTirados: !org.mostrarTirados });
              }}
            >
              <span>
                Mostrar as que tirei
                <small>Elas voltam à lista, marcadas. Nada foi apagado.</small>
              </span>
              <i />
            </button>
          )}
          <div className="m-fim-folha">
            <button
              type="button"
              className="m-acao"
              style={CONTORNO}
              onClick={() => {
                void fechar().then(aoEscolherVarios);
              }}
            >
              Escolher vários
            </button>
          </div>
        </>
      )}
    </FolhaM>
  );
}

export interface AcaoDoItem {
  rotulo: string;
  fazer: () => void;
}

/**
 * O que fazer com uma linha (a `folha-item` do mockup): cada ação fecha a folha e só então age. A última, em vermelho (é o
 * que o CSS do mockup faz com o último botão), é a que tira do varal.
 */
export function AcoesDoItemM({
  nome,
  acoes,
  aoFechar,
}: {
  /** O nome da linha; `null` com a folha fechada. */
  nome: string | null;
  acoes: readonly AcaoDoItem[];
  aoFechar: () => void;
}) {
  const idDoTitulo = useId();
  // Dois toques seguidos no mesmo botão (a folha leva 300 ms para descer) fariam a ação duas vezes.
  const feita = useRef(false);
  useEffect(() => {
    if (nome !== null) feita.current = false;
  }, [nome]);
  return (
    <FolhaM
      aberta={nome !== null}
      aoFechar={aoFechar}
      idDoTitulo={idDoTitulo}
      classeDoCorpo="m-acoes-item"
    >
      {(fechar) => (
        <>
          <span className="m-olho">O que fazer com</span>
          <h2 id={idDoTitulo}>{nome}</h2>
          <div>
            {acoes.map((a) => (
              <button
                key={a.rotulo}
                type="button"
                onClick={() => {
                  if (feita.current) return;
                  feita.current = true;
                  void fechar().then(a.fazer);
                }}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
        </>
      )}
    </FolhaM>
  );
}

function ConteudoDasDisciplinas({
  alvos,
  doAcervo,
  aoSalvar,
  fechar,
  idDoTitulo,
}: {
  alvos: readonly LinhaDoFolheto[];
  doAcervo: readonly string[];
  aoSalvar: (nomes: readonly string[]) => Promise<void>;
  fechar: () => Promise<void>;
  idDoTitulo: string;
}) {
  const repo = useRepositorio();
  const [doUsuario, setDoUsuario] = useState<readonly string[]>([]);
  // Uma linha só: as disciplinas dela já marcadas. Várias: começa sem nenhuma, e quem escolhe vale para todas.
  const atuais = useMemo(() => (alvos.length === 1 ? (alvos[0]?.disciplinas ?? []) : []), [alvos]);
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(() => new Set(atuais));
  const [mexeu, setMexeu] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let ativo = true;
    repo
      .colecao('disciplinas')
      .todosDoUsuario()
      .then(
        (ds) => {
          if (ativo) setDoUsuario(ds.filter((d) => d.excluidoEm === null).map((d) => d.nome));
        },
        () => undefined,
      );
    return () => {
      ativo = false;
    };
  }, [repo]);

  const opcoes = useMemo(
    () =>
      [...new Set([...doUsuario, ...doAcervo, ...atuais])]
        .filter((n) => n !== OUTROS)
        .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [doUsuario, doAcervo, atuais],
  );

  const alternar = (nome: string) => {
    setMexeu(true);
    setMarcadas((antes) => {
      const novo = new Set(antes);
      if (!novo.delete(nome)) novo.add(nome);
      return novo;
    });
  };

  const salvar = () => {
    setOcupado(true);
    setFalhou(false);
    aoSalvar([...marcadas]).then(
      () => fechar(),
      () => {
        setOcupado(false);
        setFalhou(true);
      },
    );
  };

  return (
    <>
      <span className="m-olho">Disciplina</span>
      <h2 id={idDoTitulo}>
        {alvos.length === 1 ? alvos[0]?.nome : `${String(alvos.length)} escolhidos`}
      </h2>
      <p className="m-quieto">Marque uma ou mais. Sem nenhuma, fica em “{OUTROS}”.</p>
      <div className="m-chips" role="group" aria-label="Disciplinas">
        {opcoes.map((nome) => (
          <button
            key={nome}
            type="button"
            className="m-chip"
            aria-pressed={marcadas.has(nome)}
            onClick={() => {
              alternar(nome);
            }}
          >
            {nome}
          </button>
        ))}
        <button
          type="button"
          className="m-chip"
          aria-pressed={marcadas.size === 0}
          onClick={() => {
            setMexeu(true);
            setMarcadas(new Set());
          }}
        >
          {OUTROS}
        </button>
      </div>
      {falhou && (
        <p className="m-quieto" role="alert">
          Não deu para mudar agora. Nada se perdeu; tente de novo.
        </p>
      )}
      <div className="m-fim-folha">
        <button type="button" className="m-acao" disabled={!mexeu || ocupado} onClick={salvar}>
          Pronto
        </button>
      </div>
    </>
  );
}

/** Mudar a disciplina de uma linha, ou das escolhidas: marca uma ou mais (as do app, as do acervo) e confirma. */
export function DisciplinaM({
  alvos,
  doAcervo,
  aoSalvar,
  aoFechar,
}: {
  /** As linhas a mudar; `null` com a folha fechada. */
  alvos: readonly LinhaDoFolheto[] | null;
  doAcervo: readonly string[];
  aoSalvar: (nomes: readonly string[]) => Promise<void>;
  aoFechar: () => void;
}) {
  const idDoTitulo = useId();
  return (
    <FolhaM
      aberta={alvos !== null}
      aoFechar={aoFechar}
      idDoTitulo={idDoTitulo}
      classeDoCorpo="m-opcoes-org"
    >
      {(fechar) =>
        alvos && (
          <ConteudoDasDisciplinas
            alvos={alvos}
            doAcervo={doAcervo}
            aoSalvar={aoSalvar}
            fechar={fechar}
            idDoTitulo={idDoTitulo}
          />
        )
      }
    </FolhaM>
  );
}

export interface IndicioDeMudanca {
  nome: string;
  /** "Lei nº 13.964, de 2019". */
  citada: string;
  /** A última mudança que a versão guardada conhece, se conhece alguma. */
  guardada: string | undefined;
}

/**
 * O que a conferência com o Planalto achou quando há indício de alteração: o texto não foi mudado (a pessoa decide) e o botão
 * leva a importar a página de novo.
 */
export function PlanaltoM({
  indicio,
  aoImportar,
  aoFechar,
}: {
  indicio: IndicioDeMudanca | null;
  aoImportar: () => void;
  aoFechar: () => void;
}) {
  const idDoTitulo = useId();
  return (
    <FolhaM aberta={indicio !== null} aoFechar={aoFechar} idDoTitulo={idDoTitulo}>
      {(fechar) =>
        indicio && (
          <>
            <span className="m-olho">Planalto</span>
            <h2 id={idDoTitulo}>{indicio.nome}</h2>
            <p className="m-quieto">
              A página oficial cita {indicio.citada}
              {indicio.guardada ? ` (a versão guardada vai até ${indicio.guardada})` : ''}. O texto
              da norma não foi mudado: para atualizar, importe a página de novo e escolha o que
              trocar.
            </p>
            <div className="m-fim-folha">
              <button
                type="button"
                className="m-acao"
                onClick={() => {
                  void fechar().then(aoImportar);
                }}
              >
                Importar de novo
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </>
        )
      }
    </FolhaM>
  );
}
