import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Link } from 'react-router';
import type { Erro, Intervalo, ResultadoErro } from '../../core/modelo';
import { sugerirCausa } from '../../dominios/recall/causa';
import {
  criarCartaoDeErro,
  criarCartoesDeLacuna,
  fraseDoErro,
  LIMITE_FILA_DIARIA,
  maiorFilaProjetada,
  registrarErro,
} from '../../dominios/recall/servico';
import { useDados, useRepositorio } from '../dados/contexto';
import { ROTULO_DA_AREA } from '../textos';
import { pontosEDisciplinas } from './carregadores';
import { CamposErro, type Complemento } from './CamposErro';
import { BarraDeLacuna } from './BarraDeLacuna';
import { EditorDeLacuna } from './EditorDeLacuna';
import { ROTULO_RESULTADO } from './rotulos';

type Depois =
  { tipo: 'cartao'; erro: Erro; filaCheia: boolean } | { tipo: 'sem-cartao'; erro: Erro };

interface Escolha {
  disciplinaId?: string;
  pontoId?: string;
}

/** Disciplina e ponto da última captura, lembrados neste aparelho para a próxima (D25). */
const CHAVE_ESCOLHA = 'arretado.captura.vinculos';

function lerEscolha(): Escolha {
  try {
    const bruto = localStorage.getItem(CHAVE_ESCOLHA);
    const v: unknown = bruto ? JSON.parse(bruto) : null;
    if (!v || typeof v !== 'object') return {};
    const { disciplinaId, pontoId } = v as Record<string, unknown>;
    return {
      ...(typeof disciplinaId === 'string' ? { disciplinaId } : {}),
      ...(typeof pontoId === 'string' ? { pontoId } : {}),
    };
  } catch {
    return {};
  }
}

function gravarEscolha(e: Escolha) {
  try {
    localStorage.setItem(CHAVE_ESCOLHA, JSON.stringify(e));
  } catch {
    // Sem armazenamento (aba privada): a escolha vale só nesta tela.
  }
}

/**
 * Captura em 1 campo (D25, R3): a frase correta. Disciplina e ponto são facultativos e ficam
 * escolhidos de um registro para o seguinte; resultado, "o que foi" e o resto ficam em "mais
 * detalhes". Com "o que foi", a caixa "Criar o cartão deste erro" já vem marcada (F6): salvar já cria o
 * cartão, e depois de salvar há uma ação só, "Registrar outra"; o resto fica em "Mais".
 */
export function RegistrarErro() {
  const repo = useRepositorio();
  const vinculos = useDados(pontosEDisciplinas);
  const [frase, setFrase] = useState('');
  const [resultado, setResultado] = useState<ResultadoErro | null>(null);
  const [ocultos, setOcultos] = useState<Intervalo[]>([]);
  const [escondendo, setEscondendo] = useState(false);
  const [separados, setSeparados] = useState(false);
  const [oQueFoi, setOQueFoi] = useState('');
  const [complemento, setComplemento] = useState<Complemento>({});
  const [lembrada, setEscolha] = useState<Escolha>(lerEscolha);
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [criarCartaoAoSalvar, setCriarCartaoAoSalvar] = useState(true);
  const [depois, setDepois] = useState<Depois | null>(null);
  const campoFrase = useRef<HTMLTextAreaElement>(null);

  // A escolha lembrada só vale se a disciplina e o ponto ainda existem.
  const pontos = vinculos.dados?.pontos;
  const disciplinas = vinculos.dados?.disciplinas;
  const disciplinaLembrada = disciplinas?.find((d) => d.id === lembrada.disciplinaId);
  const pontoLembrado = pontos?.find(
    (p) =>
      p.id === lembrada.pontoId &&
      (!disciplinaLembrada || p.disciplinaId === disciplinaLembrada.id),
  );
  const escolha: Escolha = {
    ...(disciplinaLembrada ? { disciplinaId: disciplinaLembrada.id } : {}),
    ...(pontoLembrado ? { pontoId: pontoLembrado.id } : {}),
  };

  const mudarEscolha = (m: Escolha) => {
    setEscolha(() => {
      const nova = { ...escolha, ...m };
      for (const [k, v] of Object.entries(nova)) if (!v) Reflect.deleteProperty(nova, k);
      gravarEscolha(nova);
      return nova;
    });
  };

  const pronto = frase.trim() !== '';

  const salvar = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!pronto) return;
    setSalvando(true);
    setFalha(null);
    try {
      const erro = await registrarErro(repo, {
        ...complemento,
        ...escolha,
        fraseCorreta: frase,
        ...(resultado ? { resultado } : {}),
        ...(oQueFoi.trim() ? { oQueFoi } : {}),
      });
      if (ocultos.length > 0) {
        // Frase e cartão de lacuna de uma vez: o erro já está salvo se o cartão falhar.
        const f = await fraseDoErro(repo, erro.id);
        if (f) await criarCartoesDeLacuna(repo, f.id, ocultos, separados);
        const maior = await maiorFilaProjetada(repo);
        setDepois({ tipo: 'cartao', erro, filaCheia: maior > LIMITE_FILA_DIARIA });
      } else if (erro.oQueFoi && criarCartaoAoSalvar) {
        try {
          await criarCartaoDeErro(repo, erro.id);
          const maior = await maiorFilaProjetada(repo);
          setDepois({ tipo: 'cartao', erro, filaCheia: maior > LIMITE_FILA_DIARIA });
        } catch {
          setDepois({ tipo: 'sem-cartao', erro });
          setFalha('Não foi possível criar o cartão. O erro já está salvo.');
        }
      } else {
        setDepois({ tipo: 'sem-cartao', erro });
      }
    } catch {
      setFalha('Não foi possível salvar. Confira os campos e tente de novo; nada foi perdido.');
    } finally {
      setSalvando(false);
    }
  };

  // Disciplina e ponto continuam escolhidos para o registro seguinte.
  const outro = () => {
    setFrase('');
    setOcultos([]);
    setEscondendo(false);
    setResultado(null);
    setOQueFoi('');
    setComplemento({});
    setCriarCartaoAoSalvar(true);
    setDepois(null);
    setFalha(null);
  };

  // Ao voltar para o formulário, o teclado já no campo da frase.
  useEffect(() => {
    if (!depois) campoFrase.current?.focus();
  }, [depois]);

  const nomeDisciplina = disciplinaLembrada?.nome;
  const ponto = pontoLembrado;

  if (depois) {
    return (
      <>
        <h1>Registrar erro</h1>
        <p role="status" className="sucesso">
          Frase registrada.
        </p>
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
        {(nomeDisciplina ?? ponto) && (
          <p className="dica">
            A próxima fica em {[nomeDisciplina, ponto?.titulo].filter(Boolean).join(' › ')}.
          </p>
        )}
        {falha && (
          <p role="alert" className="aviso falha">
            {falha}
          </p>
        )}
        <div className="linha-acoes">
          <button type="button" className="principal" onClick={outro}>
            Registrar outra
          </button>
        </div>
        <details>
          <summary className="botao botao-texto na-margem">Mais</summary>
          <div className="linha-acoes">
            <Link to={`/recall/erros/${depois.erro.id}`} className="botao">
              Completar este erro
            </Link>
            <Link to="/recall" className="botao discreto">
              Voltar ao {ROTULO_DA_AREA.recall}
            </Link>
          </div>
        </details>
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
        <div className="campo">
          <label htmlFor="erro-frase">Frase correta</label>
          <textarea
            id="erro-frase"
            ref={campoFrase}
            rows={3}
            maxLength={2_000}
            // Teclado já aberto no campo de texto (Parte 2 §9.2).
            autoFocus
            value={frase}
            aria-describedby="erro-frase-dica"
            onChange={(e) => {
              setFrase(e.target.value);
              setOcultos([]);
            }}
          />
          <p id="erro-frase-dica" className="dica">
            O certo, em uma linha: é o que você vai revisar.
          </p>
          {pronto && (
            <button
              type="button"
              className="botao botao-texto na-margem"
              aria-expanded={escondendo}
              onClick={() => {
                setEscondendo(!escondendo);
                setOcultos([]);
              }}
            >
              {escondendo ? 'Sem lacuna' : 'Criar cartão com lacuna'}
            </button>
          )}
          {pronto && escondendo && (
            <>
              <p className="dica">
                Selecione o que quer lembrar: o trecho some. Toque na tarja para mostrar.
              </p>
              <EditorDeLacuna texto={frase.trim()} ocultos={ocultos} aoMudar={setOcultos} />
              <BarraDeLacuna
                texto={frase.trim()}
                ocultos={ocultos}
                aoMudar={setOcultos}
                separados={separados}
                aoSeparar={setSeparados}
              />
            </>
          )}
        </div>
        {disciplinas && disciplinas.length > 0 && (
          <div className="campo">
            <label htmlFor="erro-disciplina">Disciplina (opcional)</label>
            <select
              id="erro-disciplina"
              value={escolha.disciplinaId ?? ''}
              onChange={(e) => {
                const disciplinaId = e.target.value;
                const pontoFica = pontos?.some(
                  (p) => p.id === escolha.pontoId && p.disciplinaId === disciplinaId,
                );
                mudarEscolha({
                  disciplinaId,
                  ...(disciplinaId && !pontoFica ? { pontoId: '' } : {}),
                });
              }}
            >
              <option value="">—</option>
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        {pontos && pontos.length > 0 && (
          <div className="campo">
            <label htmlFor="erro-ponto">Ponto do edital (opcional)</label>
            <select
              id="erro-ponto"
              value={escolha.pontoId ?? ''}
              onChange={(e) => {
                const pontoId = e.target.value;
                const doPonto = pontos.find((p) => p.id === pontoId)?.disciplinaId;
                mudarEscolha({ pontoId, ...(doPonto ? { disciplinaId: doPonto } : {}) });
              }}
            >
              <option value="">—</option>
              {pontos
                .filter((p) => !escolha.disciplinaId || p.disciplinaId === escolha.disciplinaId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo ? `${p.codigo} ` : ''}
                    {p.titulo}
                  </option>
                ))}
            </select>
          </div>
        )}
        <details>
          <summary className="botao botao-texto na-margem">Mais detalhes (opcional)</summary>
          <div role="group" aria-label="Resultado" className="linha-acoes grupo-resultado">
            {(['errou', 'acertou_inseguro'] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={resultado === r ? 'chip principal' : 'chip'}
                aria-pressed={resultado === r}
                onClick={() => {
                  setResultado(resultado === r ? null : r);
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
              rows={3}
              maxLength={2_000}
              value={oQueFoi}
              aria-describedby="erro-o-que-foi-dica"
              onChange={(e) => {
                setOQueFoi(e.target.value);
              }}
            />
            <p id="erro-o-que-foi-dica" className="dica">
              A pergunta ou o tropeço. Com ele, o erro vira cartão.
            </p>
            {oQueFoi.trim() !== '' && (
              <label className="opcao">
                <input
                  type="checkbox"
                  checked={criarCartaoAoSalvar}
                  onChange={(e) => {
                    setCriarCartaoAoSalvar(e.target.checked);
                  }}
                />
                Criar o cartão deste erro
              </label>
            )}
          </div>
          <CamposErro
            valor={complemento}
            aoMudar={(m) => {
              setComplemento((c) => ({ ...c, ...m }));
            }}
            causaSugerida={sugerida}
            semFraseNemVinculos
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
          <Link to="/recall/registrar/varios" className="botao discreto">
            Registrar vários
          </Link>
        </div>
        {!pronto && <p className="dica">Para salvar: escreva a frase correta.</p>}
      </form>
    </>
  );
}
