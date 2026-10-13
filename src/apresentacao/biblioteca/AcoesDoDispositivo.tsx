// Ações por dispositivo no leitor (F2, 11.5): copiar a referência, registrar um erro já vinculado,
// criar um cartão deste trecho e ver os erros vinculados. A composição entre a Legislação e o
// Recall fica aqui, na apresentação (o domínio não importa domínio, CLAUDE.md).
import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { Link } from 'react-router';
import type { Erro, ResultadoErro } from '../../core/modelo';
import { todos } from '../../dominios/legislacao/consultas';
import { criarCartaoDeDispositivo, registrarErro } from '../../dominios/recall/servico';
import { Dialogo } from '../componentes/Dialogo';
import { useRepositorio } from '../dados/contexto';
import { ROTULO_RESULTADO } from '../recall/rotulos';
import { FormularioDaCorrecao, TextosDeAntes, type CorrecaoNoLeitor } from './CorrecaoDoTexto';

/** O dispositivo sobre o qual as ações agem: o que está no alto da tela quando o botão é tocado. */
export interface AlvoDasAcoes {
  dispositivoId: string;
  /** "Art. 9º-A": o título do diálogo. */
  nome: string;
  /** "art. 9º-A, LEP": a referência de citar. */
  referencia: string;
  /** O texto vigente, sem o tachado; ausente no nó estrutural (título, capítulo…) e enquanto carrega. */
  texto: string | undefined;
  /** O texto gravado inteiro (o tachado inclusive), o que a correção edita (11.7); ausente como `texto`. */
  textoGravado?: string | undefined;
}

/** Cabe no verso do cartão (20.000 no modelo). */
const VERSO_MAXIMO = 20_000;
/** O resumo de cada erro na lista. */
const RESUMO_DO_ERRO = 140;

/** A estrela do dispositivo do alvo (peça 1): ausente no que não leva estrela (revogado, vetado). */
export interface EstrelaDasAcoes {
  estrelado: boolean;
  alternar: () => void;
}

export function AcoesDoDispositivo({
  alvo,
  estrela,
  correcao,
  aoFechar,
}: {
  alvo: AlvoDasAcoes | undefined;
  estrela?: EstrelaDasAcoes;
  /** Corrigir o texto publicado (11.7): ausente, o botão não aparece. */
  correcao?: CorrecaoNoLeitor;
  aoFechar: () => void;
}) {
  return (
    <Dialogo
      aberto={alvo !== undefined}
      aoFechar={aoFechar}
      titulo={alvo ? `Ações de ${alvo.nome}` : 'Ações'}
      classe="dialogo-acoes"
    >
      {alvo && <Conteudo alvo={alvo} estrela={estrela} correcao={correcao} aoFechar={aoFechar} />}
    </Dialogo>
  );
}

function Conteudo({
  alvo,
  estrela,
  correcao,
  aoFechar,
}: {
  alvo: AlvoDasAcoes;
  estrela: EstrelaDasAcoes | undefined;
  correcao: CorrecaoNoLeitor | undefined;
  aoFechar: () => void;
}) {
  const repo = useRepositorio();
  const [registrando, setRegistrando] = useState(false);
  const [corrigindo, setCorrigindo] = useState(false);
  const textoGravado = alvo.textoGravado;
  const [aviso, setAviso] = useState('');
  const [falha, setFalha] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [cartaoCriado, setCartaoCriado] = useState(false);
  // O estado só muda no próximo render: a trava impede o cartão duplo no clique duplo.
  const trava = useRef(false);
  const [erros, setErros] = useState<Erro[] | 'falha' | undefined>(undefined);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    todos(repo.colecao('erros'), {
      indice: 'dispositivoId',
      de: alvo.dispositivoId,
      ate: alvo.dispositivoId,
    }).then(
      (lista) => {
        if (ativo) setErros(lista.filter((e) => e.status !== 'descartado'));
      },
      () => {
        if (ativo) setErros('falha');
      },
    );
    return () => {
      ativo = false;
    };
  }, [repo, alvo.dispositivoId, versao]);

  async function copiar() {
    setFalha('');
    try {
      await navigator.clipboard.writeText(alvo.referencia);
      setAviso(`Copiado: ${alvo.referencia}.`);
    } catch {
      setAviso('');
      setFalha(`Não consegui copiar. A referência é: ${alvo.referencia}`);
    }
  }

  async function criarCartao() {
    if (trava.current || alvo.texto === undefined) return;
    trava.current = true;
    setOcupado(true);
    setFalha('');
    try {
      await criarCartaoDeDispositivo(repo, {
        dispositivoId: alvo.dispositivoId,
        frente: `O que diz o ${alvo.referencia}?`,
        verso: alvo.texto.slice(0, VERSO_MAXIMO),
      });
      setCartaoCriado(true);
      setAviso('Cartão criado. Primeira revisão amanhã.');
    } catch {
      setFalha('Não foi possível criar o cartão. Tente de novo; nada foi perdido.');
      trava.current = false;
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="acoes-dispositivo">
      <p className="dica">{alvo.referencia}</p>
      {corrigindo && correcao && textoGravado !== undefined ? (
        <FormularioDaCorrecao
          correcao={correcao}
          dispositivoId={alvo.dispositivoId}
          textoAtual={textoGravado}
          voltar={() => {
            setCorrigindo(false);
          }}
        />
      ) : registrando ? (
        <FormularioDoErro
          alvo={alvo}
          cancelar={() => {
            setRegistrando(false);
          }}
          registrado={() => {
            setRegistrando(false);
            setAviso('Erro registrado e vinculado a este dispositivo.');
            setVersao((v) => v + 1);
          }}
        />
      ) : (
        <div className="linha-acoes acoes-do-dispositivo">
          <button
            type="button"
            className="principal"
            onClick={() => {
              setAviso('');
              setFalha('');
              setRegistrando(true);
            }}
          >
            Registrar erro
          </button>
          <button
            type="button"
            disabled={ocupado || cartaoCriado || alvo.texto === undefined}
            onClick={() => void criarCartao()}
          >
            Criar cartão deste trecho
          </button>
          {estrela && (
            <button type="button" onClick={estrela.alternar}>
              {estrela.estrelado ? 'Tirar a estrela' : 'Estrelar'}
            </button>
          )}
          <button type="button" onClick={() => void copiar()}>
            Copiar referência
          </button>
          {correcao && textoGravado !== undefined && (
            <button
              type="button"
              onClick={() => {
                setAviso('');
                setFalha('');
                setCorrigindo(true);
              }}
            >
              Corrigir o texto
            </button>
          )}
        </div>
      )}
      {alvo.texto === undefined && !registrando && !corrigindo && (
        <p className="dica">Cartão só de dispositivo com texto: role até um artigo.</p>
      )}
      <p role="status" className="sucesso">
        {aviso}
      </p>
      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
      {correcao && !corrigindo && (
        <TextosDeAntes correcao={correcao} dispositivoId={alvo.dispositivoId} />
      )}
      <ErrosVinculados
        erros={erros}
        tentar={() => {
          setVersao((v) => v + 1);
        }}
      />
      <div className="linha-acoes">
        <button type="button" onClick={aoFechar}>
          Fechar
        </button>
      </div>
    </div>
  );
}

function ErrosVinculados({
  erros,
  tentar,
}: {
  erros: Erro[] | 'falha' | undefined;
  tentar: () => void;
}) {
  const titulo = useId();
  return (
    <section aria-labelledby={titulo}>
      <h3 id={titulo}>Erros vinculados</h3>
      {erros === undefined ? (
        <p className="dica">Procurando…</p>
      ) : erros === 'falha' ? (
        <p role="alert" className="aviso falha">
          Não consegui ler os erros.{' '}
          <button type="button" onClick={tentar}>
            Tentar de novo
          </button>
        </p>
      ) : erros.length === 0 ? (
        <p className="dica">Nenhum erro vinculado a este dispositivo.</p>
      ) : (
        <ul className="erros-vinculados">
          {erros.map((e) => (
            <li key={e.id}>
              <Link to={`/recall/erros/${e.id}`}>
                {e.oQueFoi.length > RESUMO_DO_ERRO
                  ? `${e.oQueFoi.slice(0, RESUMO_DO_ERRO).trimEnd()}…`
                  : e.oQueFoi}
              </Link>{' '}
              <span className="dica">({ROTULO_RESULTADO[e.resultado]})</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Os dois campos obrigatórios do erro (D9), "O que foi" já com a referência. */
function FormularioDoErro({
  alvo,
  cancelar,
  registrado,
}: {
  alvo: AlvoDasAcoes;
  cancelar: () => void;
  registrado: () => void;
}) {
  const repo = useRepositorio();
  const prefixo = `${alvo.referencia}: `;
  const [resultado, setResultado] = useState<ResultadoErro | null>(null);
  const [oQueFoi, setOQueFoi] = useState(prefixo);
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState('');
  const trava = useRef(false);
  const campo = useRef<HTMLTextAreaElement>(null);

  // O cursor no fim da referência: a pessoa só continua a frase.
  useEffect(() => {
    const c = campo.current;
    if (!c) return;
    c.focus();
    c.setSelectionRange(c.value.length, c.value.length);
  }, []);

  // Só a referência não é "o que foi".
  const pronto = resultado !== null && oQueFoi.trim() !== '' && oQueFoi.trim() !== prefixo.trim();

  async function salvar(e: SubmitEvent) {
    e.preventDefault();
    if (!resultado || !pronto || trava.current) return;
    trava.current = true;
    setSalvando(true);
    setFalha('');
    try {
      await registrarErro(repo, { resultado, oQueFoi, dispositivoId: alvo.dispositivoId });
      registrado();
    } catch {
      trava.current = false;
      setFalha('Não foi possível salvar. Confira os campos e tente de novo; nada foi perdido.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={(e) => void salvar(e)}>
      <div role="group" aria-label="Resultado" className="linha-acoes grupo-resultado">
        {(['errou', 'acertou_inseguro'] as const).map((r) => (
          <button
            key={r}
            type="button"
            className={resultado === r ? 'principal' : undefined}
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
        <label htmlFor="erro-do-dispositivo">O que foi</label>
        <textarea
          id="erro-do-dispositivo"
          ref={campo}
          rows={3}
          maxLength={2_000}
          value={oQueFoi}
          onChange={(e) => {
            setOQueFoi(e.target.value);
          }}
        />
      </div>
      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
      <div className="linha-acoes">
        <button type="submit" className="principal" disabled={!pronto || salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" onClick={cancelar}>
          Voltar
        </button>
      </div>
    </form>
  );
}
