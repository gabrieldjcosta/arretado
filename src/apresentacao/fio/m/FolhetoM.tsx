import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import type { Repositorio } from '../../../core/persistencia';
import { itensComVersaoNova } from '../../../dominios/acervo/atualizacao';
import { mudarDisciplinas, OUTROS } from '../../../dominios/acervo/vinculos';
import { useRepositorio } from '../../dados/contexto';
import { useFonteAcervo } from '../../dados/fonteAcervoContexto';
import { useFonteIncidencia } from '../../dados/fonteIncidenciaContexto';
import { useDadosDoFio } from '../dados/sem-vazio';
import { animar, cancelarAnimacoes, modoAgora, SAIR, useSinal } from './anima';
import {
  AcoesDoItemM,
  DisciplinaM,
  OrganizarM,
  PlanaltoM,
  type AcaoDoItem,
  type IndicioDeMudanca,
} from './FolhasDoFolhetoM';
import {
  devolverAoVaral,
  fixarNoAlto,
  haOrganizacao,
  mudarOrganizacao,
  tirarDoVaral,
  useOrganizacao,
} from './organizar';
import { TelaM } from './TelaM';
import { avisar } from './toast';
import { carregarLinhasDeColecoes, carregarLinhasDeNormas } from './varal-dados';
import {
  blocosDoFolheto,
  subtituloDoFolheto,
  textoDaLinha,
  type LinhaDoFolheto,
} from './varal-lista';

/**
 * O folheto de uma lista do Varal (a tela `folheto` do mockup aprovado): o nome, o que a pessoa guardou em linhas (um nome e uma
 * informação miúda), "Organizar" no alto e, embaixo, o caminho para guardar mais. Hoje são dois: as Normas e as Súmulas e teses.
 * Segurar a linha (ou o "⋯") abre o que fazer com ela; "Escolher vários", no Organizar, deixa agir em lote.
 */

type Qual = 'normas' | 'sumulas';

interface Definicao {
  titulo: string;
  /** O que o folheto diz quando não há nada nele. */
  vazio: string;
  /** Para onde "Adicionar do acervo" leva (a tela de antes, que escolhe e puxa do acervo). */
  acervo: string;
}

const FOLHETOS: Readonly<Record<Qual, Definicao>> = {
  normas: {
    titulo: 'Normas',
    vazio: 'Nenhuma norma no Varal por enquanto. Puxe uma do acervo para pendurar aqui.',
    acervo: '/biblioteca/acervo?tipo=norma',
  },
  sumulas: {
    titulo: 'Súmulas e teses',
    vazio: 'Nenhuma súmula ou tese no Varal por enquanto. Puxe do acervo para pendurar aqui.',
    acervo: '/biblioteca/acervo?tipo=sumulas',
  },
};

const ehQual = (v: string | undefined): v is Qual => v === 'normas' || v === 'sumulas';

/** Quanto tempo se segura a linha até abrir o que fazer com ela (o mockup: 520 ms). */
const SEGURAR_MS = 520;

const SEM_CONFERIR = 'Não deu para conferir agora. A norma continua como está.';

/** As linhas descem uma a uma (o mockup, `listarFolheto(true)`: 380 ms, 80 ms de espera mais 40 por linha), só no Vivo. */
function descerAsLinhas(lista: HTMLElement | null) {
  if (modoAgora() !== 'normal') return;
  lista?.querySelectorAll<HTMLElement>('.m-linha-item').forEach((linha, k) => {
    void animar(
      linha,
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 380, delay: 80 + k * 40, easing: SAIR },
    ).then(() => {
      // O quadro final é o do CSS: nada fica preso à linha.
      cancelarAnimacoes(linha);
    });
  });
}

/** Uma linha do folheto: o nome, a informação miúda, e o "⋯". Segurar a linha abre o que fazer com ela. */
function LinhaDoItem({
  linha,
  texto,
  fixa,
  varios,
  escolhida,
  aoAbrir,
  aoAcoes,
}: {
  linha: LinhaDoFolheto;
  texto: string;
  fixa: boolean;
  varios: boolean;
  escolhida: boolean;
  aoAbrir: () => void;
  aoAcoes: () => void;
}) {
  // O relógio de quem segura e o aviso de que o segurar já abriu a folha: o toque que vem logo depois não abre a linha.
  const relogio = useRef<number | undefined>(undefined);
  const segurou = useRef(false);
  useEffect(
    () => () => {
      window.clearTimeout(relogio.current);
    },
    [],
  );

  const apertar = () => {
    window.clearTimeout(relogio.current);
    segurou.current = false;
    relogio.current = window.setTimeout(() => {
      segurou.current = true;
      aoAcoes();
    }, SEGURAR_MS);
  };
  // Soltar, sair de cima ou perder o toque só para o relógio: o "segurou" fica até o toque que vem a seguir (o mockup).
  const soltar = () => {
    window.clearTimeout(relogio.current);
  };

  // O "⋯" só existe fora do "Escolher vários": com ele a linha reserva o lugar dele (`m-com-mais`, desvio 39).
  const classe = [
    'm-linha-item',
    !varios && 'm-com-mais',
    varios && 'm-escolhendo',
    escolhida && 'm-escolhido',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classe}>
      <span className="m-caixa" aria-hidden="true" />
      <button
        type="button"
        className="m-abre"
        aria-pressed={varios ? escolhida : undefined}
        onPointerDown={apertar}
        onPointerUp={soltar}
        onPointerLeave={soltar}
        onPointerCancel={soltar}
        onKeyDown={() => {
          // Pelo teclado não há segurar: o de um segurar que não terminou em toque não vale aqui.
          segurou.current = false;
        }}
        onContextMenu={(e) => {
          // O botão direito do mouse (e o segurar do toque, em alguns aparelhos) faz o mesmo que segurar.
          e.preventDefault();
          aoAcoes();
        }}
        onClick={() => {
          if (segurou.current) {
            segurou.current = false;
            return;
          }
          aoAbrir();
        }}
      >
        <span className="m-nome">
          {fixa && (
            <svg className="m-fixo" viewBox="0 0 24 24" role="img" aria-label="fixada no alto">
              <path d="M12 13v8" />
              <circle cx="12" cy="8" r="5" />
            </svg>
          )}
          {linha.nome}
          {linha.vez && (
            <>
              <span className="m-marca-vez" aria-hidden="true" />
              <span className="m-so-leitor"> (aberta agora)</span>
            </>
          )}
        </span>
        <span className="m-sec">{texto}</span>
      </button>
      {!varios && (
        <button
          type="button"
          className="m-mais"
          aria-label={`Mais ações de ${linha.nome}`}
          onClick={aoAcoes}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="1.3" />
            <circle cx="12" cy="12" r="1.3" />
            <circle cx="19" cy="12" r="1.3" />
          </svg>
        </button>
      )}
    </div>
  );
}

function ListaDoFolheto({ qual }: { qual: Qual }) {
  const def = FOLHETOS[qual];
  const navegar = useNavigate();
  const repo = useRepositorio();
  const incidencia = useFonteIncidencia();
  const acervo = useFonteAcervo();
  const org = useOrganizacao();
  const sinal = useSinal();
  const lista = useRef<HTMLDivElement>(null);

  const carregar = useCallback(
    (r: Repositorio) =>
      qual === 'normas' ? carregarLinhasDeNormas(r, incidencia) : carregarLinhasDeColecoes(r),
    [qual, incidencia],
  );
  const { dados: guardadas } = useDadosDoFio(`folheto-${qual}`, carregar);

  // O acervo não segura a lista: as disciplinas que ele conhece e o que tem versão nova chegam quando chegam (sem rede, nada).
  const [doAcervo, setDoAcervo] = useState<readonly string[]>([]);
  const [comVersaoNova, setComVersaoNova] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    let ativo = true;
    acervo
      .listar()
      .then((indice) => {
        if (ativo) {
          setDoAcervo([
            ...new Set(indice.itens.flatMap((i) => i.vinculos.map((v) => v.disciplina))),
          ]);
        }
        return itensComVersaoNova(repo, indice.itens);
      })
      .then(
        (novas) => {
          if (ativo) setComVersaoNova(new Set(novas.map((n) => n.normaId)));
        },
        () => undefined,
      );
    return () => {
      ativo = false;
    };
  }, [acervo, repo]);

  const linhas = useMemo(
    () => guardadas?.map((l) => (comVersaoNova.has(l.id) ? { ...l, versaoNova: true } : l)),
    [guardadas, comVersaoNova],
  );
  const blocos = useMemo(
    () => (linhas ? blocosDoFolheto(linhas, org, qual) : []),
    [linhas, org, qual],
  );
  const aVista = useMemo(() => blocos.flatMap((b) => b.linhas), [blocos]);
  const fixos = useMemo(() => new Set(org.fixos[qual] ?? []), [org.fixos, qual]);
  const tirados = useMemo(() => new Set(org.tirados[qual] ?? []), [org.tirados, qual]);

  const [organizando, setOrganizando] = useState(false);
  const [agindo, setAgindo] = useState<LinhaDoFolheto | null>(null);
  const [mudando, setMudando] = useState<readonly LinhaDoFolheto[] | null>(null);
  const [indicio, setIndicio] = useState<IndicioDeMudanca | null>(null);
  const [varios, setVarios] = useState(false);
  const [escolhidos, setEscolhidos] = useState<ReadonlySet<string>>(new Set());
  const dosEscolhidos = aVista.filter((l) => escolhidos.has(l.id));

  // As linhas descem quando chegam e quando a pessoa passa a escolher vários, como no mockup.
  const temLinhas = linhas !== undefined;
  useLayoutEffect(() => {
    if (temLinhas) descerAsLinhas(lista.current);
  }, [temLinhas]);
  useLayoutEffect(() => {
    if (varios) descerAsLinhas(lista.current);
  }, [varios]);

  const alternar = (id: string) => {
    setEscolhidos((antes) => {
      const novo = new Set(antes);
      if (!novo.delete(id)) novo.add(id);
      return novo;
    });
  };
  const sairDeEscolher = () => {
    setVarios(false);
    setEscolhidos(new Set());
  };

  const tirar = (alvos: readonly LinhaDoFolheto[]) => {
    const ids = alvos.map((l) => l.id);
    tirarDoVaral(qual, ids);
    const unico = alvos.length === 1 ? alvos[0] : undefined;
    avisar(
      unico ? `${unico.nome} saiu do varal.` : `${String(alvos.length)} saíram do varal.`,
      () => {
        devolverAoVaral(qual, ids);
      },
    );
  };
  const devolver = (l: LinhaDoFolheto) => {
    devolverAoVaral(qual, [l.id]);
    avisar(`${l.nome} voltou ao varal.`);
  };

  const conferir = async (l: LinhaDoFolheto) => {
    avisar(`Conferindo ${l.nome} com o Planalto…`);
    // O módulo da conferência só vem quando a pessoa a pede: o folheto não paga por ele.
    const modulo = await import('./conferir-planalto').catch(() => undefined);
    if (modulo === undefined) {
      avisar(SEM_CONFERIR);
      return;
    }
    const c = await modulo.conferirComOPlanalto(repo, l.id);
    if (sinal().aborted) return;
    const aviso = modulo.avisoDaConferencia(l.nome, c);
    if (aviso !== undefined) {
      avisar(aviso);
      return;
    }
    if (c.tipo === 'resultado' && c.resultado.tipo === 'indicio') {
      const { nota, registrada } = c.resultado;
      setIndicio({
        nome: l.nome,
        citada: `${nota.lei}, de ${String(nota.ano)}`,
        guardada: registrada ? `${registrada.lei}, de ${String(registrada.ano)}` : undefined,
      });
    }
  };

  const salvarDisciplinas = async (nomes: readonly string[]) => {
    const alvos = mudando ?? [];
    for (const l of alvos) await mudarDisciplinas(repo, l.id, nomes);
    const onde = nomes.length > 0 ? nomes.join(', ') : OUTROS;
    const unico = alvos.length === 1 ? alvos[0] : undefined;
    avisar(
      unico
        ? `${unico.nome} agora está em ${onde}.`
        : `${String(alvos.length)} escolhidos agora estão em ${onde}.`,
    );
    sairDeEscolher();
  };

  const acoesDe = (l: LinhaDoFolheto): AcaoDoItem[] => {
    const fixa = fixos.has(l.id);
    return [
      {
        rotulo: fixa ? 'Soltar do alto' : 'Fixar no alto',
        fazer: () => {
          fixarNoAlto(qual, l.id, !fixa);
        },
      },
      {
        rotulo: 'Mudar disciplina',
        fazer: () => {
          setMudando([l]);
        },
      },
      ...(qual === 'normas' && l.oficial
        ? [
            {
              rotulo: 'Atualizar com o Planalto',
              fazer: () => {
                void conferir(l);
              },
            },
          ]
        : []),
      tirados.has(l.id)
        ? {
            rotulo: 'Devolver ao varal',
            fazer: () => {
              devolver(l);
            },
          }
        : {
            rotulo: 'Tirar do varal',
            fazer: () => {
              tirar([l]);
            },
          },
    ];
  };

  const noEscolhido = (fazer: (alvos: readonly LinhaDoFolheto[]) => void) => {
    if (dosEscolhidos.length === 0) {
      avisar('Escolha pelo menos um.');
      return;
    }
    fazer(dosEscolhidos);
  };

  const vazio = linhas !== undefined && aVista.length === 0;
  const nadaGuardado = linhas?.length === 0;
  return (
    <TelaM nome="folheto" className="m-com-nav">
      <h1 className="m-so-leitor">Varal: {def.titulo}</h1>
      <div className="m-cab-folheto">
        <button
          type="button"
          className="m-voltar"
          aria-label="Voltar ao Varal"
          onClick={() => {
            void navegar('/varal');
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span className="m-olho">Varal</span>
      </div>
      <div className="m-titulo-folheto">
        <div>
          <h2>{def.titulo}</h2>
          <p>
            {subtituloDoFolheto(aVista.length, org.ordem, varios ? dosEscolhidos.length : null)}
          </p>
        </div>
        <button
          type="button"
          className="m-organizar"
          aria-haspopup="dialog"
          onClick={() => {
            setOrganizando(true);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
          Organizar
          {haOrganizacao(org) && (
            <>
              <span className="m-marca-org" aria-hidden="true" />
              <span className="m-so-leitor"> (com ajustes)</span>
            </>
          )}
        </button>
      </div>
      <span className="m-so-leitor" role="status">
        {varios ? subtituloDoFolheto(aVista.length, org.ordem, dosEscolhidos.length) : ''}
      </span>
      <div className="m-lista-folheto" ref={lista}>
        {blocos.map((bloco) => (
          <div key={bloco.titulo ?? ''} className="m-bloco-folheto">
            {bloco.titulo !== null && (
              <div className="m-grupo-folheto" role="heading" aria-level={3}>
                {bloco.titulo}
              </div>
            )}
            {bloco.linhas.map((l) => {
              const texto = textoDaLinha(l, org.vista, org.grupo);
              return (
                <LinhaDoItem
                  key={l.id}
                  linha={l}
                  texto={tirados.has(l.id) ? `tirada do varal · ${texto}` : texto}
                  fixa={fixos.has(l.id)}
                  varios={varios}
                  escolhida={escolhidos.has(l.id)}
                  aoAbrir={() => {
                    if (varios) alternar(l.id);
                    else void navegar(l.para);
                  }}
                  aoAcoes={() => {
                    setAgindo(l);
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      {vazio && (
        <div className="m-vazio-folheto">
          <p className="m-quieto">
            {nadaGuardado ? def.vazio : 'Você tirou tudo do varal. Nada foi apagado.'}
          </p>
          <button
            type="button"
            className="m-acao"
            onClick={() => {
              if (nadaGuardado) void navegar(def.acervo);
              else mudarOrganizacao({ mostrarTirados: true });
            }}
          >
            {nadaGuardado ? 'Adicionar do acervo' : 'Mostrar as que tirei'}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      )}
      {!vazio && (
        <div className="m-pe-folheto">
          {varios ? (
            <>
              <button
                type="button"
                onClick={() => {
                  noEscolhido(setMudando);
                }}
              >
                Mudar disciplina
              </button>
              <button
                type="button"
                onClick={() => {
                  noEscolhido((alvos) => {
                    tirar(alvos);
                    sairDeEscolher();
                  });
                }}
              >
                Tirar do varal
              </button>
              <button type="button" onClick={sairDeEscolher}>
                Pronto
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  void navegar(def.acervo);
                }}
              >
                + Adicionar do acervo
              </button>
              {qual === 'normas' && (
                <button
                  type="button"
                  onClick={() => {
                    void navegar('/biblioteca/importar');
                  }}
                >
                  Importar
                </button>
              )}
            </>
          )}
        </div>
      )}
      <OrganizarM
        aberta={organizando}
        aoFechar={() => {
          setOrganizando(false);
        }}
        titulo={def.titulo}
        haTirados={tirados.size > 0}
        aoEscolherVarios={() => {
          setEscolhidos(new Set());
          setVarios(true);
        }}
      />
      <AcoesDoItemM
        nome={agindo?.nome ?? null}
        acoes={agindo ? acoesDe(agindo) : []}
        aoFechar={() => {
          setAgindo(null);
        }}
      />
      <DisciplinaM
        alvos={mudando}
        doAcervo={doAcervo}
        aoSalvar={salvarDisciplinas}
        aoFechar={() => {
          setMudando(null);
        }}
      />
      <PlanaltoM
        indicio={indicio}
        aoImportar={() => {
          void navegar('/biblioteca/importar');
        }}
        aoFechar={() => {
          setIndicio(null);
        }}
      />
    </TelaM>
  );
}

/** A rota `/varal/:folheto`: um folheto que existe, ou de volta ao Varal. */
export function FolhetoM() {
  const { folheto } = useParams();
  if (!ehQual(folheto)) return <Navigate to="/varal" replace />;
  return <ListaDoFolheto key={folheto} qual={folheto} />;
}
