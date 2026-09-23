import { useRef, useState, type SubmitEvent } from 'react';
import { Link } from 'react-router';
import type { Erro, ResultadoErro } from '../../core/modelo';
import { sugerirCausa } from '../../dominios/recall/causa';
import {
  criarCartaoDeErro,
  LIMITE_FILA_DIARIA,
  maiorFilaProjetada,
  registrarErro,
} from '../../dominios/recall/servico';
import { useDados, useRepositorio } from '../dados/contexto';
import { pontosEDisciplinas } from './carregadores';
import { CamposErro, type Complemento } from './CamposErro';
import { ROTULO_RESULTADO } from './rotulos';

type Depois =
  | { tipo: 'perguntar'; erro: Erro }
  | { tipo: 'cartao'; erro: Erro; filaCheia: boolean }
  | { tipo: 'sem-cartao'; erro: Erro };

/**
 * Captura em 2 campos (D9, Parte 2 §9.2): resultado e "o que foi". O resto fica recolhido
 * em "mais detalhes". Depois de salvar, uma linha pergunta se quer cartão — sem modal.
 */
export function RegistrarErro() {
  const repo = useRepositorio();
  const vinculos = useDados(pontosEDisciplinas);
  const [resultado, setResultado] = useState<ResultadoErro | null>(null);
  const [oQueFoi, setOQueFoi] = useState('');
  const [complemento, setComplemento] = useState<Complemento>({});
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [depois, setDepois] = useState<Depois | null>(null);
  const campoTexto = useRef<HTMLTextAreaElement>(null);

  const pronto = resultado !== null && oQueFoi.trim() !== '';

  const salvar = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!resultado || !pronto) return;
    setSalvando(true);
    setFalha(null);
    try {
      const erro = await registrarErro(repo, { resultado, oQueFoi, ...complemento });
      setDepois({ tipo: 'perguntar', erro });
    } catch {
      setFalha('Não foi possível salvar. Confira os campos e tente de novo; nada foi perdido.');
    } finally {
      setSalvando(false);
    }
  };

  const criarCartao = async (erro: Erro) => {
    if (salvando) return;
    setSalvando(true);
    try {
      await criarCartaoDeErro(repo, erro.id);
      const maior = await maiorFilaProjetada(repo);
      setDepois({ tipo: 'cartao', erro, filaCheia: maior > LIMITE_FILA_DIARIA });
    } catch {
      setFalha('Não foi possível criar o cartão. O erro já está salvo.');
    } finally {
      setSalvando(false);
    }
  };

  const outro = () => {
    setResultado(null);
    setOQueFoi('');
    setComplemento({});
    setDepois(null);
    setFalha(null);
    campoTexto.current?.focus();
  };

  if (depois) {
    return (
      <>
        <h1>Registrar erro</h1>
        <p role="status" className="sucesso">
          Erro registrado.
        </p>
        {depois.tipo === 'perguntar' && (
          <p>
            Criar cartão?{' '}
            <button
              type="button"
              className="principal"
              disabled={salvando}
              onClick={() => void criarCartao(depois.erro)}
            >
              Sim
            </button>{' '}
            <button
              type="button"
              onClick={() => {
                setDepois({ tipo: 'sem-cartao', erro: depois.erro });
              }}
            >
              Agora não
            </button>
          </p>
        )}
        {depois.tipo === 'cartao' && (
          <>
            <p role="status">Cartão criado. Primeira revisão amanhã.</p>
            {depois.filaCheia && (
              <p className="aviso">
                Há dias com mais de {LIMITE_FILA_DIARIA} revisões previstas: você está criando mais
                cartões do que revisa.
              </p>
            )}
          </>
        )}
        {falha && (
          <p role="alert" className="aviso falha">
            {falha}
          </p>
        )}
        <div className="linha-acoes">
          <button type="button" onClick={outro}>
            Registrar outro
          </button>
          <Link to={`/recall/erros/${depois.erro.id}`} className="botao">
            Completar este erro
          </Link>
          <Link to="/recall" className="botao discreto">
            Voltar ao Recall
          </Link>
        </div>
      </>
    );
  }

  const sugerida = oQueFoi.trim()
    ? sugerirCausa({
        oQueFoi,
        resultado: resultado ?? 'errou',
        ...(complemento.conviccao ? { conviccao: complemento.conviccao } : {}),
        ...(complemento.justificativa ? { justificativa: complemento.justificativa } : {}),
      })
    : undefined;

  return (
    <>
      <h1>Registrar erro</h1>
      <form onSubmit={(e) => void salvar(e)}>
        <div role="group" aria-label="Resultado" className="linha-acoes grupo-resultado">
          {(['errou', 'acertou_inseguro'] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={resultado === r ? 'principal grande' : 'grande'}
              aria-pressed={resultado === r}
              onClick={() => {
                setResultado(r);
              }}
            >
              {ROTULO_RESULTADO[r]}
            </button>
          ))}
        </div>
        <div className="campo">
          <label htmlFor="erro-o-que-foi">O que foi</label>
          <textarea
            id="erro-o-que-foi"
            ref={campoTexto}
            rows={3}
            maxLength={2_000}
            // Teclado já aberto no campo de texto (Parte 2 §9.2).
            autoFocus
            value={oQueFoi}
            onChange={(e) => {
              setOQueFoi(e.target.value);
            }}
          />
        </div>
        <details>
          <summary className="botao discreto">Mais detalhes (opcional)</summary>
          <CamposErro
            valor={complemento}
            aoMudar={(m) => {
              setComplemento((c) => ({ ...c, ...m }));
            }}
            causaSugerida={sugerida}
            pontos={vinculos.dados?.pontos ?? []}
            disciplinas={vinculos.dados?.disciplinas ?? []}
          />
        </details>
        {falha && (
          <p role="alert" className="aviso falha">
            {falha}
          </p>
        )}
        <div className="linha-acoes">
          <button type="submit" className="principal" disabled={!pronto || salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
        {!pronto && (
          <p className="dica">
            Para salvar: escolha o resultado e diga em poucas palavras o que foi.
          </p>
        )}
      </form>
    </>
  );
}
