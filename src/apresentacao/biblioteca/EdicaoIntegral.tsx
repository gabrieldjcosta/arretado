import { useEffect, useId, useRef, useState } from 'react';
import {
  EdicaoInvalida,
  lerTextoIntegral,
  salvarTextoIntegral,
  type ResumoIntegral,
} from '../../dominios/legislacao/edicao';
import { RascunhoIndisponivel } from '../../dominios/legislacao/servico';
import { useRepositorio } from '../dados/contexto';

interface Props {
  versaoId: string;
  /** Abre já com o texto na tela (norma escrita do zero, norma sem artigos). */
  abrirAoMontar?: boolean;
  /** Depois de salvar: a tela refaz o relatório e a revisão. */
  aoMudar: () => Promise<void>;
  /** O rascunho sumiu (outra aba publicou ou descartou). */
  aoIndisponivel: (mensagem: string) => void;
}

const quantas = (n: number, uma: string, varias: string) =>
  n === 0 ? `nenhuma ${uma}` : `${n.toLocaleString('pt-BR')} ${n === 1 ? uma : varias}`;

function fraseDoResumo(r: ResumoIntegral): string {
  return [
    `Salvo. ${quantas(r.mantidos, 'linha ficou como estava', 'linhas ficaram como estavam')}`,
    quantas(r.alterados, 'mudou', 'mudaram'),
    quantas(r.novos, 'nova', 'novas'),
    `${quantas(r.removidos, 'saiu', 'saíram')}.`,
  ].join(', ');
}

/**
 * Edição integral do rascunho (F2, 10.4; Parte 2 §10.6): o texto inteiro, uma linha por
 * dispositivo com o rótulo na frente. "Salvar e reorganizar" refaz a árvore preservando o que não
 * mudou (regras em `edicao-integral.ts`); se linhas já conferidas forem sair, pergunta antes.
 */
export function EdicaoIntegral({ versaoId, abrirAoMontar, aoMudar, aoIndisponivel }: Props) {
  const repo = useRepositorio();
  const [aberto, setAberto] = useState(abrirAoMontar === true);
  const [base, setBase] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [aConfirmar, setAConfirmar] = useState<ResumoIntegral | null>(null);
  const trava = useRef(false);
  const idTexto = useId();
  const idDica = useId();
  const indisponivel = useRef(aoIndisponivel);
  useEffect(() => {
    indisponivel.current = aoIndisponivel;
  });

  useEffect(() => {
    if (!aberto || base !== null) return;
    let cancelado = false;
    lerTextoIntegral(repo, versaoId).then(
      (lido) => {
        if (cancelado) return;
        setBase(lido);
        setTexto(lido);
      },
      (e: unknown) => {
        if (cancelado) return;
        if (e instanceof RascunhoIndisponivel) indisponivel.current(e.message);
        else setFalha('Não foi possível abrir o texto. Recarregue a página e tente de novo.');
      },
    );
    return () => {
      cancelado = true;
    };
  }, [aberto, base, repo, versaoId]);

  function falhou(e: unknown) {
    if (e instanceof RascunhoIndisponivel) indisponivel.current(e.message);
    else if (e instanceof EdicaoInvalida) setFalha(e.message);
    else
      setFalha(
        'Não foi possível salvar. Feche as outras abas do Arretado e tente de novo; o texto continua na tela.',
      );
  }

  async function salvar(mesmoAssim: boolean) {
    if (trava.current || base === null) return;
    trava.current = true;
    setOcupado(true);
    setFalha(null);
    setResultado(null);
    try {
      if (!mesmoAssim) {
        const previsto = await salvarTextoIntegral(repo, versaoId, texto, { base, simular: true });
        if (previsto.removidos > 0) {
          setAConfirmar(previsto);
          return;
        }
      }
      setAConfirmar(null);
      const resumo = await salvarTextoIntegral(repo, versaoId, texto, { base });
      const novo = await lerTextoIntegral(repo, versaoId);
      setBase(novo);
      setTexto(novo);
      setResultado(fraseDoResumo(resumo));
      await aoMudar();
    } catch (e) {
      setAConfirmar(null);
      falhou(e);
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }

  const semMudanca = base === null || texto === base;
  return (
    <details
      className="revisao-bloco edicao-integral"
      open={aberto}
      onToggle={(e) => {
        setAberto(e.currentTarget.open);
      }}
    >
      <summary>Editar o texto inteiro</summary>
      <p className="dica" id={idDica}>
        Uma linha para cada dispositivo, começando pelo rótulo (Art. 1º, § 1º, I -, a), CAPÍTULO I,
        com o nome na linha de baixo). Ao salvar, o texto é reorganizado: o que você não mudou fica
        como está, inclusive o que já foi confirmado. Notas de vigência e redações anteriores não
        aparecem aqui e continuam com a linha.
      </p>
      {base === null && !falha ? (
        <p role="status">Abrindo o texto…</p>
      ) : (
        <>
          <div className="campo">
            <label htmlFor={idTexto}>Texto da norma</label>
            <textarea
              id={idTexto}
              rows={16}
              spellCheck={false}
              aria-describedby={idDica}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setResultado(null);
                setAConfirmar(null);
              }}
            />
          </div>
          {aConfirmar && (
            <div role="alert" className="aviso">
              <p>
                <strong>
                  {aConfirmar.removidos === 1
                    ? '1 linha sai do rascunho'
                    : `${aConfirmar.removidos.toLocaleString('pt-BR')} linhas saem do rascunho`}
                  {aConfirmar.conferidosRemovidos > 0 &&
                    ` (${aConfirmar.conferidosRemovidos.toLocaleString('pt-BR')} já ${aConfirmar.conferidosRemovidos === 1 ? 'conferida' : 'conferidas'})`}
                  .
                </strong>{' '}
                Salvar mesmo assim?
              </p>
              <div className="linha-acoes">
                <button
                  type="button"
                  className="perigoso"
                  disabled={ocupado}
                  onClick={() => void salvar(true)}
                >
                  Salvar mesmo assim
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAConfirmar(null);
                  }}
                >
                  Voltar ao texto
                </button>
              </div>
            </div>
          )}
          {falha && (
            <p role="alert" className="aviso falha">
              {falha}
            </p>
          )}
          <p role="status" className="dica">
            {resultado ?? ''}
          </p>
          {!aConfirmar && (
            <div className="linha-acoes">
              <button
                type="button"
                className="principal"
                disabled={ocupado || semMudanca}
                onClick={() => void salvar(false)}
              >
                {ocupado ? 'Salvando…' : 'Salvar e reorganizar'}
              </button>
              <button
                type="button"
                disabled={ocupado || semMudanca}
                onClick={() => {
                  if (base !== null) setTexto(base);
                  setFalha(null);
                }}
              >
                Desfazer o que não salvei
              </button>
            </div>
          )}
        </>
      )}
    </details>
  );
}
