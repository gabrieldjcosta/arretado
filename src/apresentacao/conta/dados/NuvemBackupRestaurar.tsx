import { useState, type SubmitEvent } from 'react';
import { PacoteRecusado, type PacoteLido, type Previa } from '../../../core/pacote';
import { FalhaDeConta } from '../../../integracoes/conta';
import {
  abrirCopiaDaNuvem,
  preverUsoDaCopia,
  separarCopiaDaNuvem,
  usarCopiaDaNuvem,
} from '../../../integracoes/conta/backup-nuvem';
import type { CopiaNaNuvem } from '../../../integracoes/conta';
import { useRepositorio } from '../../dados/contexto';
import { useServicoDeConta } from '../entrar/ContextoConta';
import { PreviaImportacao, type Resolucoes } from './PreviaImportacao';

type Escolha = 'usar' | 'manter' | 'separar';

type Etapa =
  | { tipo: 'frase'; escolha?: Escolha }
  | { tipo: 'escolher'; pacote?: PacoteLido }
  | { tipo: 'previa'; pacote: PacoteLido; previa: Previa }
  | { tipo: 'feito'; texto: string };

/** As três escolhas do plano f4a-contas.md §5, item 7: nenhuma é automática. */
const ESCOLHAS: { escolha: Escolha; nome: string; descricao: string }[] = [
  {
    escolha: 'usar',
    nome: 'Usar a cópia da nuvem',
    descricao:
      'Substitui o que está neste aparelho pela cópia. Antes, um ponto de restauração guarda o estado atual.',
  },
  {
    escolha: 'manter',
    nome: 'Manter o que está neste aparelho',
    descricao: 'Fica tudo como está. A nuvem só muda quando você guardar uma nova cópia.',
  },
  {
    escolha: 'separar',
    nome: 'Importar para um espaço separado',
    descricao: 'Abre a cópia ao lado, sem mexer no que está aqui. Depois, dá para mesclar as duas.',
  },
];

function mensagemDe(excecao: unknown): string {
  if (excecao instanceof PacoteRecusado && excecao.motivo === 'senha_ou_arquivo_invalido') {
    return 'Esta frase não abre a cópia. Nada foi alterado neste aparelho; confira a frase e tente de novo.';
  }
  if (excecao instanceof FalhaDeConta || excecao instanceof PacoteRecusado) {
    return `${excecao.message} Nada foi alterado neste aparelho.`;
  }
  return 'Não foi possível abrir a cópia agora. Nada foi alterado neste aparelho.';
}

const totalDeRegistros = (pacote: PacoteLido) =>
  Object.values(pacote.manifesto.contagens).reduce((s, n) => s + n, 0);

export function NuvemBackupRestaurar({
  nome,
  data,
  recarregar = () => {
    window.location.reload();
  },
  copia,
  aoFechar,
}: {
  nome: string;
  data: string;
  recarregar?: () => void;
  /** Inicia pelas escolhas no fim da migração; a cópia ainda só baixa após escolha explícita. */
  copia?: CopiaNaNuvem;
  aoFechar: () => void;
}) {
  const repo = useRepositorio();
  const servico = useServicoDeConta();
  const [etapa, setEtapa] = useState<Etapa>(() =>
    copia ? { tipo: 'escolher' } : { tipo: 'frase' },
  );
  const [frase, setFrase] = useState('');
  const [escolha, setEscolha] = useState<Escolha | null>(null);
  const [nomeEspaco, setNomeEspaco] = useState(`Cópia da nuvem de ${data}`);
  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  const executar = async (fn: () => Promise<void>) => {
    setFalha(null);
    setOcupado(true);
    try {
      await fn();
    } catch (excecao) {
      setFalha(mensagemDe(excecao));
    } finally {
      setOcupado(false);
    }
  };

  const abrir = (e: SubmitEvent) => {
    e.preventDefault();
    void executar(async () => {
      const pacote = await abrirCopiaDaNuvem(servico, nome, frase);
      setFrase('');
      if (etapa.tipo === 'frase' && etapa.escolha === 'usar') {
        setEtapa({ tipo: 'previa', pacote, previa: await preverUsoDaCopia(repo, pacote) });
        return;
      }
      if (etapa.tipo === 'frase' && etapa.escolha === 'separar') {
        const { espaco } = await separarCopiaDaNuvem(
          repo,
          pacote,
          nomeEspaco.trim() || `Cópia da nuvem de ${data}`,
        );
        setEtapa({
          tipo: 'feito',
          texto: `Cópia aberta no espaço separado "${espaco.nome}". Para juntar com o que está aqui, use Mesclar em "Espaços separados".`,
        });
        return;
      }
      setEtapa({ tipo: 'escolher', pacote });
    });
  };

  const continuar = () => {
    if (etapa.tipo !== 'escolher' || escolha === null) return;
    void executar(async () => {
      if (escolha === 'manter') {
        setEtapa({
          tipo: 'feito',
          texto: 'Pronto: nada foi alterado neste aparelho. A cópia continua guardada na nuvem.',
        });
        return;
      }
      if (escolha === 'separar') {
        if (!etapa.pacote) {
          setEtapa({ tipo: 'frase', escolha });
          return;
        }
        const { espaco } = await separarCopiaDaNuvem(
          repo,
          etapa.pacote,
          nomeEspaco.trim() || `Cópia da nuvem de ${data}`,
        );
        setEtapa({
          tipo: 'feito',
          texto: `Cópia aberta no espaço separado "${espaco.nome}". Para juntar com o que está aqui, use Mesclar em "Espaços separados".`,
        });
        return;
      }
      const pacote = etapa.pacote;
      if (!pacote) {
        setEtapa({ tipo: 'frase', escolha });
        return;
      }
      setEtapa({ tipo: 'previa', pacote, previa: await preverUsoDaCopia(repo, pacote) });
    });
  };

  const aplicar = (resolucoes: Resolucoes) => {
    if (etapa.tipo !== 'previa') return;
    void executar(async () => {
      const r = await usarCopiaDaNuvem(repo, etapa.pacote, etapa.previa, resolucoes);
      if (r.identidadeMudou) {
        recarregar();
        return;
      }
      setEtapa({
        tipo: 'feito',
        texto: 'Cópia da nuvem aplicada. Se precisar voltar, desfaça em "Importações".',
      });
    });
  };

  return (
    <section aria-labelledby="t-nuvem-restaurar">
      <h3 id="t-nuvem-restaurar">Restaurar a cópia de {data}</h3>

      {etapa.tipo === 'frase' && (
        <form onSubmit={abrir}>
          <div className="campo">
            <label htmlFor="nuvem-frase-restaurar">Frase desta cópia</label>
            <input
              id="nuvem-frase-restaurar"
              type="password"
              autoComplete="current-password"
              value={frase}
              onChange={(ev) => {
                setFrase(ev.target.value);
              }}
            />
          </div>
          <div className="linha-acoes">
            <button type="submit" className="principal" disabled={ocupado || frase === ''}>
              {ocupado ? 'Baixando e abrindo…' : 'Abrir cópia'}
            </button>
            <button type="button" onClick={aoFechar} disabled={ocupado}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {etapa.tipo === 'escolher' && (
        <>
          <p>
            {etapa.pacote
              ? `A frase abriu a cópia: ${totalDeRegistros(etapa.pacote)} registros, guardados em ${data}. Nada mudou neste aparelho até você escolher.`
              : `Há uma cópia guardada na nuvem de ${data}. Nada mudou neste aparelho até você escolher.`}
          </p>
          <fieldset>
            <legend>O que fazer com esta cópia</legend>
            {ESCOLHAS.map((o) => (
              <label key={o.escolha} className="opcao">
                <input
                  type="radio"
                  name="nuvem-escolha"
                  checked={escolha === o.escolha}
                  onChange={() => {
                    setEscolha(o.escolha);
                  }}
                />
                <span>
                  <strong>{o.nome}</strong>
                  <br />
                  <span className="dica">{o.descricao}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {escolha === 'separar' && (
            <div className="campo">
              <label htmlFor="nuvem-espaco">Nome do espaço</label>
              <input
                id="nuvem-espaco"
                type="text"
                maxLength={120}
                value={nomeEspaco}
                onChange={(ev) => {
                  setNomeEspaco(ev.target.value);
                }}
              />
            </div>
          )}
          <div className="linha-acoes">
            <button
              type="button"
              className="principal"
              disabled={ocupado || escolha === null}
              onClick={continuar}
            >
              {ocupado ? 'Calculando…' : 'Continuar'}
            </button>
            <button type="button" onClick={aoFechar} disabled={ocupado}>
              Cancelar
            </button>
          </div>
        </>
      )}

      {etapa.tipo === 'previa' && (
        <PreviaImportacao
          previa={etapa.previa}
          confirmando={ocupado}
          rotuloConfirmar="Usar a cópia da nuvem"
          aoConfirmar={aplicar}
          aoVoltar={() => {
            setEtapa({ tipo: 'escolher', pacote: etapa.pacote });
          }}
        />
      )}

      {etapa.tipo === 'feito' && (
        <>
          <p role="status" className="sucesso">
            {etapa.texto}
          </p>
          <div className="linha-acoes">
            <button type="button" onClick={aoFechar}>
              Fechar
            </button>
          </div>
        </>
      )}

      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
    </section>
  );
}
