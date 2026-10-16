import { useEffect, useState } from 'react';
import {
  apagarCopiaAnterior,
  copiaAnterior,
  type CopiaAnterior,
} from '../../../core/pacote/migrar-para-conta';
import { exportarPacote } from '../../../core/pacote';
import { RegistroDeContas, Repositorio } from '../../../core/persistencia';
import { contasHabilitadas } from '../../../integracoes/conta';
import { Dialogo } from '../../componentes/Dialogo';
import { baixar } from './rotulos';

function formatarDataDaCopia(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CopiaAnteriorSecao({
  registro: registroInformado,
  abrirCopia,
}: {
  registro?: RegistroDeContas;
  abrirCopia?: (nomeBanco: string) => Promise<Repositorio>;
} = {}) {
  const [registro] = useState(() => registroInformado ?? new RegistroDeContas());
  const [copia, setCopia] = useState<CopiaAnterior | null>(null);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'falha'; texto: string } | null>(null);

  useEffect(() => {
    if (!contasHabilitadas()) return;
    let cancelado = false;
    const foiCancelado = () => cancelado;
    void (async () => {
      try {
        const c = await copiaAnterior(registro);
        if (!foiCancelado()) setCopia(c);
      } catch {
        if (!foiCancelado()) setCopia(null);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [registro]);

  if (!contasHabilitadas() || (!copia && !mensagem)) return null;

  const exportar = async () => {
    if (!copia) return;
    setOcupado(true);
    setMensagem(null);
    try {
      const repo = abrirCopia
        ? await abrirCopia(copia.nomeBanco)
        : await Repositorio.abrir({ nomeBanco: copia.nomeBanco });
      try {
        const pacote = await exportarPacote(repo, {
          escopo: { tipo: 'integral' },
          incluirAnexos: true,
        });
        baixar(pacote.bytes, pacote.nomeArquivo);
        setMensagem({
          tipo: 'ok',
          texto: `Pacote gerado: ${pacote.nomeArquivo}. Guarde-o fora deste aparelho.`,
        });
      } finally {
        repo.fechar();
      }
    } catch {
      setMensagem({
        tipo: 'falha',
        texto: 'Não foi possível exportar a cópia anterior. Nada foi alterado.',
      });
    } finally {
      setOcupado(false);
    }
  };

  const apagar = async () => {
    setOcupado(true);
    setMensagem(null);
    try {
      await apagarCopiaAnterior(registro);
      setCopia(null);
      setConfirmandoApagar(false);
      setMensagem({
        tipo: 'ok',
        texto: 'Cópia anterior apagada deste aparelho.',
      });
    } catch {
      setMensagem({
        tipo: 'falha',
        texto: 'Não foi possível apagar a cópia anterior. Tente de novo.',
      });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section className="cartao-bloco copia-anterior-secao" aria-labelledby="t-copia-anterior">
      {copia && (
        <h2 id="t-copia-anterior">
          Cópia de antes da conta ({formatarDataDaCopia(copia.migradoEm)})
        </h2>
      )}
      {mensagem && (
        <p
          role={mensagem.tipo === 'ok' ? 'status' : 'alert'}
          className={mensagem.tipo === 'ok' ? 'sucesso' : 'aviso'}
        >
          {mensagem.texto}
        </p>
      )}
      {copia && (
        <>
          <p>
            Esta cópia nunca é apagada sozinha. Dá para apagar depois de uns 30 dias com a conta ok.
          </p>
          <div className="linha-acoes">
            <button
              type="button"
              className="botao"
              disabled={ocupado}
              onClick={() => void exportar()}
            >
              Exportar
            </button>
            <button
              type="button"
              className="botao perigoso"
              disabled={ocupado}
              onClick={() => {
                setConfirmandoApagar(true);
              }}
            >
              Apagar
            </button>
          </div>
        </>
      )}

      <Dialogo
        aberto={confirmandoApagar}
        aoFechar={() => {
          setConfirmandoApagar(false);
        }}
        titulo="Apagar cópia de antes da conta?"
      >
        <p>
          A cópia de antes da migração será apagada deste aparelho. Os dados da sua conta continuam
          intactos. Não há como desfazer.
        </p>
        <div className="linha-acoes">
          <button
            type="button"
            className="botao perigoso"
            disabled={ocupado}
            onClick={() => void apagar()}
          >
            Apagar cópia
          </button>
          <button
            type="button"
            className="botao discreto"
            onClick={() => {
              setConfirmandoApagar(false);
            }}
          >
            Cancelar
          </button>
        </div>
      </Dialogo>
    </section>
  );
}
