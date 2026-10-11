import { useCallback, useEffect, useId, useRef, useState } from 'react';
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

/**
 * Revisão do rascunho (F2, 10.1; Parte 2 §10.6, regra 12): os dispositivos "a confirmar" com
 * prévia, confirmar em lote ou um a um, e corrigir o texto de um. Nada é obrigatório: publicar
 * continua aceitando o que sobrar em lote.
 */
export function RevisaoDoRascunho({ versaoId, aConfirmar, aoMudar, aoIndisponivel }: Props) {
  const repo = useRepositorio();
  const [itens, setItens] = useState<ItemAConfirmar[]>([]);
  const aberto = useRef(ITENS_POR_PAGINA);
  const [corrigindo, setCorrigindo] = useState<ItemAConfirmar | null>(null);
  const [texto, setTexto] = useState('');
  const [rotulo, setRotulo] = useState('');
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
    setCorrigindo(item);
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
                    }}
                  />
                </div>
                <div className="campo">
                  <label htmlFor={idTexto}>Texto</label>
                  <textarea
                    id={idTexto}
                    rows={4}
                    value={texto}
                    onChange={(e) => {
                      setTexto(e.target.value);
                    }}
                  />
                </div>
                <div className="linha-acoes">
                  <button type="submit" className="principal" disabled={ocupado}>
                    Salvar e confirmar
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      setCorrigindo(null);
                    }}
                  >
                    Cancelar
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
