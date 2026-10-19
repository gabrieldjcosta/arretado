import { useEffect, useState } from 'react';
import { lerUltimoBackup } from '../../../core/persistencia';
import { Dialogo } from '../../componentes/Dialogo';
import { useRepositorio } from '../../dados/contexto';
import { ConfirmarCopia } from './ConfirmarCopia';
import { apagarTudoERecomecar, podeApagarComCopia } from './recomecar';

/**
 * Apagar tudo e recomeçar (direito do titular, D18): confirmação só para o destrutivo e, como no
 * "Apagar daqui" da conta, só com cópia recente ou exportação confirmada.
 */
export function ApagarTudo() {
  const repo = useRepositorio();
  const [aberto, setAberto] = useState(false);
  const [entendi, setEntendi] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [ultimaCopia, setUltimaCopia] = useState<string | null | undefined>(undefined);
  const [exportei, setExportei] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    void lerUltimoBackup(repo).then((c) => {
      if (vivo) setUltimaCopia(c);
    });
    return () => {
      vivo = false;
    };
  }, [aberto, repo]);

  const fechar = () => {
    setAberto(false);
    setEntendi(false);
    setExportei(false);
  };

  return (
    <section className="cartao-bloco" aria-labelledby="t-apagar">
      <h2 id="t-apagar">Apagar tudo e recomeçar</h2>
      <p>
        Apaga todos os dados do Arretado neste aparelho, inclusive pontos de restauração, e volta ao
        começo. Pede uma cópia recente ou a confirmação de que você exportou.
      </p>
      <button
        type="button"
        onClick={() => {
          setAberto(true);
        }}
      >
        Apagar tudo…
      </button>
      <Dialogo aberto={aberto} aoFechar={fechar} titulo="Apagar todos os dados deste aparelho?">
        <p>
          Não há como desfazer. Se quiser guardar uma cópia, feche esta janela e use
          &quot;Exportar&quot; antes.
        </p>
        {ultimaCopia !== undefined && (
          <ConfirmarCopia ultimaCopia={ultimaCopia} exportei={exportei} aoMudar={setExportei} />
        )}
        {falhou && (
          <div role="alert" className="aviso falha">
            <p>
              <strong>Não foi possível apagar tudo.</strong> Feche as outras abas do Arretado e
              recarregue a página para tentar de novo.
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
            >
              Recarregar
            </button>
          </div>
        )}
        <label className="opcao">
          <input
            type="checkbox"
            checked={entendi}
            onChange={(e) => {
              setEntendi(e.target.checked);
            }}
          />
          Entendo que os dados deste aparelho serão apagados para sempre.
        </label>
        <div className="linha-acoes">
          <button
            type="button"
            className="perigoso"
            disabled={
              !entendi ||
              ocupado ||
              falhou ||
              ultimaCopia === undefined ||
              !podeApagarComCopia(ultimaCopia, exportei)
            }
            onClick={() => {
              setOcupado(true);
              apagarTudoERecomecar(repo, { exportei }).then(
                () => {
                  window.location.reload();
                },
                () => {
                  setFalhou(true);
                },
              );
            }}
          >
            {ocupado ? 'Apagando…' : 'Apagar tudo'}
          </button>
          <button type="button" onClick={fechar} disabled={ocupado && !falhou}>
            Cancelar
          </button>
        </div>
      </Dialogo>
    </section>
  );
}
