import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  lerUltimoBackup,
  RegistroDeContas,
  type ContaDoAparelho,
} from '../../../core/persistencia';
import { sairDaConta, trocarDeConta } from '../../../core/pacote';
import { Dialogo } from '../../componentes/Dialogo';
import { useRepositorio } from '../../dados/contexto';
import { ConfirmarCopia } from '../dados/ConfirmarCopia';
import { podeApagarComCopia } from '../dados/recomecar';
import { useServicoDeConta } from '../entrar/ContextoConta';
import './estilos-sair.css';

/** Depois de sair, trocar ou excluir o app recarrega para abrir o banco certo (T26). */
const recarregarEmConta = () => {
  window.location.hash = '#/conta';
  window.location.reload();
};

type Pedido = 'pedido' | 'apagando' | 'falhou';

interface Estado {
  ativa: ContaDoAparelho | null;
  outras: ContaDoAparelho[];
  ultimaCopia: string | null;
}

/**
 * Conta › Conta neste aparelho (só com `VITE_CONTA=1`): quem está ativa, trocar, sair e excluir.
 * Sair não exige rede; excluir exige (e nada é apagado se o servidor não responder).
 */
export function ContaDoAparelhoSecao({
  registro: registroDado,
  recarregar = recarregarEmConta,
}: {
  registro?: RegistroDeContas;
  recarregar?: () => void;
}) {
  const repo = useRepositorio();
  const servico = useServicoDeConta();
  const [registro] = useState(() => registroDado ?? new RegistroDeContas());
  const [estado, setEstado] = useState<Estado | null>(null);
  const [dialogo, setDialogo] = useState<'sair' | 'excluir' | null>(null);
  const [apagarAqui, setApagarAqui] = useState(false);
  const [exportei, setExportei] = useState(false);
  const [digitado, setDigitado] = useState('');
  const [fase, setFase] = useState<Pedido>('pedido');

  useEffect(() => {
    const vivo = { ativo: true };
    void (async () => {
      const [ativa, todas, ultimaCopia] = await Promise.all([
        registro.contaAtiva(),
        registro.listar(),
        lerUltimoBackup(repo),
      ]);
      if (vivo.ativo) {
        setEstado({ ativa, outras: todas.filter((c) => c.uid !== ativa?.uid), ultimaCopia });
      }
    })();
    return () => {
      vivo.ativo = false;
    };
  }, [registro, repo]);

  if (!estado) return null;

  const fechar = () => {
    setDialogo(null);
    setApagarAqui(false);
    setExportei(false);
    setDigitado('');
    setFase('pedido');
  };

  const trocar = (uid: string) => {
    void trocarDeConta(uid, { registro }).then(recarregar);
  };

  // "Apagar daqui" só com cópia recente ou depois de confirmar que a pessoa exportou.
  const podeApagar = podeApagarComCopia(estado.ultimaCopia, exportei);

  const sair = async () => {
    setFase('apagando');
    try {
      await sairDaConta(repo, { registro, apagarDados: apagarAqui && podeApagar });
      await servico.sair().catch(() => undefined);
      recarregar();
    } catch {
      setFase('falhou');
    }
  };

  const excluir = async () => {
    setFase('apagando');
    try {
      // Primeiro o servidor: sem resposta, nada é apagado em lugar nenhum.
      await servico.excluirConta();
    } catch {
      setFase('falhou');
      return;
    }
    try {
      await sairDaConta(repo, { registro, apagarDados: true });
    } finally {
      recarregar();
    }
  };

  return (
    <section className="conta-aparelho" aria-labelledby="t-conta-aparelho">
      <h2 id="t-conta-aparelho">Conta neste aparelho</h2>
      {estado.ativa ? (
        <>
          <p>
            Você está na conta <strong>{estado.ativa.email ?? 'sem e-mail conhecido'}</strong>. Os
            dados de estudo ficam neste aparelho.
          </p>
          <div className="linha-acoes">
            <button
              type="button"
              className="botao"
              onClick={() => {
                setDialogo('sair');
              }}
            >
              Sair…
            </button>
            <button
              type="button"
              className="botao perigoso"
              onClick={() => {
                setDialogo('excluir');
              }}
            >
              Excluir minha conta…
            </button>
          </div>
        </>
      ) : (
        <p>
          Você está usando o Arretado sem conta.{' '}
          <Link to="/conta/entrar">Entrar com uma conta</Link>
        </p>
      )}

      {estado.outras.length > 0 && (
        <>
          <h3>Outras contas neste aparelho</h3>
          <ul className="lista-simples">
            {estado.outras.map((c) => (
              <li key={c.uid}>
                <span>{c.email ?? 'conta sem e-mail conhecido'}</span>
                <button
                  type="button"
                  className="botao discreto"
                  onClick={() => {
                    trocar(c.uid);
                  }}
                >
                  Usar esta conta
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialogo aberto={dialogo === 'sair'} aoFechar={fechar} titulo="Sair da conta?">
        <label className="opcao">
          <input
            type="radio"
            name="dados-ao-sair"
            checked={!apagarAqui}
            onChange={() => {
              setApagarAqui(false);
            }}
          />
          Manter os meus dados neste aparelho
        </label>
        <label className="opcao">
          <input
            type="radio"
            name="dados-ao-sair"
            checked={apagarAqui}
            onChange={() => {
              setApagarAqui(true);
            }}
          />
          Apagar daqui (aparelho emprestado)
        </label>
        {apagarAqui && (
          <ConfirmarCopia
            ultimaCopia={estado.ultimaCopia}
            exportei={exportei}
            aoMudar={setExportei}
          />
        )}
        {fase === 'falhou' && (
          <p role="alert" className="aviso falha">
            Não foi possível sair agora. Nada foi apagado.
          </p>
        )}
        <div className="linha-acoes">
          <button
            type="button"
            className="botao principal"
            disabled={fase === 'apagando' || (apagarAqui && !podeApagar)}
            onClick={() => {
              void sair();
            }}
          >
            {fase === 'apagando' ? 'Saindo…' : apagarAqui ? 'Apagar daqui e sair' : 'Sair'}
          </button>
          <button type="button" className="botao discreto" onClick={fechar}>
            Cancelar
          </button>
        </div>
      </Dialogo>

      <Dialogo aberto={dialogo === 'excluir'} aoFechar={fechar} titulo="Excluir a minha conta?">
        <p>
          A exclusão é imediata e definitiva: apaga a conta, o perfil e as cópias na nuvem, e também
          os dados deste aparelho. Não há como desfazer. Se quiser guardar uma cópia,{' '}
          <Link to="/conta/dados">exporte antes</Link>.
        </p>
        <label htmlFor="digitar-excluir">Digite &quot;excluir&quot; para confirmar</label>
        <input
          id="digitar-excluir"
          value={digitado}
          autoComplete="off"
          onChange={(e) => {
            setDigitado(e.target.value);
          }}
        />
        {fase === 'apagando' && (
          <p role="status" className="dica">
            Apagando a conta…
          </p>
        )}
        {fase === 'falhou' && (
          <p role="alert" className="aviso falha">
            Não foi possível excluir agora. Nada foi apagado; tente de novo com internet.
          </p>
        )}
        <div className="linha-acoes">
          <button
            type="button"
            className="botao perigoso"
            disabled={digitado.trim().toLowerCase() !== 'excluir' || fase === 'apagando'}
            onClick={() => {
              void excluir();
            }}
          >
            Excluir para sempre
          </button>
          <button type="button" className="botao discreto" onClick={fechar}>
            Cancelar
          </button>
        </div>
      </Dialogo>
    </section>
  );
}
