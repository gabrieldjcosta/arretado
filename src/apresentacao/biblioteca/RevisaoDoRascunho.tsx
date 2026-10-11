import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  confirmarBloco,
  converterBloco,
  listarDoBloco,
  listarNos,
  resumirBloco,
  trocarNoBloco,
  type Bloco,
  type NoParaEscolher,
  type ResumoDoBloco,
} from '../../dominios/legislacao/bloco';
import {
  converterLinha,
  dividirAqui,
  EdicaoInvalida,
  juntarComAnterior,
  OPCOES_DE_CONVERSAO,
  salvarTexto,
  type ConverterEm,
} from '../../dominios/legislacao/edicao';
import {
  confirmarDispositivos,
  corrigirDispositivo,
  ITENS_POR_PAGINA,
  listarAConfirmar,
  type ItemAConfirmar,
} from '../../dominios/legislacao/revisao';
import { RascunhoIndisponivel } from '../../dominios/legislacao/servico';
import type { TipoDispositivo } from '../../core/modelo';
import { useRepositorio } from '../dados/contexto';

const TIPOS_DO_BLOCO: Partial<Record<string, string>> = {
  artigo: 'artigos',
  paragrafo: 'parágrafos',
  inciso: 'incisos',
  alinea: 'alíneas',
  item: 'itens',
};

const plural = (n: number, um: string, varios: string) =>
  `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;

interface Props {
  versaoId: string;
  /** Quantos estão a confirmar agora (do relatório da tela); muda quando a revisão muda. */
  aConfirmar: number;
  /** Depois de confirmar ou corrigir: a tela refaz o relatório. */
  aoMudar: () => Promise<void>;
  /** O rascunho sumiu (outra aba publicou ou descartou). */
  aoIndisponivel: (mensagem: string) => void;
}

type Salvamento = 'salvo' | 'digitando' | 'salvando' | 'falhou';

const FRASE_SALVAMENTO: Record<Salvamento, string> = {
  salvo: 'Salvo',
  digitando: 'Digitando… salva sozinho',
  salvando: 'Salvando…',
  falhou: 'Não foi possível salvar. Tente de novo.',
};

/** Pausa na digitação antes de salvar sozinho. */
const PAUSA_DO_SALVAMENTO_MS = 800;

/**
 * Revisão do rascunho (F2, 10.1 e 10.2; Parte 2 §10.6, regra 12 e editor): os dispositivos "a
 * confirmar" com prévia, confirmar em lote ou um a um, e corrigir um. Ao corrigir, o texto e o
 * rótulo se salvam sozinhos (indicador "Salvo"), e a linha pode ser convertida em outro tipo,
 * juntada à de cima ou dividida no cursor; número e recuo ficam por conta do sistema. Nada é
 * obrigatório: publicar continua aceitando o que sobrar em lote.
 */
export function RevisaoDoRascunho({ versaoId, aConfirmar, aoMudar, aoIndisponivel }: Props) {
  const repo = useRepositorio();
  const [itens, setItens] = useState<ItemAConfirmar[]>([]);
  const [totalDaLista, setTotalDaLista] = useState(0);
  const [bloco, setBloco] = useState<Bloco | null>(null);
  const [resumo, setResumo] = useState<ResumoDoBloco | null>(null);
  const [nos, setNos] = useState<NoParaEscolher[]>([]);
  const [modoDoBloco, setModoDoBloco] = useState<'trecho' | 'artigos'>('trecho');
  const [noEscolhido, setNoEscolhido] = useState('');
  const [deArtigo, setDeArtigo] = useState('');
  const [ateArtigo, setAteArtigo] = useState('');
  const [tipoDe, setTipoDe] = useState('');
  const [tipoPara, setTipoPara] = useState<ConverterEm | ''>('');
  const [procurar, setProcurar] = useState('');
  const [trocar, setTrocar] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const aberto = useRef(ITENS_POR_PAGINA);
  const [corrigindo, setCorrigindo] = useState<ItemAConfirmar | null>(null);
  const [texto, setTexto] = useState('');
  const [rotulo, setRotulo] = useState('');
  const [salvamento, setSalvamento] = useState<Salvamento>('salvo');
  const [conversao, setConversao] = useState<ConverterEm | ''>('');
  const salvo = useRef({ texto: '', rotulo: '' });
  const gravando = useRef<Promise<void>>(Promise.resolve());
  const areaDoTexto = useRef<HTMLTextAreaElement>(null);
  const idConversao = useId();
  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const trava = useRef(false);
  // Função nova a cada render da tela: fora das dependências, para não recarregar sem parar.
  const indisponivel = useRef(aoIndisponivel);
  useEffect(() => {
    indisponivel.current = aoIndisponivel;
  });
  const idModo = useId();
  const idNo = useId();
  const idDe = useId();
  const idAte = useId();
  const idTipoDe = useId();
  const idTipoPara = useId();
  const idProcurar = useId();
  const idTrocar = useId();
  const idTexto = useId();
  const idRotulo = useId();

  const carregar = useCallback(async () => {
    try {
      const lista = bloco
        ? await listarDoBloco(repo, versaoId, bloco, { quantidade: aberto.current })
        : await listarAConfirmar(repo, versaoId, { quantidade: aberto.current });
      setItens(lista.itens);
      setTotalDaLista(lista.total);
      setResumo(bloco ? await resumirBloco(repo, versaoId, bloco) : null);
    } catch (e) {
      if (e instanceof RascunhoIndisponivel) indisponivel.current(e.message);
      else if (e instanceof EdicaoInvalida) {
        setBloco(null);
        setFalha(e.message);
      } else setFalha('Não foi possível ler a lista. Recarregue a página.');
    }
  }, [repo, versaoId, bloco]);

  // Os trechos para escolher o bloco, lidos ao abrir a seção.
  const carregarNos = useCallback(async () => {
    try {
      const lista = await listarNos(repo, versaoId);
      setNos(lista);
      setNoEscolhido((atual) => atual || (lista[0]?.id ?? ''));
    } catch {
      setNos([]);
    }
  }, [repo, versaoId]);

  // Recarrega quando o total muda (confirmou, corrigiu, ou outra aba mexeu antes do relatório).
  useEffect(() => {
    void carregar();
  }, [carregar, aConfirmar]);

  /** Grava o que está na tela (se mudou), na ordem dos pedidos anteriores. */
  const gravarAgora = useCallback(
    (alvo: ItemAConfirmar, texto1: string, rotulo1: string): Promise<void> => {
      gravando.current = gravando.current.then(async () => {
        if (texto1 === salvo.current.texto && rotulo1 === salvo.current.rotulo) return;
        setSalvamento('salvando');
        try {
          await salvarTexto(repo, versaoId, alvo.dispositivoId, { texto: texto1, rotulo: rotulo1 });
          salvo.current = { texto: texto1, rotulo: rotulo1 };
          setSalvamento('salvo');
        } catch (e) {
          if (e instanceof RascunhoIndisponivel) indisponivel.current(e.message);
          else setSalvamento('falhou');
        }
      });
      return gravando.current;
    },
    [repo, versaoId],
  );

  // Salva sozinho depois de uma pausa na digitação.
  useEffect(() => {
    if (!corrigindo) return;
    if (texto === salvo.current.texto && rotulo === salvo.current.rotulo) return;
    const espera = setTimeout(() => {
      void gravarAgora(corrigindo, texto, rotulo);
    }, PAUSA_DO_SALVAMENTO_MS);
    return () => {
      clearTimeout(espera);
    };
  }, [corrigindo, texto, rotulo, gravarAgora]);

  async function agir(acao: () => Promise<unknown>) {
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setFalha(null);
    try {
      await acao();
      await aoMudar();
      await carregar();
    } catch (e) {
      if (e instanceof RascunhoIndisponivel) indisponivel.current(e.message);
      else if (e instanceof EdicaoInvalida) setFalha(e.message);
      else
        setFalha(
          'Não foi possível salvar. Feche as outras abas do Arretado e tente de novo; nada foi perdido.',
        );
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }

  function abrirBloco() {
    setFalha(null);
    setAviso(null);
    aberto.current = ITENS_POR_PAGINA;
    setTipoDe('');
    setTipoPara('');
    setBloco(
      modoDoBloco === 'trecho'
        ? { noId: noEscolhido }
        : { de: deArtigo, ate: ateArtigo || deArtigo },
    );
  }

  function fecharBloco() {
    setBloco(null);
    setAviso(null);
    aberto.current = ITENS_POR_PAGINA;
  }

  /** Operação em lote sobre o bloco aberto; a frase do resultado vem de `frase`. */
  function noBloco(operacao: (b: Bloco) => Promise<number>, frase: (n: number) => string) {
    if (!bloco) return;
    setAviso(null);
    void agir(async () => {
      if (corrigindo) await gravarAgora(corrigindo, texto, rotulo);
      setCorrigindo(null);
      setAviso(frase(await operacao(bloco)));
    });
  }

  function corrigir(item: ItemAConfirmar) {
    setFalha(null);
    setTexto(item.texto);
    setRotulo(item.rotulo ?? '');
    salvo.current = { texto: item.texto, rotulo: item.rotulo ?? '' };
    setSalvamento('salvo');
    setConversao('');
    setCorrigindo(item);
  }

  /** Muda a estrutura: grava antes o que está na tela e fecha o formulário (a lista é refeita). */
  function mudarEstrutura(item: ItemAConfirmar, operacao: () => Promise<unknown>) {
    void agir(async () => {
      await gravarAgora(item, texto, rotulo);
      await operacao();
      setCorrigindo(null);
    });
  }

  if (aConfirmar === 0 && !bloco) return null;
  return (
    <section aria-labelledby="revisao-titulo" className="revisao">
      <h2 id="revisao-titulo">Para confirmar</h2>
      <p>
        <strong>{plural(aConfirmar, 'dispositivo', 'dispositivos')}</strong>: a leitura não teve
        certeza (texto sem formatação ou ambiguidade). Confira, corrija o que estiver errado ou
        confirme tudo de uma vez. Se preferir, publicar já aceita o que sobrar.
      </p>
      <div className="linha-acoes">
        <button
          type="button"
          className="principal"
          disabled={ocupado}
          onClick={() => void agir(() => confirmarDispositivos(repo, versaoId))}
        >
          {`Confirmar ${aConfirmar.toLocaleString('pt-BR')} ${aConfirmar === 1 ? 'dispositivo' : 'dispositivos'}`}
        </button>
      </div>
      <details
        className="revisao-bloco"
        onToggle={(e) => {
          if (e.currentTarget.open) void carregarNos();
        }}
      >
        <summary>Corrigir por bloco</summary>
        <p className="dica">
          Um bloco é um capítulo (ou outro trecho) ou um intervalo de artigos. Abra o bloco para ver
          só as linhas dele, confirmar tudo, converter um tipo de linha em outro ou trocar uma
          palavra em todas.
        </p>
        <form
          aria-label="Escolher o bloco"
          onSubmit={(e) => {
            e.preventDefault();
            abrirBloco();
          }}
        >
          <div className="campo">
            <label htmlFor={idModo}>O bloco é</label>
            <select
              id={idModo}
              value={modoDoBloco}
              onChange={(e) => {
                setModoDoBloco(e.target.value === 'artigos' ? 'artigos' : 'trecho');
              }}
            >
              <option value="trecho">Um trecho da lei (capítulo, seção…)</option>
              <option value="artigos">Um intervalo de artigos</option>
            </select>
          </div>
          {modoDoBloco === 'trecho' ? (
            <div className="campo">
              <label htmlFor={idNo}>Trecho</label>
              <select
                id={idNo}
                value={noEscolhido}
                onChange={(e) => {
                  setNoEscolhido(e.target.value);
                }}
              >
                {nos.length === 0 && <option value="">Esta lei não tem capítulos</option>}
                {nos.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.rotulo}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="linha-acoes">
              <div className="campo">
                <label htmlFor={idDe}>Do artigo</label>
                <input
                  id={idDe}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={12}
                  value={deArtigo}
                  onChange={(e) => {
                    setDeArtigo(e.target.value);
                  }}
                />
              </div>
              <div className="campo">
                <label htmlFor={idAte}>Até o artigo</label>
                <input
                  id={idAte}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={12}
                  value={ateArtigo}
                  onChange={(e) => {
                    setAteArtigo(e.target.value);
                  }}
                />
              </div>
            </div>
          )}
          <div className="linha-acoes">
            <button
              type="submit"
              disabled={
                ocupado || (modoDoBloco === 'trecho' ? noEscolhido === '' : deArtigo.trim() === '')
              }
            >
              Abrir o bloco
            </button>
            {bloco && (
              <button type="button" onClick={fecharBloco}>
                Voltar a todas as linhas
              </button>
            )}
          </div>
        </form>
        {bloco && resumo && (
          <section aria-label="Ações no bloco" className="revisao-bloco-acoes">
            <p>
              <strong>{resumo.descricao}</strong>: {plural(resumo.total, 'linha', 'linhas')},{' '}
              {resumo.aConfirmar.toLocaleString('pt-BR')} a confirmar.
            </p>
            <div className="linha-acoes">
              <button
                type="button"
                className="principal"
                disabled={ocupado || resumo.aConfirmar === 0}
                onClick={() => {
                  noBloco(
                    (b) => confirmarBloco(repo, versaoId, b),
                    (n) => `${plural(n, 'linha confirmada', 'linhas confirmadas')} no bloco.`,
                  );
                }}
              >
                {`Confirmar ${resumo.aConfirmar.toLocaleString('pt-BR')} do bloco`}
              </button>
            </div>
            <fieldset className="revisao-estrutura">
              <legend>Converter as linhas de um tipo</legend>
              <div className="linha-acoes">
                <div className="campo">
                  <label htmlFor={idTipoDe}>Converter todos os</label>
                  <select
                    id={idTipoDe}
                    value={tipoDe}
                    onChange={(e) => {
                      setTipoDe(e.target.value);
                    }}
                  >
                    <option value="">Escolha o tipo</option>
                    {Object.entries(resumo.porTipo)
                      .filter(([tipo]) => TIPOS_DO_BLOCO[tipo] !== undefined)
                      .map(([tipo, n]) => (
                        <option key={tipo} value={tipo}>
                          {`${TIPOS_DO_BLOCO[tipo] ?? tipo} (${String(n)})`}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="campo">
                  <label htmlFor={idTipoPara}>em</label>
                  <select
                    id={idTipoPara}
                    value={tipoPara}
                    onChange={(e) => {
                      setTipoPara(e.target.value as ConverterEm | '');
                    }}
                  >
                    <option value="">Escolha o tipo</option>
                    {OPCOES_DE_CONVERSAO.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                disabled={ocupado || tipoDe === '' || tipoPara === ''}
                onClick={() => {
                  if (tipoPara === '') return;
                  noBloco(
                    (b) => converterBloco(repo, versaoId, b, tipoDe as TipoDispositivo, tipoPara),
                    (n) => `${plural(n, 'linha convertida', 'linhas convertidas')}.`,
                  );
                  setTipoDe('');
                }}
              >
                Converter no bloco
              </button>
              <p className="dica">O número e o recuo são do sistema.</p>
            </fieldset>
            <fieldset className="revisao-estrutura">
              <legend>Trocar um texto em todo o bloco</legend>
              <div className="campo">
                <label htmlFor={idProcurar}>Procurar</label>
                <input
                  id={idProcurar}
                  type="text"
                  autoComplete="off"
                  maxLength={500}
                  value={procurar}
                  onChange={(e) => {
                    setProcurar(e.target.value);
                  }}
                />
              </div>
              <div className="campo">
                <label htmlFor={idTrocar}>Trocar por</label>
                <input
                  id={idTrocar}
                  type="text"
                  autoComplete="off"
                  maxLength={500}
                  value={trocar}
                  onChange={(e) => {
                    setTrocar(e.target.value);
                  }}
                />
              </div>
              <button
                type="button"
                disabled={ocupado || procurar === ''}
                onClick={() => {
                  noBloco(
                    (b) => trocarNoBloco(repo, versaoId, b, procurar, trocar),
                    (n) => `${plural(n, 'linha mudou', 'linhas mudaram')}.`,
                  );
                }}
              >
                Trocar no bloco
              </button>
              <p className="dica">Não diferencia maiúscula de minúscula; o rótulo não muda.</p>
            </fieldset>
          </section>
        )}
        {aviso && (
          <p role="status" className="dica">
            {aviso}
          </p>
        )}
      </details>
      {bloco && resumo && <h3>{`Linhas: ${resumo.descricao}`}</h3>}
      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
      <ul className="revisao-lista">
        {itens.map((item) => (
          <li key={item.dispositivoId}>
            {corrigindo?.dispositivoId === item.dispositivoId ? (
              <form
                aria-label={`Corrigir ${item.rotulo ?? 'dispositivo'}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  void agir(async () => {
                    await gravarAgora(item, texto, rotulo);
                    await corrigirDispositivo(repo, versaoId, item.dispositivoId, {
                      texto,
                      rotulo,
                    });
                    setCorrigindo(null);
                  });
                }}
              >
                {item.contexto && <p className="dica">{item.contexto}</p>}
                <div className="campo">
                  <label htmlFor={idRotulo}>Rótulo</label>
                  <input
                    id={idRotulo}
                    type="text"
                    maxLength={500}
                    autoComplete="off"
                    value={rotulo}
                    onChange={(e) => {
                      setRotulo(e.target.value);
                      setSalvamento('digitando');
                    }}
                  />
                </div>
                <div className="campo">
                  <label htmlFor={idTexto}>Texto</label>
                  <textarea
                    id={idTexto}
                    ref={areaDoTexto}
                    rows={4}
                    value={texto}
                    onChange={(e) => {
                      setTexto(e.target.value);
                      setSalvamento('digitando');
                    }}
                  />
                  <p role="status" className="dica revisao-salvo">
                    {FRASE_SALVAMENTO[salvamento]}
                  </p>
                </div>
                <fieldset className="revisao-estrutura">
                  <legend>Mudar a estrutura</legend>
                  <div className="campo">
                    <label htmlFor={idConversao}>Converter esta linha em…</label>
                    <select
                      id={idConversao}
                      value={conversao}
                      onChange={(e) => {
                        setConversao(e.target.value as ConverterEm | '');
                      }}
                    >
                      <option value="">Escolha o tipo</option>
                      {OPCOES_DE_CONVERSAO.map((o) => (
                        <option key={o.valor} value={o.valor}>
                          {o.rotulo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="linha-acoes">
                    <button
                      type="button"
                      disabled={ocupado || conversao === ''}
                      onClick={() => {
                        if (conversao !== '') {
                          mudarEstrutura(item, () =>
                            converterLinha(repo, versaoId, item.dispositivoId, conversao),
                          );
                        }
                      }}
                    >
                      Converter
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => {
                        mudarEstrutura(item, () =>
                          juntarComAnterior(repo, versaoId, item.dispositivoId),
                        );
                      }}
                    >
                      Juntar com a linha de cima
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => {
                        const corte = areaDoTexto.current?.selectionStart ?? 0;
                        mudarEstrutura(item, () =>
                          dividirAqui(repo, versaoId, item.dispositivoId, texto, corte),
                        );
                      }}
                    >
                      Dividir no cursor
                    </button>
                  </div>
                  <p className="dica">
                    O número e o recuo são do sistema. Para dividir, ponha o cursor no texto onde a
                    linha deve partir.
                  </p>
                </fieldset>
                <div className="linha-acoes">
                  <button type="submit" className="principal" disabled={ocupado}>
                    Salvar e confirmar
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      void gravarAgora(item, texto, rotulo).then(() => {
                        setCorrigindo(null);
                        void carregar();
                      });
                    }}
                  >
                    Fechar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p>
                  <strong>{item.rotulo ?? item.endereco}</strong>
                  {item.contexto && <span className="dica"> · {item.contexto}</span>}
                </p>
                <p className="revisao-previa">{item.previa || '(sem texto)'}</p>
                <div className="linha-acoes">
                  {item.confianca === 'a_confirmar' && (
                    <button
                      type="button"
                      disabled={ocupado}
                      aria-label={`Confirmar ${item.rotulo ?? item.endereco}`}
                      onClick={() =>
                        void agir(() => confirmarDispositivos(repo, versaoId, [item.dispositivoId]))
                      }
                    >
                      Confirmar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={ocupado}
                    aria-label={`Corrigir ${item.rotulo ?? item.endereco}`}
                    onClick={() => {
                      corrigir(item);
                    }}
                  >
                    Corrigir
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {(bloco ? totalDaLista : aConfirmar) > itens.length && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => {
            aberto.current += ITENS_POR_PAGINA;
            void carregar();
          }}
        >
          {`Mostrar mais ${Math.min(ITENS_POR_PAGINA, (bloco ? totalDaLista : aConfirmar) - itens.length).toLocaleString('pt-BR')}`}
        </button>
      )}
    </section>
  );
}
