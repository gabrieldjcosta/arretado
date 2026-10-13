import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import type { Leitura, Norma, VersaoDeNorma, VinculoDeDisciplina } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { minutosAteOFimDaSecao } from '../../dominios/legislacao/continuar';
import { abrirNorma, normasPublicadas } from '../../dominios/legislacao/leitor';
import { leiturasPorNorma, lidaEm } from '../../dominios/legislacao/leituras';
import {
  descartarRascunho,
  RascunhoIndisponivel,
  rascunhosPendentes,
} from '../../dominios/legislacao/servico';
import { SEM_DISCIPLINA } from '../../dominios/acervo/agrupar';
import { itensComVersaoNova } from '../../dominios/acervo/atualizacao';
import { AcaoAgora } from '../componentes/AcaoAgora';
import { Dialogo } from '../componentes/Dialogo';
import { Esqueleto, Falha, Vazio } from '../componentes/estados';
import { LinhaLista } from '../componentes/LinhaLista';
import { Selo } from '../componentes/Selo';
import { useDados, useRepositorio } from '../dados/contexto';
import { useFonteAcervo } from '../dados/fonteAcervoContexto';
import { formatarQuando } from '../recall/rotulos';
import { procedenciaDaVersao } from './rotulos';
import { disciplinasDaNorma, mudarDisciplinas } from '../../dominios/acervo/vinculos';
import { AbasDaBiblioteca } from './AbasDaBiblioteca';
import { EscolherDisciplinas } from './EscolherDisciplinas';
import { referenciaDoNo } from './linhas';

interface ItemDaDisciplina {
  norma: Norma;
  subtitulo?: string;
  /** Endereço do começo do trecho vinculado: a norma abre nele. */
  trecho?: string;
}

/** Normas por disciplina (vínculos do acervo); o que não tem vínculo fica em "Sem disciplina". */
function agruparPorDisciplina(
  normas: readonly Norma[],
  vinculos: readonly VinculoDeDisciplina[],
  nomeDe: ReadonlyMap<string, string>,
): { titulo: string; itens: ItemDaDisciplina[] }[] {
  const mapa = new Map<string, ItemDaDisciplina[]>();
  const pôr = (titulo: string, item: ItemDaDisciplina) => {
    const lista = mapa.get(titulo);
    if (lista) lista.push(item);
    else mapa.set(titulo, [item]);
  };
  for (const n of normas) {
    const seus = vinculos.filter((v) => v.normaId === n.id);
    if (seus.length === 0) pôr(SEM_DISCIPLINA, { norma: n });
    for (const v of seus) {
      const titulo =
        (v.disciplinaId === undefined ? undefined : nomeDe.get(v.disciplinaId)) ??
        v.sugestao ??
        SEM_DISCIPLINA;
      pôr(titulo, {
        norma: n,
        ...(v.subtitulo === undefined ? {} : { subtitulo: v.subtitulo }),
        ...(v.trecho === undefined ? {} : { trecho: v.trecho.inicioEndereco }),
      });
    }
  }
  return [...mapa.entries()]
    .map(([titulo, itens]) => ({ titulo, itens }))
    .sort((a, b) =>
      a.titulo === SEM_DISCIPLINA
        ? 1
        : b.titulo === SEM_DISCIPLINA
          ? -1
          : a.titulo.localeCompare(b.titulo, 'pt-BR'),
    );
}

interface Pendente {
  norma: Norma;
  versao: VersaoDeNorma;
}

async function carregarBiblioteca(repo: Repositorio) {
  const [normas, pendentes, leituras, vinculos, disciplinas] = await Promise.all([
    normasPublicadas(repo),
    rascunhosPendentes(repo),
    leiturasPorNorma(repo),
    repo.colecao('vinculosDisciplina').todosDoUsuario(),
    repo.colecao('disciplinas').todosDoUsuario(),
  ]);
  const nomeDe = new Map(disciplinas.map((d) => [d.id, d.nome]));
  const soNormas = normas.filter((n) => n.especie !== 'sumulas' && n.especie !== 'teses');
  const porDisciplina = agruparPorDisciplina(soNormas, vinculos, nomeDe);
  const continuar = ultimaLida(normas, leituras);
  const procedencias = new Map<string, string>();
  for (const n of soNormas) {
    const v = n.versaoVigenteId
      ? await repo.colecao('versoesNorma').obter(n.versaoVigenteId)
      : undefined;
    if (v) procedencias.set(n.id, procedenciaDaVersao(n, v).join(' · '));
  }
  return {
    nomesDeDisciplinas: disciplinas.map((d) => d.nome),
    normas: soNormas,
    pendentes,
    leituras,
    procedencias,
    porDisciplina,
    continuar,
    ponto: continuar && (await pontoDaLeitura(repo, continuar.id, leituras)),
  };
}

/**
 * Onde a leitura parou e quanto falta da seção: "Art. 41" e os minutos. Sem o ponto (norma sem
 * posição guardada, ou que não abre), o "Continuar leitura" aparece sem eles.
 */
async function pontoDaLeitura(
  repo: Repositorio,
  normaId: string,
  leituras: ReadonlyMap<string, Leitura>,
): Promise<{ referencia: string; minutos: number } | undefined> {
  const leitura = leituras.get(normaId);
  const alvo = leitura?.posicaoId ?? leitura?.lidoAteId;
  if (alvo === undefined) return undefined;
  try {
    const { nos, indiceDe } = await abrirNorma(repo, normaId);
    const indice = indiceDe.get(alvo);
    if (indice === undefined) return undefined;
    const referencia = referenciaDoNo(nos, indiceDe, indice);
    return referencia === ''
      ? undefined
      : { referencia, minutos: minutosAteOFimDaSecao(nos, indice) };
  } catch {
    return undefined;
  }
}

/** A norma publicada lida por último: a do "Continuar leitura" (Parte 2 §9.2). */
function ultimaLida(normas: readonly Norma[], leituras: ReadonlyMap<string, Leitura>) {
  let ultima: { norma: Norma; leitura: Leitura } | undefined;
  for (const norma of normas) {
    const leitura = leituras.get(norma.id);
    if (leitura && (!ultima || lidaEm(leitura) > lidaEm(ultima.leitura))) {
      ultima = { norma, leitura };
    }
  }
  return ultima?.norma;
}

/** "Lei nº 7.210/1984 · Institui a Lei de Execução Penal.": o que o título curto não diz. */
function descricaoDe(norma: Norma): string {
  const referencia =
    norma.tipo !== undefined && norma.referencia !== undefined
      ? `${norma.tipo} nº ${norma.referencia}`
      : undefined;
  const partes = [
    referencia?.toLocaleLowerCase('pt-BR') === norma.tituloCurto.toLocaleLowerCase('pt-BR')
      ? undefined
      : referencia,
    norma.ementa,
  ];
  return partes.filter((p) => p !== undefined && p !== '').join(' · ');
}

/** Minúsculas e sem acento: a busca da lista não diferencia. */
function semAcento(t: string): string {
  return t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR');
}

/** Os grupos só com as normas cujo título ou descrição contém a busca. */
function filtrarGrupos<G extends { itens: ItemDaDisciplina[] }>(grupos: G[], busca: string): G[] {
  const q = semAcento(busca.trim());
  if (q === '') return grupos;
  return grupos
    .map((g) => ({
      ...g,
      itens: g.itens.filter(({ norma, subtitulo }) =>
        semAcento([norma.tituloCurto, subtitulo ?? '', descricaoDe(norma)].join(' ')).includes(q),
      ),
    }))
    .filter((g) => g.itens.length > 0);
}

/** Aviso deixado pela tela Importar ao publicar ou descartar (estado da navegação). */
function avisoDaNavegacao(estado: unknown): string | null {
  if (typeof estado !== 'object' || estado === null || !('aviso' in estado)) return null;
  return typeof estado.aviso === 'string' ? estado.aviso : null;
}

/** "Importar norma" é a ação principal enquanto não há leitura para continuar. */
const importar = (principal: boolean) => (
  <Link to="/biblioteca/importar" className={principal ? 'botao principal' : 'botao'}>
    Importar norma
  </Link>
);

/** Sempre visível: leva ao catálogo de normas do acervo, por disciplina. */
const doAcervo = (
  <Link to="/biblioteca/acervo?tipo=norma" className="botao">
    Adicionar do acervo
  </Link>
);

/** Atalho: as normas do edital de uma vez. */
const doEdital = (principal: boolean) => (
  <Link to="/biblioteca/acervo?tudo=1" className={principal ? 'botao principal' : 'botao'}>
    Tudo do edital da DPE-SP
  </Link>
);

/** Biblioteca › Normas (F2, 9.5; Parte 2 §9.2): as normas publicadas e a retomada da importação. */
export function Normas() {
  const repo = useRepositorio();
  const { dados, falha, recarregar } = useDados(carregarBiblioteca);
  const [descartando, setDescartando] = useState<Pendente | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [falhaDescarte, setFalhaDescarte] = useState<string | null>(null);
  const estadoNavegacao: unknown = useLocation().state;
  const navegar = useNavigate();
  const [aviso, setAviso] = useState(() => avisoDaNavegacao(estadoNavegacao));
  const [busca, setBusca] = useState('');
  const [mudando, setMudando] = useState<{ norma: Norma; atuais: string[] } | null>(null);
  const [falhaAoMudar, setFalhaAoMudar] = useState<string | null>(null);
  const fonte = useFonteAcervo();
  // Disciplinas que o acervo conhece: opções do "Mudar disciplina" além das do usuário.
  const [disciplinasDoAcervo, setDisciplinasDoAcervo] = useState<string[]>([]);
  // Normas do acervo com versão maior no índice: o selo "Há versão nova" (sem rede, nenhum selo).
  const [comVersaoNova, setComVersaoNova] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    let ativo = true;
    fonte
      .listar()
      .then((indice) => {
        if (ativo) {
          setDisciplinasDoAcervo([
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
  }, [fonte, repo]);

  useEffect(() => {
    // Lido uma vez: recarregar a página ou voltar a ela não repete o aviso.
    if (avisoDaNavegacao(estadoNavegacao) !== null) {
      void navegar('/biblioteca', { replace: true, state: null });
    }
  }, [estadoNavegacao, navegar]);

  function fecharDescarte() {
    setDescartando(null);
    setFalhaDescarte(null);
  }

  function descartar(pendente: Pendente) {
    if (ocupado) return;
    setOcupado(true);
    setFalhaDescarte(null);
    descartarRascunho(repo, pendente.versao.id).then(
      () => {
        setOcupado(false);
        setDescartando(null);
        setAviso(`Importação de ${pendente.norma.tituloCurto} descartada.`);
      },
      (e: unknown) => {
        setOcupado(false);
        // Outra aba pode ter publicado ou descartado antes: a lista se atualiza.
        recarregar();
        setFalhaDescarte(
          e instanceof RascunhoIndisponivel
            ? e.message
            : 'Não foi possível descartar. Feche as outras abas do Arretado e tente de novo.',
        );
      },
    );
  }

  const grupos = dados ? filtrarGrupos(dados.porDisciplina, busca) : [];

  return (
    <>
      <h1>Biblioteca</h1>
      <AbasDaBiblioteca atual="norma" />
      {aviso && (
        <p role="status" className="sucesso">
          {aviso}
        </p>
      )}
      {!dados ? (
        falha ? (
          <Falha
            oQue="Não foi possível carregar a Biblioteca."
            oQueFazer="Recarregue a página. Se continuar, feche as outras abas do Arretado."
          />
        ) : (
          <Esqueleto />
        )
      ) : (
        <>
          {dados.pendentes.length > 0 && (
            <section className="aviso faixa-rascunho" aria-label="Importações pendentes">
              <ul className="lista-simples">
                {dados.pendentes.map((p) => (
                  <li key={p.versao.id}>
                    <p>
                      <strong>{p.norma.tituloCurto}</strong>: importação pendente de revisão, desde{' '}
                      {formatarQuando(p.versao.capturadaEm)}.
                    </p>
                    <div className="acoes-item">
                      <Link
                        to={`/biblioteca/importar/${p.versao.id}`}
                        className="botao"
                        aria-label={`Retomar a importação de ${p.norma.tituloCurto}`}
                      >
                        Retomar
                      </Link>
                      <button
                        type="button"
                        aria-label={`Descartar a importação de ${p.norma.tituloCurto}`}
                        onClick={() => {
                          setAviso(null);
                          setDescartando(p);
                        }}
                      >
                        Descartar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {dados.normas.length === 0 ? (
            <Vazio
              titulo="Nenhuma norma ainda"
              acao={
                <>
                  {doEdital(true)}
                  {doAcervo}
                  {importar(false)}
                </>
              }
            >
              <p>
                Adicione as normas do edital de uma vez, ou cole a lei da página do Planalto ou da
                ALESP: o Arretado separa artigos, parágrafos e incisos para você ler e marcar.
              </p>
            </Vazio>
          ) : (
            <>
              {dados.continuar && (
                <AcaoAgora
                  titulo={
                    dados.ponto
                      ? `Você parou no ${dados.ponto.referencia} da ${dados.continuar.tituloCurto}`
                      : `Você estava lendo a ${dados.continuar.tituloCurto}`
                  }
                  estimativa={dados.ponto?.minutos}
                  rotuloBotao={`Continuar leitura: ${dados.continuar.tituloCurto}`}
                  para={`/biblioteca/normas/${dados.continuar.id}`}
                />
              )}
              <section aria-labelledby="titulo-normas">
                <div className="cabecalho-secao">
                  <h2 id="titulo-normas">Normas</h2>
                  <div className="acoes-item">
                    {doAcervo}
                    {importar(!dados.continuar)}
                  </div>
                </div>
                <p>
                  <Link to="/biblioteca/acervo?tudo=1">Tudo do edital da DPE-SP</Link>
                </p>
                <label className="busca-campo">
                  <span>Buscar norma</span>
                  <input
                    type="search"
                    value={busca}
                    placeholder="Título ou assunto"
                    onChange={(e) => {
                      setBusca(e.target.value);
                    }}
                  />
                </label>
                {grupos.length === 0 && (
                  <p role="status" className="dica">
                    Nenhuma norma com “{busca}”. Tente outra palavra.
                  </p>
                )}
                {grupos.map((g) => (
                  <section key={g.titulo} aria-label={g.titulo}>
                    {(g.titulo !== SEM_DISCIPLINA || dados.porDisciplina.length > 1) && (
                      <h3>{g.titulo}</h3>
                    )}
                    <ul className="lista-simples lista-de-linhas">
                      {g.itens.map(({ norma: n, subtitulo, trecho }) => {
                        const leitura = dados.leituras.get(n.id);
                        const apoio = [
                          leitura ? `Última leitura: ${formatarQuando(lidaEm(leitura))}` : '',
                          subtitulo,
                          descricaoDe(n),
                          dados.procedencias.get(n.id),
                        ]
                          .filter(Boolean)
                          .join(' · ');
                        const para = `/biblioteca/normas/${n.id}${
                          trecho === undefined ? '' : `?ir=${encodeURIComponent(trecho)}`
                        }`;
                        return (
                          <li key={`${n.id}-${trecho ?? ''}`}>
                            <LinhaLista
                              para={para}
                              icone="§"
                              titulo={n.tituloCurto}
                              {...(apoio ? { apoio } : {})}
                              {...(comVersaoNova.has(n.id)
                                ? { selo: <Selo>Há versão nova</Selo> }
                                : {})}
                            />
                            <button
                              type="button"
                              aria-label={`Mudar a disciplina de ${n.tituloCurto}`}
                              onClick={() => {
                                setFalhaAoMudar(null);
                                void disciplinasDaNorma(repo, n.id).then((atuais) => {
                                  setMudando({ norma: n, atuais });
                                });
                              }}
                            >
                              Mudar disciplina
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </section>
            </>
          )}
        </>
      )}
      {mudando && dados && (
        <EscolherDisciplinas
          titulo={mudando.norma.tituloCurto}
          opcoes={[...dados.nomesDeDisciplinas, ...disciplinasDoAcervo]}
          escolhidas={mudando.atuais}
          falha={falhaAoMudar}
          aoFechar={() => {
            setMudando(null);
          }}
          aoConfirmar={(nomes) => {
            mudarDisciplinas(repo, mudando.norma.id, nomes).then(
              () => {
                setAviso(`Disciplina de ${mudando.norma.tituloCurto} atualizada.`);
                setMudando(null);
                recarregar();
              },
              () => {
                setFalhaAoMudar('Não foi possível mudar a disciplina. Tente de novo.');
              },
            );
          }}
        />
      )}
      <Dialogo
        aberto={descartando !== null}
        aoFechar={fecharDescarte}
        titulo={`Descartar a importação de ${descartando?.norma.tituloCurto ?? ''}?`}
      >
        <p>
          A norma importada e a página guardada saem deste aparelho. Para lê-la, será preciso
          importá-la de novo.
        </p>
        {falhaDescarte && (
          <p role="alert" className="aviso falha">
            {falhaDescarte}
          </p>
        )}
        <div className="linha-acoes">
          <button
            type="button"
            className="perigoso"
            disabled={ocupado}
            onClick={() => {
              if (descartando) descartar(descartando);
            }}
          >
            Descartar
          </button>
          <button type="button" onClick={fecharDescarte}>
            Cancelar
          </button>
        </div>
      </Dialogo>
    </>
  );
}
