import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  migrarParaConta,
  preverMigracao,
  type EtapaMigracao,
  type PreviaMigracao,
} from '../../../core/pacote/migrar-para-conta';
import { NOME_BANCO_PRINCIPAL, RegistroDeContas, Repositorio } from '../../../core/persistencia';
import type { PacoteGerado } from '../../../core/pacote';
import { reidratadorDoAcervo } from '../../../dominios/acervo/adesao';
import { useFonteAcervo } from '../../dados/fonteAcervoContexto';
import { baixar } from '../dados/rotulos';
import { recarregarEm } from '../recarregar';
import './estilos-migracao.css';

function formatarMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb === 0) return '0 MB';
  if (mb < 0.1) return '< 0,1 MB';
  const formatado = Number.isInteger(mb) ? String(mb) : mb.toFixed(1).replace('.', ',');
  return `${formatado} MB`;
}

const ROTULOS_ETAPA: Record<EtapaMigracao, string> = {
  backup: 'guardando uma cópia',
  copia: 'copiando',
  verificacao: 'conferindo',
  ativacao: 'pronto',
};

const ETAPAS_ORDENADAS: EtapaMigracao[] = ['backup', 'copia', 'verificacao', 'ativacao'];

type EstadoTela =
  'carregando' | 'previa' | 'andamento' | 'resultado-concluido' | 'resultado-falhou' | 'sem-conta';

export interface MigracaoProps {
  origem?: Repositorio;
  abrirOrigem?: () => Promise<Repositorio>;
  /** Padrão: recarrega no Hoje para abrir o banco da conta, agora ativa (T26). */
  aoConcluir?: () => void;
  aoAgoraNao?: () => void;
  registro?: RegistroDeContas;
  uid?: string;
  baixarBackup?: (pacote: PacoteGerado) => Promise<void>;
}

export function Migracao({
  origem: origemInformada,
  abrirOrigem,
  aoConcluir = () => {
    recarregarEm('#/');
  },
  aoAgoraNao: callbackAgoraNao,
  registro: registroInformado,
  uid: uidInformado,
  baixarBackup,
}: MigracaoProps) {
  const navigate = useNavigate();
  const fonteAcervo = useFonteAcervo();
  const [registro] = useState(() => registroInformado ?? new RegistroDeContas());
  const [repoOrigem, setRepoOrigem] = useState<Repositorio | null>(origemInformada ?? null);
  const [uidDestino, setUidDestino] = useState<string | null>(uidInformado ?? null);
  const [previa, setPrevia] = useState<PreviaMigracao | null>(null);
  const [estado, setEstado] = useState<EstadoTela>('carregando');
  const [etapaAtual, setEtapaAtual] = useState<EtapaMigracao>('backup');
  const [motivoFalha, setMotivoFalha] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const foiCancelado = () => cancelado;
    let repoCriado: Repositorio | null = null;

    void (async () => {
      let uid = uidInformado;
      if (!uid) {
        const ativa = await registro.contaAtiva();
        uid = ativa?.uid;
      }
      if (foiCancelado()) return;
      if (!uid) {
        setEstado('sem-conta');
        return;
      }
      setUidDestino(uid);

      let repo = origemInformada;
      if (!repo) {
        repo = abrirOrigem
          ? await abrirOrigem()
          : await Repositorio.abrir({ nomeBanco: NOME_BANCO_PRINCIPAL });
        repoCriado = repo;
      }
      if (foiCancelado()) {
        repoCriado?.fechar();
        return;
      }
      setRepoOrigem(repo);

      try {
        const dadosPrevia = await preverMigracao(repo);
        if (foiCancelado()) return;
        setPrevia(dadosPrevia);
        setEstado('previa');
      } catch (e) {
        if (foiCancelado()) return;
        setMotivoFalha(e instanceof Error ? e.message : 'Problema ao calcular prévia.');
        setEstado('resultado-falhou');
      }
    })();

    return () => {
      cancelado = true;
      if (repoCriado) {
        repoCriado.fechar();
      }
    };
  }, [abrirOrigem, origemInformada, registro, uidInformado]);

  const agoraNao = () => {
    if (callbackAgoraNao) {
      callbackAgoraNao();
    } else {
      void navigate('/conta');
    }
  };

  const iniciarMigracao = async () => {
    if (!repoOrigem || !uidDestino) return;
    setEstado('andamento');
    setEtapaAtual('backup');
    setMotivoFalha(null);

    try {
      const resultado = await migrarParaConta(repoOrigem, {
        uid: uidDestino,
        baixarBackup:
          baixarBackup ??
          ((pacote) => {
            baixar(pacote.bytes, pacote.nomeArquivo);
            return Promise.resolve();
          }),
        aoAvancar: (etapa) => {
          setEtapaAtual(etapa);
        },
        registro,
        // Log com árvore do acervo por referência (AL): a verificação reidrata pela fonte.
        prepararReidratacao: (log) => reidratadorDoAcervo(fonteAcervo, log),
      });

      if (resultado.tipo === 'concluida') {
        setEstado('resultado-concluido');
      } else {
        setMotivoFalha(resultado.motivo);
        setEstado('resultado-falhou');
      }
    } catch (e) {
      setMotivoFalha(e instanceof Error ? e.message : 'Problema inesperado na migração.');
      setEstado('resultado-falhou');
    }
  };

  const tentarDeNovo = () => {
    void iniciarMigracao();
  };

  if (estado === 'sem-conta') {
    return (
      <div className="migracao-tela">
        <h1>Migrar para a conta</h1>
        <p className="aviso" role="alert">
          Nenhuma conta ativa neste aparelho para receber os dados.
        </p>
        <p>
          <Link to="/conta/entrar" className="botao principal">
            Entrar com uma conta
          </Link>
        </p>
      </div>
    );
  }

  if (estado === 'carregando' || (estado === 'previa' && !previa)) {
    return (
      <div className="migracao-tela">
        <h1>Migrar para a conta</h1>
        <p className="dica" role="status">
          Calculando dados para cópia…
        </p>
      </div>
    );
  }

  if (estado === 'andamento') {
    const indiceAtual = ETAPAS_ORDENADAS.indexOf(etapaAtual);
    return (
      <div className="migracao-tela">
        <h1>Migrando para a conta</h1>
        <div className="migracao-andamento">
          <ol aria-live="polite" role="status" className="migracao-etapas-lista">
            {ETAPAS_ORDENADAS.map((etapa, idx) => {
              const rotulo = ROTULOS_ETAPA[etapa];
              let classe = '';
              if (etapa === etapaAtual) {
                classe = 'atual';
              } else if (idx < indiceAtual) {
                classe = 'passada';
              }
              return (
                <li
                  key={etapa}
                  className={classe}
                  aria-current={etapa === etapaAtual ? 'step' : undefined}
                >
                  {rotulo}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    );
  }

  if (estado === 'resultado-concluido') {
    return (
      <div className="migracao-tela">
        <h1>Migração</h1>
        <div className="migracao-resultado sucesso">
          <h2>Tudo copiado</h2>
          <p>Seus dados de estudo estão disponíveis na sua conta neste aparelho.</p>
          <div className="linha-acoes">
            <Link
              to="/"
              className="botao principal"
              onClick={(e) => {
                // Sem recarga o app seguiria no banco de antes da conta.
                e.preventDefault();
                aoConcluir();
              }}
            >
              Ir para o Hoje
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (estado === 'resultado-falhou') {
    return (
      <div className="migracao-tela">
        <h1>Migração</h1>
        <div className="migracao-resultado falhou">
          <h2>Nada foi alterado. Seus dados continuam como estavam.</h2>
          {motivoFalha && <p className="dica">{motivoFalha}</p>}
          <div className="linha-acoes">
            <button type="button" className="botao principal" onClick={tentarDeNovo}>
              Tentar de novo
            </button>
            <button type="button" className="botao discreto" onClick={agoraNao}>
              Agora não
            </button>
          </div>
        </div>
      </div>
    );
  }

  // estado === 'previa'
  return (
    <div className="migracao-tela">
      <h1>Migrar para a conta</h1>
      <section className="cartao-bloco" aria-labelledby="t-previa-migracao">
        <h2 id="t-previa-migracao">Prévia da cópia</h2>
        <p>
          {previa?.registros} registros em {previa?.colecoes} coleções,{' '}
          {formatarMb(previa?.bytes ?? 0)} serão copiados para a sua conta neste aparelho. Nada sai
          para a internet agora.
        </p>
        <p className="dica">Nada obrigatório.</p>
        <div className="linha-acoes">
          <button type="button" className="botao principal" onClick={() => void iniciarMigracao()}>
            Copiar para a conta
          </button>
          <button type="button" className="botao discreto" onClick={agoraNao}>
            Agora não
          </button>
        </div>
      </section>
    </div>
  );
}
