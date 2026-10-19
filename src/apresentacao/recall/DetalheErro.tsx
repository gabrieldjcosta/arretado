import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Erro } from '../../core/modelo';
import type { Alteracoes, Repositorio } from '../../core/persistencia';
import { ACAO_RECOMENDADA, completude } from '../../dominios/recall/causa';
import { completarErro, criarCartaoDeErro, excluirErro } from '../../dominios/recall/servico';
import { Dialogo } from '../componentes/Dialogo';
import { Esqueleto, Vazio } from '../componentes/estados';
import { useDados, useRepositorio } from '../dados/contexto';
import { ROTULO_DA_AREA } from '../textos';
import { pontosEDisciplinas } from './carregadores';
import { CamposErro } from './CamposErro';
import { formatarQuando, ROTULO_RESULTADO, ROTULO_STATUS } from './rotulos';

type Editavel = Pick<Erro, 'resultado'> & Alteracoes<'erros'>;

const CAMPOS: (keyof Editavel)[] = [
  'resultado',
  'oQueFoi',
  'fraseCorreta',
  'causa',
  'conviccao',
  'fonte',
  'respostaDada',
  'respostaCorreta',
  'justificativa',
  'disciplinaId',
  'pontoId',
];

function editavelDe(e: Erro): Editavel {
  const r: Record<string, unknown> = {};
  for (const c of CAMPOS) if (e[c] !== undefined) r[c] = e[c];
  return r as Editavel;
}

function diferencas(antes: Editavel, depois: Editavel): Alteracoes<'erros'> {
  const d: Record<string, unknown> = {};
  for (const c of CAMPOS) {
    if (JSON.stringify(antes[c]) !== JSON.stringify(depois[c])) d[c] = depois[c];
  }
  return d;
}

/** Completar depois, com salvamento automático (Parte 2 §9.1). */
export function DetalheErro() {
  const { id = '' } = useParams();
  const carregar = useCallback(
    async (repo: Repositorio) => {
      const erro = await repo.colecao('erros').obter(id);
      const cartoes = erro
        ? (
            await repo
              .colecao('cartoes')
              .listarPagina({ indice: 'erroId', de: id, ate: id, limite: 10 })
          ).itens
        : [];
      return { erro, cartoes };
    },
    [id],
  );
  const { dados } = useDados(carregar);
  if (!dados) return <Esqueleto linhas={6} />;
  if (!dados.erro) {
    return (
      <Vazio
        titulo="Erro não encontrado"
        acao={<Link to="/recall">Voltar ao {ROTULO_DA_AREA.recall}</Link>}
      >
        <p>Ele pode ter sido excluído.</p>
      </Vazio>
    );
  }
  return (
    <FormularioErro key={dados.erro.id} erro={dados.erro} temCartao={dados.cartoes.length > 0} />
  );
}

function FormularioErro({ erro, temCartao }: { erro: Erro; temCartao: boolean }) {
  const repo = useRepositorio();
  const navegar = useNavigate();
  const vinculos = useDados(pontosEDisciplinas);
  const [rascunho, setRascunho] = useState<Editavel>(() => editavelDe(erro));
  const [salvo, setSalvo] = useState<Editavel>(() => editavelDe(erro));
  const [estado, setEstado] = useState<'ocioso' | 'salvando' | 'falha'>('ocioso');
  // Precisa sobrar algo: a frase correta ou, em erro antigo, "o que foi" (D25).
  const invalido = !rascunho.fraseCorreta?.trim() && !rascunho.oQueFoi?.trim();
  const temPergunta = Boolean(rascunho.oQueFoi?.trim());
  const pendente = Object.keys(diferencas(salvo, rascunho)).length > 0;
  const [excluindo, setExcluindo] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [criandoCartao, setCriandoCartao] = useState(false);
  const pendenteAoSair = useRef<Alteracoes<'erros'> | null>(null);

  // O que ainda não foi gravado quando a tela fecha é gravado na saída (nada se perde).
  useEffect(() => {
    const mudanca = diferencas(salvo, rascunho);
    pendenteAoSair.current = Object.keys(mudanca).length > 0 && !invalido ? mudanca : null;
  }, [salvo, rascunho, invalido]);
  useEffect(
    () => () => {
      const mudanca = pendenteAoSair.current;
      if (mudanca) completarErro(repo, erro.id, mudanca).catch(() => undefined);
    },
    [repo, erro.id],
  );

  // Salvamento automático 600 ms depois da última mudança.
  useEffect(() => {
    const mudanca = diferencas(salvo, rascunho);
    if (Object.keys(mudanca).length === 0 || invalido) return;
    const t = setTimeout(() => {
      setEstado('salvando');
      completarErro(repo, erro.id, mudanca).then(
        () => {
          setSalvo((s) => ({ ...s, ...mudanca }));
          setEstado('ocioso');
        },
        () => {
          setEstado('falha');
        },
      );
    }, 600);
    return () => {
      clearTimeout(t);
    };
  }, [rascunho, salvo, repo, erro.id, invalido]);

  const mudar = (m: Partial<Editavel>) => {
    setRascunho((r) => ({ ...r, ...m }));
  };

  const mudarStatus = (status: Erro['status']) => {
    void completarErro(repo, erro.id, { status }).then(() => {
      setMensagem(`Marcado como ${ROTULO_STATUS[status].toLowerCase()}.`);
    });
  };

  const causa = rascunho.causa;
  return (
    <>
      <h1>Erro</h1>
      <p className="dica">
        Registrado em {formatarQuando(erro.criadoEm)} ·{' '}
        {completude({ ...erro, ...rascunho }) === 'rapido'
          ? 'Rápido (completar depois)'
          : 'Completo'}
        {' · '}
        <span role="status" aria-live="polite">
          {invalido
            ? 'Escreva a frase correta para salvar'
            : estado === 'falha'
              ? 'Não foi possível salvar'
              : pendente
                ? 'Salvando…'
                : 'Salvo'}
        </span>
      </p>

      <div role="group" aria-label="Resultado" className="linha-acoes">
        {(['errou', 'acertou_inseguro'] as const).map((r) => (
          <button
            key={r}
            type="button"
            className={rascunho.resultado === r ? 'principal' : ''}
            aria-pressed={rascunho.resultado === r}
            onClick={() => {
              mudar({ resultado: r });
            }}
          >
            {ROTULO_RESULTADO[r]}
          </button>
        ))}
      </div>
      <div className="campo">
        <label htmlFor="detalhe-o-que-foi">O que foi</label>
        <textarea
          id="detalhe-o-que-foi"
          rows={3}
          value={rascunho.oQueFoi ?? ''}
          onChange={(e) => {
            mudar({ oQueFoi: e.target.value });
          }}
        />
      </div>
      <CamposErro
        valor={rascunho}
        aoMudar={mudar}
        causaSugerida={erro.causaSugerida}
        pontos={vinculos.dados?.pontos ?? []}
        disciplinas={vinculos.dados?.disciplinas ?? []}
      />
      {causa && <p className="aviso">Ação recomendada: {ACAO_RECOMENDADA[causa]}</p>}

      {mensagem && (
        <p role="status" className="sucesso">
          {mensagem}
        </p>
      )}
      <div className="linha-acoes">
        {!temCartao && temPergunta && (
          <button
            type="button"
            className="principal"
            disabled={criandoCartao}
            onClick={() => {
              setCriandoCartao(true);
              criarCartaoDeErro(repo, erro.id).then(
                () => {
                  setMensagem('Cartão criado. Primeira revisão amanhã.');
                },
                () => {
                  setCriandoCartao(false);
                  setMensagem('Não foi possível criar o cartão. Tente de novo.');
                },
              );
            }}
          >
            Criar cartão
          </button>
        )}
        {erro.status !== 'resolvido' ? (
          <button
            type="button"
            onClick={() => {
              mudarStatus('resolvido');
            }}
          >
            Marcar resolvido
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              mudarStatus(temCartao ? 'com_cartao' : 'aberto');
            }}
          >
            Reabrir
          </button>
        )}
        {erro.status !== 'descartado' && (
          <button
            type="button"
            onClick={() => {
              mudarStatus('descartado');
            }}
          >
            Descartar
          </button>
        )}
        <button
          type="button"
          className="discreto"
          onClick={() => {
            setExcluindo(true);
          }}
        >
          Excluir
        </button>
      </div>
      {!temCartao && !temPergunta && (
        <p className="dica">Para criar cartão deste erro, escreva "o que foi" (a pergunta).</p>
      )}
      <p>
        <Link to="/recall">Voltar ao {ROTULO_DA_AREA.recall}</Link>
      </p>

      <Dialogo
        aberto={excluindo}
        aoFechar={() => {
          setExcluindo(false);
        }}
        titulo="Excluir este erro?"
      >
        <p>O erro sai das listas. O cartão criado a partir dele continua na fila.</p>
        <div className="linha-acoes">
          <button
            type="button"
            className="perigoso"
            onClick={() => {
              void excluirErro(repo, erro.id).then(() => {
                void navegar('/recall');
              });
            }}
          >
            Excluir
          </button>
          <button
            type="button"
            onClick={() => {
              setExcluindo(false);
            }}
          >
            Cancelar
          </button>
        </div>
      </Dialogo>
    </>
  );
}
