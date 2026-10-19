import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import {
  contasHabilitadas,
  FalhaDeConta,
  type CopiaNaNuvem,
  type SessaoDeConta,
} from '../../../integracoes/conta';
import {
  guardarCopiaNaNuvem,
  instanteDaCopia,
  listarCopiasNaNuvem,
  MANTER_NA_NUVEM,
} from '../../../integracoes/conta/backup-nuvem';
import {
  exigirConsentimento,
  registrarConsentimento,
  temConsentimento,
} from '../../../core/preferencias';
import { useRepositorio } from '../../dados/contexto';
import { useServicoDeConta } from '../entrar/ContextoConta';
import { NuvemBackupRestaurar } from './NuvemBackupRestaurar';
import { formatarInstante, formatarTamanho } from './rotulos';

type Lista =
  | { tipo: 'carregando' }
  | { tipo: 'ok'; copias: CopiaNaNuvem[] }
  | { tipo: 'sem-rede' }
  | { tipo: 'indisponivel'; texto: string };

export interface PropsNuvemBackup {
  /** Só para testes; o padrão segue T8. */
  iteracoes?: number;
  /** Chamado se a cópia aplicada trocar a identidade do banco (o app precisa reabrir). */
  recarregar?: () => void;
}

const dataDaCopia = (nome: string) => {
  const iso = instanteDaCopia(nome);
  return iso ? formatarInstante(iso) : nome;
};

/** Conta › Dados › Cópia na nuvem (F4-A, A6; T28). Só existe com `VITE_CONTA=1`. */
export function NuvemBackup(props: PropsNuvemBackup) {
  if (!contasHabilitadas()) return null;
  return <NuvemBackupDaConta {...props} />;
}

function NuvemBackupDaConta({ iteracoes, recarregar }: PropsNuvemBackup) {
  const repo = useRepositorio();
  const servico = useServicoDeConta();
  const [sessao, setSessao] = useState<SessaoDeConta | null | undefined>(undefined);
  const [lista, setLista] = useState<Lista>({ tipo: 'carregando' });
  const [guardando, setGuardando] = useState(false);
  const [frase, setFrase] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'falha'; texto: string } | null>(null);
  const [restaurando, setRestaurando] = useState<string | null>(null);
  // null = ainda lendo; true = já aceitou a política v3 para a cópia na nuvem; false = precisa pedir.
  const [aceitoAntes, setAceitoAntes] = useState<boolean | null>(null);
  const [marcouAceite, setMarcouAceite] = useState(false);

  const carregar = useCallback(async () => {
    setLista({ tipo: 'carregando' });
    try {
      setLista({ tipo: 'ok', copias: await listarCopiasNaNuvem(servico) });
    } catch (excecao) {
      if (excecao instanceof FalhaDeConta && excecao.motivo === 'sem-rede') {
        setLista({ tipo: 'sem-rede' });
      } else {
        setLista({
          tipo: 'indisponivel',
          texto:
            excecao instanceof FalhaDeConta
              ? excecao.message
              : 'Não foi possível ver a nuvem agora.',
        });
      }
    }
  }, [servico]);

  useEffect(() => {
    const vivo = { ativo: true };
    void temConsentimento(repo, 'backup-nuvem').then(
      (sim) => {
        if (vivo.ativo) setAceitoAntes(sim);
      },
      () => {
        if (vivo.ativo) setAceitoAntes(false);
      },
    );
    return () => {
      vivo.ativo = false;
    };
  }, [repo]);

  useEffect(() => {
    const vivo = { ativo: true };
    void servico.sessao().then((s) => {
      if (!vivo.ativo) return;
      setSessao(s);
      if (s) void carregar();
    });
    return () => {
      vivo.ativo = false;
    };
  }, [servico, carregar]);

  // Só a conta ativa neste aparelho guarda cópia (o banco aberto é o dela, T26).
  if (!sessao || sessao.uid !== repo.ctx.usuarioId) return null;

  const precisaAceite = aceitoAntes !== true;
  const fraseInvalida = frase.length < 8 || frase !== confirmacao;
  const semAceite = aceitoAntes === null || (precisaAceite && !marcouAceite);
  const recente = lista.tipo === 'ok' ? lista.copias[0] : undefined;

  const guardar = async (e: SubmitEvent) => {
    e.preventDefault();
    if (semAceite) return;
    setEnviando(true);
    setMensagem(null);
    try {
      // Aceito uma vez (versão v3); sem aceite gravado, nada sai do Aparelho.
      if (precisaAceite) await registrarConsentimento(repo, 'backup-nuvem');
      await exigirConsentimento(repo, 'backup-nuvem');
      setAceitoAntes(true);
      await guardarCopiaNaNuvem(repo, servico, frase, iteracoes ? { iteracoes } : {});
      setFrase('');
      setConfirmacao('');
      setMarcouAceite(false);
      setGuardando(false);
      setMensagem({
        tipo: 'ok',
        texto: `Cópia guardada na nuvem. Ficam as ${String(MANTER_NA_NUVEM)} mais recentes.`,
      });
      await carregar();
    } catch (excecao) {
      setMensagem({
        tipo: 'falha',
        texto:
          excecao instanceof FalhaDeConta
            ? excecao.message
            : 'Não foi possível guardar a cópia agora. Nada mudou na nuvem.',
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="cartao-bloco" aria-labelledby="t-nuvem">
      <h2 id="t-nuvem">Cópia na nuvem</h2>
      <ul className="lista-simples">
        <li>
          <strong>Salvo neste aparelho</strong>
        </li>
        <li aria-live="polite">
          {lista.tipo === 'carregando' && 'Conferindo a nuvem…'}
          {lista.tipo === 'ok' &&
            (recente ? (
              <strong>Com cópia na nuvem ({dataDaCopia(recente.nome)})</strong>
            ) : (
              'Ainda sem cópia na nuvem.'
            ))}
          {lista.tipo === 'sem-rede' &&
            'Sem conexão agora. A cópia na nuvem fica para quando a internet voltar; o estudo segue normal.'}
          {lista.tipo === 'indisponivel' && lista.texto}
        </li>
      </ul>
      <p className="dica">
        A cópia sai cifrada deste aparelho com uma frase que só você conhece. O servidor guarda um
        arquivo que não consegue ler.
      </p>

      {!guardando && restaurando === null && (
        <div className="linha-acoes">
          <button
            type="button"
            className="principal"
            disabled={lista.tipo !== 'ok'}
            onClick={() => {
              setMensagem(null);
              setGuardando(true);
            }}
          >
            Guardar cópia na nuvem…
          </button>
          {lista.tipo !== 'ok' && lista.tipo !== 'carregando' && (
            <button type="button" onClick={() => void carregar()}>
              Tentar de novo
            </button>
          )}
        </div>
      )}

      {guardando && (
        <form onSubmit={(e) => void guardar(e)}>
          <p className="aviso">
            O Arretado não guarda nem envia a frase. Perder a frase é perder a cópia: sem ela,
            ninguém consegue abrir o arquivo, nem nós. Anote-a num lugar seguro.
          </p>
          {precisaAceite && (
            <fieldset className="campo">
              <legend>Antes da primeira cópia</legend>
              <p>
                A cópia sai do Aparelho já cifrada (AES-256-GCM), com uma frase que só você conhece.
                O servidor guarda bytes opacos: sem a frase, nem o Arretado abre a cópia. Perdeu a
                frase, perdeu a cópia, sem jeito de recuperar. São mantidas as{' '}
                {String(MANTER_NA_NUVEM)} últimas cópias. Apagar a conta apaga as cópias.
              </p>
              <label htmlFor="nuvem-aceite">
                <input
                  id="nuvem-aceite"
                  type="checkbox"
                  checked={marcouAceite}
                  onChange={(ev) => {
                    setMarcouAceite(ev.target.checked);
                  }}
                />{' '}
                Entendi e aceito guardar uma cópia cifrada na nuvem (política de privacidade, versão
                3).
              </label>
            </fieldset>
          )}
          <div className="campo">
            <label htmlFor="nuvem-frase">Frase (mínimo 8 caracteres)</label>
            <input
              id="nuvem-frase"
              type="password"
              autoComplete="new-password"
              value={frase}
              onChange={(ev) => {
                setFrase(ev.target.value);
              }}
            />
          </div>
          <div className="campo">
            <label htmlFor="nuvem-confirmacao">Repita a frase</label>
            <input
              id="nuvem-confirmacao"
              type="password"
              autoComplete="new-password"
              value={confirmacao}
              onChange={(ev) => {
                setConfirmacao(ev.target.value);
              }}
            />
          </div>
          <div className="linha-acoes">
            <button
              type="submit"
              className="principal"
              disabled={enviando || fraseInvalida || semAceite}
            >
              {enviando ? 'Cifrando e enviando…' : 'Cifrar e guardar'}
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => {
                setGuardando(false);
                setFrase('');
                setConfirmacao('');
                setMarcouAceite(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {mensagem && (
        <p role="status" className={mensagem.tipo === 'ok' ? 'sucesso' : 'aviso'}>
          {mensagem.texto}
        </p>
      )}

      {restaurando !== null ? (
        <NuvemBackupRestaurar
          nome={restaurando}
          data={dataDaCopia(restaurando)}
          {...(recarregar ? { recarregar } : {})}
          aoFechar={() => {
            setRestaurando(null);
          }}
        />
      ) : (
        lista.tipo === 'ok' &&
        lista.copias.length > 0 &&
        !guardando && (
          <>
            <h3>Cópias guardadas</h3>
            <ul className="lista-simples">
              {lista.copias.map((c) => (
                <li key={c.nome}>
                  <span>
                    {dataDaCopia(c.nome)}
                    {c.tamanho > 0 && (
                      <>
                        <br />
                        <span className="dica">Cifrada, {formatarTamanho(c.tamanho)}</span>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    aria-label={`Restaurar a cópia de ${dataDaCopia(c.nome)}`}
                    onClick={() => {
                      setMensagem(null);
                      setRestaurando(c.nome);
                    }}
                  >
                    Restaurar…
                  </button>
                </li>
              ))}
            </ul>
          </>
        )
      )}
    </section>
  );
}
