import { useCallback, useEffect, useId, useRef, useState } from 'react';
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
import { useRepositorio } from '../dados/contexto';

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
  const idTexto = useId();
  const idRotulo = useId();

  const carregar = useCallback(async () => {
    try {
      const lista = await listarAConfirmar(repo, versaoId, { quantidade: aberto.current });
      setItens(lista.itens);
    } catch (e) {
      if (e instanceof RascunhoIndisponivel) indisponivel.current(e.message);
      else setFalha('Não foi possível ler a lista. Recarregue a página.');
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

  if (aConfirmar === 0) return null;
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
      {aConfirmar > itens.length && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => {
            aberto.current += ITENS_POR_PAGINA;
            void carregar();
          }}
        >
          {`Mostrar mais ${Math.min(ITENS_POR_PAGINA, aConfirmar - itens.length).toLocaleString('pt-BR')}`}
        </button>
      )}
    </section>
  );
}
