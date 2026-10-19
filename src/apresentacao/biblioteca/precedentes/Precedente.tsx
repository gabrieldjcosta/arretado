// Um precedente (F3-C, C2): a tese primeiro, o texto sob pedido, a lei e os relacionados. Tudo
// opcional e discreto: nenhum bloco aparece vazio e nada compete com a leitura.
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type {
  PontaDeVinculo,
  RotuloDoTrecho,
  TipoDeVinculoEntrePrecedentes,
} from '../../../core/modelo';
import {
  alternarFavorito,
  corrigirTextoDoPrecedente,
  criarFraseDePrecedente,
  desvincularDeDispositivo,
  desvincularPrecedentes,
  excluirPrecedente,
  lerPrecedente,
  listarPrecedentes,
  marcarTrechoChave,
  relacionadosDe,
  removerTrechoChave,
  trechoPadrao,
  vincularADispositivo,
  vincularPrecedentes,
  vinculosDoPrecedente,
} from '../../../dominios/precedentes/servico';
import { Dialogo } from '../../componentes/Dialogo';
import { Esqueleto, Falha } from '../../componentes/estados';
import { useDados, useRepositorio } from '../../dados/contexto';
import { AbasDaBiblioteca } from '../AbasDaBiblioteca';
import { DialogoEnviarAsFrases } from '../Marcacoes';
import { selecaoNoCorpo, type Selecionado } from '../resumos/selecaoNoCorpo';
import { EscolherDispositivo } from './EscolherDispositivo';
import { ROTULO_DO_TRECHO, VINCULO_ENTRANDO, VINCULO_SAINDO } from './rotulos';
import { segmentar } from './segmentos';
import './estilos-precedentes.css';
import '../resumos/estilos-resumos.css';

export function Precedente() {
  const { id = '' } = useParams();
  const repo = useRepositorio();
  const navegar = useNavigate();
  const carregar = useCallback(
    async (r: typeof repo) => {
      const p = await lerPrecedente(r, id);
      if (!p) return undefined;
      const [lei, rel, todosOsPrecedentes] = await Promise.all([
        vinculosDoPrecedente(r, id),
        relacionadosDe(r, id),
        listarPrecedentes(r),
      ]);
      const nomes = new Map<string, string>(todosOsPrecedentes.map((x) => [x.id, x.tituloTese]));
      for (const v of [...rel.saindo, ...rel.entrando]) {
        for (const ponta of [v.de, v.para]) {
          if (ponta.tipo !== 'dispositivo' || nomes.has(ponta.id)) continue;
          const [d, n] = await Promise.all([
            r.colecao('dispositivos').obter(ponta.id),
            r.colecao('normas').obter(ponta.normaId),
          ]);
          nomes.set(ponta.id, `${n?.tituloCurto ?? 'Norma'}, ${d?.rotulo ?? d?.endereco ?? ''}`);
        }
      }
      const normas = new Map<string, string>();
      for (const v of lei) {
        if (normas.has(v.normaId)) continue;
        normas.set(v.normaId, (await r.colecao('normas').obter(v.normaId))?.tituloCurto ?? 'Norma');
      }
      return { p, lei, rel, nomes, normas, outros: todosOsPrecedentes.filter((x) => x.id !== id) };
    },
    [id],
  );
  const { dados, carregando, falha } = useDados(carregar);
  const textoRef = useRef<HTMLDivElement>(null);
  const [textoAberto, setTextoAberto] = useState(false);
  const [selecionado, setSelecionado] = useState<Selecionado>();
  const [fraseAberta, setFraseAberta] = useState<Selecionado>();
  const [rotulo, setRotulo] = useState<RotuloDoTrecho>('ratio');
  const [dialogo, setDialogo] = useState<'lei' | 'relacionar' | 'corrigir'>();
  const [tipo, setTipo] = useState<TipoDeVinculoEntrePrecedentes>('relacionado');
  const [outroId, setOutroId] = useState('');
  const [corrigido, setCorrigido] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    function aoMudar() {
      setSelecionado(selecaoNoCorpo(textoRef.current));
    }
    document.addEventListener('selectionchange', aoMudar);
    return () => {
      document.removeEventListener('selectionchange', aoMudar);
    };
  }, []);

  if (falha && !dados) {
    return (
      <Falha
        oQue="Não foi possível abrir o precedente."
        oQueFazer="Volte à lista e tente de novo."
      />
    );
  }
  if (carregando && !dados) return <Esqueleto />;
  if (!dados) {
    return (
      <>
        <h1>Biblioteca</h1>
        <AbasDaBiblioteca atual="precedentes" />
        <p>Este precedente não existe mais.</p>
        <Link to="/biblioteca/precedentes" className="botao">
          Voltar aos precedentes
        </Link>
      </>
    );
  }
  const { p, lei, rel, nomes, normas, outros } = dados;
  const trechos = p.trechosChave ?? [];
  const tese = trechoPadrao(p);
  const pendentes = trechos.filter((t) => t.status === 'pendente');

  async function tentar(acao: () => Promise<unknown>, ok?: string) {
    setErro('');
    try {
      await acao();
      if (ok) {
        setAviso(ok);
        setTimeout(() => {
          setAviso('');
        }, 3000);
      }
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir. Nada foi perdido.');
      return false;
    }
  }

  function pontaDoOutro(): PontaDeVinculo {
    return { tipo: 'precedente', id: outroId };
  }

  async function relacionarComOutro(e: SyntheticEvent) {
    e.preventDefault();
    if (!outroId) return;
    const feito = await tentar(() =>
      vincularPrecedentes(repo, {
        de: { tipo: 'precedente', id },
        para: pontaDoOutro(),
        tipoDeVinculo: tipo,
      }),
    );
    if (feito) {
      setDialogo(undefined);
      setOutroId('');
    }
  }

  const segmentos = segmentar(p.textoOriginal ?? '', trechos);

  return (
    <>
      <h1>Biblioteca</h1>
      <AbasDaBiblioteca atual="precedentes" />
      <article>
        <h2>
          {p.tituloTese}{' '}
          <button
            type="button"
            className="precedente-estrela"
            aria-pressed={p.favorito === true}
            aria-label={p.favorito ? 'Tirar dos favoritos' : 'Marcar como favorito'}
            onClick={() => {
              void tentar(() => alternarFavorito(repo, id));
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="20" height="20">
              <path
                d="M12 2.6l2.8 5.9 6.5.8-4.8 4.5 1.2 6.4L12 17l-5.7 3.2 1.2-6.4-4.8-4.5 6.5-.8z"
                fill={p.favorito ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </h2>
        {rel.superado && (
          <p role="note" className="aviso">
            Este precedente foi superado por outro. Veja em “Relacionados”.
          </p>
        )}
        {tese && <blockquote className="precedente-tese texto-leitura">{tese.texto}</blockquote>}
        {pendentes.length > 0 && (
          <p className="precedente-aviso">
            {pendentes.length === 1
              ? '1 trecho-chave perdeu o lugar depois da correção do texto.'
              : `${pendentes.length} trechos-chave perderam o lugar depois da correção do texto.`}{' '}
            Marque de novo no texto ou remova.
          </p>
        )}

        <details
          open={textoAberto}
          onToggle={(e) => {
            setTextoAberto(e.currentTarget.open);
          }}
        >
          <summary className="botao botao-texto na-margem">Texto completo</summary>
          <div ref={textoRef} className="precedente-texto texto-leitura">
            {segmentos.map((s, i) =>
              s.trecho ? (
                <mark key={i} id={`trecho-${s.trecho.id}`} data-rotulo={s.trecho.rotulo}>
                  {s.texto}
                </mark>
              ) : (
                <span key={i}>{s.texto}</span>
              ),
            )}
          </div>
          <div className="linha-acoes">
            <button
              type="button"
              disabled={!selecionado}
              title={selecionado ? undefined : 'Selecione um trecho do texto'}
              onClick={() => {
                setFraseAberta(selecionado);
              }}
            >
              Enviar às frases
            </button>
            <select
              aria-label="Rótulo do trecho-chave"
              value={rotulo}
              onChange={(e) => {
                setRotulo(e.target.value as RotuloDoTrecho);
              }}
            >
              {Object.entries(ROTULO_DO_TRECHO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selecionado}
              onClick={() => {
                if (!selecionado) return;
                void tentar(
                  () =>
                    marcarTrechoChave(repo, id, {
                      inicio: selecionado.inicio,
                      fim: selecionado.fim,
                      rotulo,
                    }),
                  'Trecho-chave marcado.',
                );
              }}
            >
              Marcar como trecho-chave
            </button>
            <button
              type="button"
              onClick={() => {
                setCorrigido(p.textoOriginal ?? '');
                setDialogo('corrigir');
              }}
            >
              Corrigir o texto
            </button>
          </div>
        </details>

        {trechos.length > 1 && (
          <section aria-labelledby="trechos-chave">
            <h3 id="trechos-chave">Trechos-chave</h3>
            <ul className="lista-simples">
              {trechos.map((t) => (
                <li key={t.id}>
                  <strong>{ROTULO_DO_TRECHO[t.rotulo]}</strong>
                  {t.status === 'pendente' ? ' (para reler)' : ''}: {t.texto.slice(0, 160)}{' '}
                  {t.status !== 'pendente' && (
                    <button
                      type="button"
                      className="precedente-discreto"
                      onClick={() => {
                        setTextoAberto(true);
                        setTimeout(() => {
                          const alvo = document.getElementById(`trecho-${t.id}`);
                          if (alvo && typeof alvo.scrollIntoView === 'function') {
                            alvo.scrollIntoView({ block: 'center' });
                          }
                        }, 0);
                      }}
                    >
                      ver no texto
                    </button>
                  )}{' '}
                  {trechos.length > 1 && (
                    <button
                      type="button"
                      className="precedente-discreto"
                      onClick={() => {
                        void tentar(() => removerTrechoChave(repo, id, t.id));
                      }}
                    >
                      remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="na-lei">
          <h3 id="na-lei">Na lei</h3>
          {lei.length === 0 ? (
            <p className="precedente-aviso">Nenhum dispositivo ligado.</p>
          ) : (
            <ul className="lista-simples">
              {lei.map((v) => (
                <li key={v.id}>
                  <Link to={`/biblioteca/normas/${v.normaId}?ir=${encodeURIComponent(v.endereco)}`}>
                    {normas.get(v.normaId) ?? 'Norma'}, {v.endereco}
                  </Link>
                  {v.status === 'pendente' && ' (para reler: o dispositivo mudou)'}{' '}
                  <button
                    type="button"
                    className="precedente-discreto"
                    onClick={() => {
                      void tentar(() => desvincularDeDispositivo(repo, v.id));
                    }}
                  >
                    desligar
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              setDialogo('lei');
            }}
          >
            Ligar a um dispositivo
          </button>
        </section>

        <section aria-labelledby="relacionados">
          <h3 id="relacionados">Relacionados</h3>
          {rel.saindo.length + rel.entrando.length === 0 ? (
            <p className="precedente-aviso">Nenhum precedente relacionado.</p>
          ) : (
            <ul className="lista-simples">
              {rel.saindo.map((v) => (
                <li key={v.id}>
                  {VINCULO_SAINDO[v.tipoDeVinculo]}: <PontaLink ponta={v.para} nomes={nomes} />{' '}
                  <button
                    type="button"
                    className="precedente-discreto"
                    onClick={() => {
                      void tentar(() => desvincularPrecedentes(repo, v.id));
                    }}
                  >
                    desligar
                  </button>
                </li>
              ))}
              {rel.entrando.map((v) => (
                <li key={v.id}>
                  {VINCULO_ENTRANDO[v.tipoDeVinculo]}: <PontaLink ponta={v.de} nomes={nomes} />{' '}
                  <button
                    type="button"
                    className="precedente-discreto"
                    onClick={() => {
                      void tentar(() => desvincularPrecedentes(repo, v.id));
                    }}
                  >
                    desligar
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              setDialogo('relacionar');
            }}
          >
            Relacionar a outro
          </button>
        </section>

        <p role="status" className="resumo-discreto">
          {aviso}
        </p>
        {erro && (
          <p role="alert" className="aviso falha">
            {erro}
          </p>
        )}
        {confirmando ? (
          <p role="alert">
            Excluir este precedente e os vínculos dele?{' '}
            <button
              type="button"
              onClick={() => {
                void excluirPrecedente(repo, id).then(() => navegar('/biblioteca/precedentes'));
              }}
            >
              Excluir
            </button>{' '}
            <button
              type="button"
              autoFocus
              onClick={() => {
                setConfirmando(false);
              }}
            >
              Manter
            </button>
          </p>
        ) : (
          <p>
            <button
              type="button"
              className="resumo-excluir"
              onClick={() => {
                setConfirmando(true);
              }}
            >
              Excluir precedente
            </button>
          </p>
        )}
      </article>

      <Dialogo
        aberto={dialogo === 'lei'}
        aoFechar={() => {
          setDialogo(undefined);
        }}
        titulo="Ligar a um dispositivo"
        classe="dialogo-nota"
      >
        <EscolherDispositivo
          rotuloDoBotao="Ligar"
          escolher={async (d) => {
            await vincularADispositivo(repo, {
              precedenteId: id,
              normaId: d.normaId,
              dispositivoId: d.dispositivoId,
              endereco: d.endereco,
            });
            setDialogo(undefined);
          }}
        />
      </Dialogo>

      <Dialogo
        aberto={dialogo === 'relacionar'}
        aoFechar={() => {
          setDialogo(undefined);
        }}
        titulo="Relacionar a outro"
        classe="dialogo-nota"
      >
        <label className="resumo-campo">
          Como
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoDeVinculoEntrePrecedentes);
            }}
          >
            {Object.entries(VINCULO_SAINDO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {outros.length > 0 && (
          <form
            onSubmit={(e) => {
              void relacionarComOutro(e);
            }}
          >
            <label className="resumo-campo">
              Um precedente seu
              <select
                value={outroId}
                onChange={(e) => {
                  setOutroId(e.target.value);
                }}
              >
                <option value="">Escolha…</option>
                {outros.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.tituloTese}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={!outroId}>
              Relacionar
            </button>
          </form>
        )}
        <h3>Ou uma súmula, tese ou lei do acervo</h3>
        <EscolherDispositivo
          rotuloDoBotao="Relacionar"
          escolher={async (d) => {
            await vincularPrecedentes(repo, {
              de: { tipo: 'precedente', id },
              para: { tipo: 'dispositivo', id: d.dispositivoId, normaId: d.normaId },
              tipoDeVinculo: tipo,
            });
            setDialogo(undefined);
          }}
        />
      </Dialogo>

      <Dialogo
        aberto={dialogo === 'corrigir'}
        aoFechar={() => {
          setDialogo(undefined);
        }}
        titulo="Corrigir o texto"
        classe="dialogo-nota"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void tentar(
              () => corrigirTextoDoPrecedente(repo, id, corrigido),
              'Texto corrigido.',
            ).then((ok) => {
              if (ok) setDialogo(undefined);
            });
          }}
        >
          <label className="resumo-campo">
            Texto
            <textarea
              value={corrigido}
              rows={12}
              onChange={(e) => {
                setCorrigido(e.target.value);
              }}
            />
          </label>
          <p className="precedente-aviso">
            Os trechos-chave seguem o texto; o que não for achado fica para reler.
          </p>
          <button type="submit" disabled={!corrigido.trim()}>
            Salvar
          </button>
        </form>
      </Dialogo>

      <DialogoEnviarAsFrases
        aberto={fraseAberta !== undefined}
        trecho={fraseAberta?.texto ?? ''}
        enviar={async (texto) => {
          if (!fraseAberta) return false;
          const ok = await tentar(
            () =>
              criarFraseDePrecedente(repo, {
                texto,
                precedenteId: id,
                citado: fraseAberta.texto,
                inicio: fraseAberta.inicio,
                fim: fraseAberta.fim,
                ...(p.disciplinaId ? { disciplinaId: p.disciplinaId } : {}),
              }),
            'Enviado às frases.',
          );
          return ok;
        }}
        fechar={() => {
          setFraseAberta(undefined);
        }}
      />
    </>
  );
}

function PontaLink({ ponta, nomes }: { ponta: PontaDeVinculo; nomes: Map<string, string> }) {
  const nome = nomes.get(ponta.id) ?? 'Item';
  if (ponta.tipo === 'precedente')
    return <Link to={`/biblioteca/precedentes/${ponta.id}`}>{nome}</Link>;
  return <Link to={`/biblioteca/normas/${ponta.normaId}`}>{nome}</Link>;
}
