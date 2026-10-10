import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { aderirEmLote, type ResultadoDoLote } from '../../dominios/acervo/adesao';
import {
  agrupar,
  filtrarEntradas,
  tamanhoLegivel,
  type ModoDeAgrupar,
} from '../../dominios/acervo/agrupar';
import type { IndiceDoAcervo, TipoDoAcervo } from '../../dominios/acervo/esquemas';
import { Esqueleto, Falha, Vazio } from '../componentes/estados';
import { useDados, useRepositorio } from '../dados/contexto';
import { useFonteAcervo } from '../dados/fonteAcervoContexto';
import { AbasDaBiblioteca } from './AbasDaBiblioteca';

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

  const carregarAdicionadas = useCallback(
    async (r: typeof repo) =>
      new Set(
        (await r.colecao('normas').todosDoUsuario()).flatMap((n) =>
          n.origemAcervo ? [n.origemAcervo.id] : [],
        ),
      ),
    [],
  );
  const { dados: adicionadas } = useDados(carregarAdicionadas);

  const [modo, setModo] = useState<ModoDeAgrupar>('disciplina');
  const [busca, setBusca] = useState('');
  // `null`: ainda sem escolha do usuário (com `?tudo`, valem todas as normas do edital que faltam).
  const [escolha, setMarcados] = useState<Set<string> | null>(null);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);
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
        aoProgresso: (feitos, total) => {
          setProgresso({ feitos, total });
        },
        deveParar: () => parar.current,
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
    setMarcados((atual) => {
      const novo = new Set(atual);
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
          <div className="cabecalho-secao">
            <h2>Acervo: {TITULO_DO_TIPO[tipo]}</h2>
            <Link to="/biblioteca">Voltar à Biblioteca</Link>
          </div>
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
                  </p>
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
                      const subtitulos = i.vinculos
                        .filter((v) => modo === 'tipo' || v.disciplina === g.titulo)
                        .flatMap((v) => (v.subtitulo ? [v.subtitulo] : []));
                      return (
                        <li key={i.id}>
                          <label className="item-acervo">
                            <input
                              type="checkbox"
                              checked={jaTem || marcados.has(i.id)}
                              disabled={jaTem || ocupado}
                              onChange={() => {
                                alternar(i.id);
                              }}
                            />
                            <span>
                              <strong>{i.titulo}</strong>
                              <span className="dica">
                                {' '}
                                {jaTem ? 'Já adicionada' : tamanhoLegivel(i.tamanho)}
                                {subtitulos.length > 0 && ` · ${subtitulos.join(', ')}`}
                              </span>
                            </span>
                          </label>
                          {i.avisos.map((a) => (
                            <p key={a} className="aviso">
                              {a}
                            </p>
                          ))}
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
    </>
  );
}
