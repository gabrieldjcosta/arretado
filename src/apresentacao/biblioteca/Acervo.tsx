import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  atualizarItem,
  compararComAtual,
  itensComVersaoNova,
} from '../../dominios/acervo/atualizacao';
import { resumoDaComparacao } from '../../dominios/acervo/comparacao';
import { aderirEmLote, type ResultadoDoLote } from '../../dominios/acervo/adesao';
import {
  agrupar,
  filtrarEntradas,
  normaParecida,
  tamanhoLegivel,
  type ModoDeAgrupar,
} from '../../dominios/acervo/agrupar';
import type { EntradaDoIndice, IndiceDoAcervo, TipoDoAcervo } from '../../dominios/acervo/esquemas';
import { Dialogo } from '../componentes/Dialogo';
import { Esqueleto, Falha, Vazio } from '../componentes/estados';
import { Icone } from '../componentes/Icone';
import { Voltar } from '../componentes/Voltar';
import { useDados, useRepositorio } from '../dados/contexto';
import { useFonteAcervo } from '../dados/fonteAcervoContexto';
import { disciplinasSugeridas } from '../../dominios/acervo/vinculos';
import { AbasDaBiblioteca } from './AbasDaBiblioteca';
import { EscolherDisciplinas } from './EscolherDisciplinas';
import './estilos-acervo.css';

const TITULO_DO_TIPO: Record<TipoDoAcervo, string> = {
  norma: 'normas',
  sumulas: 'súmulas',
  teses: 'teses',
};

function tipoDaBusca(valor: string | null): TipoDoAcervo {
  return valor === 'sumulas' || valor === 'teses' ? valor : 'norma';
}

/** Biblioteca › Acervo (Peça 3c): escolher o que adicionar do acervo do Arretado. */
export function Acervo() {
  const repo = useRepositorio();
  const fonte = useFonteAcervo();
  const [params] = useSearchParams();
  const tipo = tipoDaBusca(params.get('tipo'));
  const tudo = params.has('tudo');

  const [indice, setIndice] = useState<IndiceDoAcervo | null>(null);
  const [falhaIndice, setFalhaIndice] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    fonte.listar().then(
      (i) => {
        if (ativo) setIndice(i);
      },
      () => {
        if (ativo) setFalhaIndice(true);
      },
    );
    return () => {
      ativo = false;
    };
  }, [fonte, tentativa]);

  const carregarNormas = useCallback(async (r: typeof repo) => {
    const normas = (await r.colecao('normas').todosDoUsuario()).filter(
      (n) => n.excluidoEm === null,
    );
    return {
      adicionadas: new Set(normas.flatMap((n) => (n.origemAcervo ? [n.origemAcervo.id] : []))),
      coladas: normas.filter((n) => n.origemAcervo === undefined),
    };
  }, []);
  const { dados: minhas } = useDados(carregarNormas);
  const carregarDisciplinas = useCallback(
    async (r: typeof repo) =>
      (await r.colecao('disciplinas').todosDoUsuario())
        .filter((d) => d.excluidoEm === null)
        .map((d) => d.nome),
    [],
  );
  const { dados: nomesDasMinhas } = useDados(carregarDisciplinas);
  // Disciplinas escolhidas por item; sem escolha, valem as sugeridas pelo acervo.
  const [disciplinasEscolhidas, setDisciplinasEscolhidas] = useState<ReadonlyMap<string, string[]>>(
    new Map(),
  );
  const [escolhendo, setEscolhendo] = useState<EntradaDoIndice | null>(null);
  const carregarNovas = useCallback(
    async (r: typeof repo) => (indice ? itensComVersaoNova(r, indice.itens) : []),
    [indice],
  );
  const { dados: novas } = useDados(carregarNovas);
  const novaDe = new Map(novas?.map((n) => [n.entrada.id, n.entrada]));
  const [previa, setPrevia] = useState<{
    entrada: EntradaDoIndice;
    resumo?: ReturnType<typeof resumoDaComparacao>;
    falha?: boolean;
  } | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  async function abrirPrevia(entrada: EntradaDoIndice) {
    setPrevia({ entrada });
    try {
      const c = await compararComAtual(repo, fonte, entrada);
      setPrevia({ entrada, resumo: resumoDaComparacao(c) });
    } catch {
      setPrevia({ entrada, falha: true });
    }
  }

  async function confirmarAtualizacao(entrada: EntradaDoIndice) {
    setAtualizando(true);
    try {
      await atualizarItem(repo, fonte, entrada);
      setPrevia(null);
    } catch {
      setPrevia({ entrada, falha: true });
    } finally {
      setAtualizando(false);
    }
  }
  const adicionadas = minhas?.adicionadas;

  const [modo, setModo] = useState<ModoDeAgrupar>('disciplina');
  const [busca, setBusca] = useState('');
  // `null`: ainda sem escolha do usuário (com `?tudo`, valem todas as normas do edital que faltam).
  const [escolha, setMarcados] = useState<Set<string> | null>(null);
  const [progresso, setProgresso] = useState<{
    feitos: number;
    total: number;
    atual?: EntradaDoIndice;
  } | null>(null);
  const [resultado, setResultado] = useState<ResultadoDoLote | null>(null);
  const parar = useRef(false);
  const [parando, setParando] = useState(false);

  const marcados =
    escolha ??
    new Set(
      tudo && indice && adicionadas
        ? indice.itens
            .filter((i) => i.tipo === 'norma' && i.vinculos.length > 0 && !adicionadas.has(i.id))
            .map((i) => i.id)
        : [],
    );

  const ocupado = progresso !== null;

  async function adicionar(ids: string[]) {
    if (ocupado || ids.length === 0) return;
    parar.current = false;
    setParando(false);
    setResultado(null);
    setProgresso({ feitos: 0, total: ids.length });
    try {
      const r = await aderirEmLote(repo, fonte, ids, {
        aoProgresso: (feitos, total, atual) => {
          setProgresso({ feitos, total, ...(atual ? { atual } : {}) });
        },
        deveParar: () => parar.current,
        disciplinasPorItem: disciplinasEscolhidas,
      });
      setResultado(r);
      setMarcados(new Set([...r.restantes, ...r.falhas.map((f) => f.id)]));
    } catch {
      setResultado({
        adicionadas: [],
        jaAdicionadas: [],
        falhas: ids.map((id) => ({ id, motivo: 'Não foi possível adicionar.' })),
        restantes: [],
      });
    } finally {
      setProgresso(null);
    }
  }

  function alternar(id: string) {
    // Parte do que a tela mostra: sem escolha ainda, a pré-marcação do `?tudo`.
    const base = marcados;
    setMarcados((atual) => {
      const novo = new Set(atual ?? base);
      if (!novo.delete(id)) novo.add(id);
      return novo;
    });
  }

  const visiveis = indice ? filtrarEntradas(indice.itens, tipo, busca) : [];
  const grupos = agrupar(visiveis, modo);
  const pendentesVisiveis = visiveis.filter((i) => !adicionadas?.has(i.id));
  const titulos = new Map(indice?.itens.map((i) => [i.id, i.titulo]));
  const falhados = resultado?.falhas.map((f) => f.id) ?? [];
  const marcadosValidos = [...marcados].filter((id) => !adicionadas?.has(id));
  const tamanhoMarcado = indice
    ? indice.itens.filter((i) => marcadosValidos.includes(i.id)).reduce((s, i) => s + i.tamanho, 0)
    : 0;

  return (
    <>
      <h1>Biblioteca</h1>
      <AbasDaBiblioteca atual={tipo} />
      {falhaIndice ? (
        <div>
          <Falha
            oQue="Não foi possível abrir o acervo."
            oQueFazer="Precisa de internet só para adicionar. Conecte-se e tente de novo."
          />
          <div className="linha-acoes">
            <button
              type="button"
              onClick={() => {
                setFalhaIndice(false);
                setTentativa((t) => t + 1);
              }}
            >
              Tentar de novo
            </button>
            <Link to="/biblioteca" className="botao">
              Voltar à Biblioteca
            </Link>
          </div>
        </div>
      ) : !indice || !adicionadas ? (
        <Esqueleto />
      ) : (
        <>
          <Voltar para="/biblioteca">Voltar à Biblioteca</Voltar>
          <h2>Acervo: {TITULO_DO_TIPO[tipo]}</h2>
          {visiveis.length === 0 && busca === '' ? (
            <Vazio titulo={`Ainda não há ${TITULO_DO_TIPO[tipo]} no acervo`}>
              <p>Quando houver, elas aparecem aqui para você adicionar.</p>
            </Vazio>
          ) : (
            <>
              <div className="filtros-acervo">
                <label>
                  Buscar
                  <input
                    type="search"
                    value={busca}
                    onChange={(e) => {
                      setBusca(e.target.value);
                    }}
                  />
                </label>
                <label>
                  Agrupar por
                  <select
                    value={modo}
                    onChange={(e) => {
                      setModo(e.target.value === 'tipo' ? 'tipo' : 'disciplina');
                    }}
                  >
                    <option value="disciplina">Disciplina</option>
                    <option value="tipo">Tipo</option>
                  </select>
                </label>
              </div>
              <div className="linha-acoes">
                <button
                  type="button"
                  disabled={ocupado || pendentesVisiveis.length === 0}
                  onClick={() => {
                    setMarcados(new Set(pendentesVisiveis.map((i) => i.id)));
                  }}
                >
                  Marcar todos que faltam
                </button>
                <button
                  type="button"
                  className="principal"
                  disabled={ocupado || marcadosValidos.length === 0}
                  onClick={() => void adicionar(marcadosValidos)}
                >
                  Adicionar {marcadosValidos.length} ({tamanhoLegivel(tamanhoMarcado)})
                </button>
              </div>
              {progresso && (
                <div role="status" className="aviso">
                  <p>
                    {progresso.feitos} de {progresso.total}
                    {progresso.atual &&
                      ': ' +
                        progresso.atual.titulo +
                        ' (' +
                        tamanhoLegivel(progresso.atual.tamanho) +
                        ')'}
                  </p>
                  <progress
                    aria-label="Andamento da adição"
                    value={progresso.feitos}
                    max={progresso.total}
                  />
                  {progresso.atual && progresso.atual.tamanho > 500_000 && (
                    <p className="dica">
                      Norma grande: salvar no aparelho leva alguns segundos. Pode continuar; nada
                      depende da internet.
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={parando}
                    onClick={() => {
                      parar.current = true;
                      setParando(true);
                    }}
                  >
                    Parar
                  </button>
                </div>
              )}
              {resultado && (
                <div role="status" className="sucesso">
                  <p>
                    {resultado.adicionadas.length + resultado.jaAdicionadas.length} adicionadas
                    {resultado.restantes.length > 0 &&
                      `; ${resultado.restantes.length} ficaram para depois`}
                    {resultado.falhas.length > 0 && `; ${resultado.falhas.length} falharam`}.
                  </p>
                  {resultado.falhas.length > 0 && (
                    <>
                      <ul className="lista-simples">
                        {resultado.falhas.map((f) => (
                          <li key={f.id}>
                            {titulos.get(f.id) ?? f.id}: {f.motivo}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => void adicionar(falhados)}
                      >
                        Tentar de novo ({falhados.length})
                      </button>
                    </>
                  )}
                </div>
              )}
              {grupos.length === 0 && <p className="dica">Nada encontrado para essa busca.</p>}
              {grupos.map((g) => (
                <section key={g.titulo} aria-label={g.titulo}>
                  <h3>{g.titulo}</h3>
                  <ul className="lista-simples">
                    {g.itens.map((i) => {
                      const jaTem = adicionadas.has(i.id);
                      const escolhido = !jaTem && marcados.has(i.id);
                      const parecida = jaTem ? undefined : normaParecida(i, minhas.coladas);
                      const subtitulos = i.vinculos
                        .filter((v) => modo === 'tipo' || v.disciplina === g.titulo)
                        .flatMap((v) => (v.subtitulo ? [v.subtitulo] : []));
                      return (
                        <li key={i.id}>
                          <button
                            type="button"
                            className={`item-acervo-botao${escolhido ? ' selecionado' : ''}`}
                            aria-pressed={escolhido}
                            disabled={jaTem || ocupado}
                            onClick={() => {
                              alternar(i.id);
                            }}
                          >
                            <span className="item-acervo-marca" aria-hidden="true">
                              {(escolhido || jaTem) && <Icone nome="marca" />}
                            </span>
                            <span className="item-acervo-corpo">
                              <strong>{i.titulo}</strong>
                              <span className="dica">
                                {' '}
                                {jaTem ? 'Já adicionada' : tamanhoLegivel(i.tamanho)}
                                {subtitulos.length > 0 && ` · ${subtitulos.join(', ')}`}
                              </span>
                            </span>
                          </button>
                          {!jaTem && (
                            <p className="dica item-acervo-disciplina">
                              Disciplinas sugeridas:{' '}
                              {(disciplinasEscolhidas.get(i.id) ?? disciplinasSugeridas(i)).join(
                                ', ',
                              ) || 'Outros'}{' '}
                              <button
                                type="button"
                                className="botao-texto"
                                disabled={ocupado}
                                aria-label={`Alterar disciplina de ${i.titulo}`}
                                onClick={() => {
                                  setEscolhendo(i);
                                }}
                              >
                                Alterar disciplina
                              </button>
                            </p>
                          )}
                          {parecida && (
                            <p className="aviso-compacto dica">
                              <Icone nome="info" />
                              <span>Você já tem uma norma parecida: {parecida.tituloCurto}.</span>
                            </p>
                          )}
                          {jaTem && novaDe.has(i.id) && (
                            <p className="aviso">
                              Há versão nova.{' '}
                              <button
                                type="button"
                                onClick={() => {
                                  const e = novaDe.get(i.id);
                                  if (e) void abrirPrevia(e);
                                }}
                              >
                                Atualizar
                              </button>
                            </p>
                          )}
                          {i.avisos.length === 1 ? (
                            <p className="aviso-compacto dica">
                              <Icone nome="info" />
                              <span>{i.avisos[0]}</span>
                            </p>
                          ) : i.avisos.length > 1 ? (
                            <ul className="avisos-compactos dica">
                              {i.avisos.map((a) => (
                                <li key={a}>
                                  <Icone nome="info" />
                                  <span>{a}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </>
          )}
        </>
      )}
      {escolhendo && (
        <EscolherDisciplinas
          titulo={escolhendo.titulo}
          opcoes={[...(nomesDasMinhas ?? []), ...disciplinasSugeridas(escolhendo)]}
          escolhidas={disciplinasEscolhidas.get(escolhendo.id) ?? disciplinasSugeridas(escolhendo)}
          aoFechar={() => {
            setEscolhendo(null);
          }}
          aoConfirmar={(nomes) => {
            setDisciplinasEscolhidas((atual) => new Map(atual).set(escolhendo.id, nomes));
            setEscolhendo(null);
          }}
        />
      )}
      <Dialogo
        aberto={previa !== null}
        aoFechar={() => {
          if (!atualizando) setPrevia(null);
        }}
        titulo="Atualizar"
      >
        {previa && (
          <>
            <p>
              <strong>{previa.entrada.titulo}</strong>
            </p>
            {previa.falha ? (
              <Falha
                oQue="Não foi possível atualizar."
                oQueFazer="Precisa de internet só para atualizar. Seus dados continuam como estavam."
              />
            ) : previa.resumo ? (
              <ul className="lista-simples">
                <li>{previa.resumo.incluidos} dispositivos novos</li>
                <li>{previa.resumo.alterados} alterados</li>
                <li>{previa.resumo.revogados} revogados</li>
                <li>{previa.resumo.renumerados} renumerados</li>
                <li>{previa.resumo.removidos} saem da norma e viram itens para reler</li>
              </ul>
            ) : (
              <Esqueleto />
            )}
            <div className="linha-acoes">
              <button
                type="button"
                className="principal"
                disabled={!previa.resumo || atualizando}
                onClick={() => void confirmarAtualizacao(previa.entrada)}
              >
                Atualizar agora
              </button>
              <button
                type="button"
                disabled={atualizando}
                onClick={() => {
                  setPrevia(null);
                }}
              >
                Agora não
              </button>
            </div>
          </>
        )}
      </Dialogo>
    </>
  );
}
