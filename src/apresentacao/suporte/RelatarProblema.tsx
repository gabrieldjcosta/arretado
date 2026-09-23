import { useCallback, useState, type SubmitEvent } from 'react';
import { useLocation } from 'react-router';
import {
  LIMITE_DESCRICAO,
  podeRelatarHoje,
  registrarRelato,
  RelatoRecusado,
} from '../../suporte/relatos';
import { Dialogo } from '../componentes/Dialogo';
import { useDados, useRepositorio } from '../dados/contexto';

/** "!" Relatar problema (D23). */
export function RelatarProblema({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const repo = useRepositorio();
  const { pathname } = useLocation();
  const [descricao, setDescricao] = useState('');
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'falha'; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const pode = useDados(useCallback((r) => podeRelatarHoje(r), []));

  const fechar = () => {
    setDescricao('');
    setMensagem(null);
    aoFechar();
  };

  const enviar = async (e: SubmitEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await registrarRelato(repo, { descricao, tela: pathname });
      setDescricao('');
      setMensagem({
        tipo: 'ok',
        texto:
          'Relato guardado neste aparelho, aguardando envio. Ele será enviado quando a sincronização existir.',
      });
    } catch (erro) {
      setMensagem({
        tipo: 'falha',
        texto: erro instanceof RelatoRecusado ? erro.message : 'Não foi possível guardar o relato.',
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialogo aberto={aberto} aoFechar={fechar} titulo="Relatar problema">
      {mensagem?.tipo === 'ok' ? (
        <p role="status" className="sucesso">
          {mensagem.texto}
        </p>
      ) : pode.dados === false ? (
        <p>Você já relatou um problema hoje. Amanhã é possível relatar outro.</p>
      ) : (
        <form onSubmit={(e) => void enviar(e)}>
          <p className="dica">
            Vai junto só a tela ({pathname}), a versão do app e o aparelho — nunca conteúdo de
            estudo.
          </p>
          <div className="campo">
            <label htmlFor="relato-descricao">O que aconteceu?</label>
            <textarea
              id="relato-descricao"
              required
              maxLength={LIMITE_DESCRICAO}
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
              }}
            />
          </div>
          {mensagem?.tipo === 'falha' && (
            <p role="alert" className="aviso">
              {mensagem.texto}
            </p>
          )}
          <div className="linha-acoes">
            <button
              type="submit"
              className="principal"
              disabled={salvando || descricao.trim() === ''}
            >
              Guardar relato
            </button>
            <button type="button" onClick={fechar}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {mensagem?.tipo === 'ok' && (
        <div className="linha-acoes">
          <button type="button" onClick={fechar}>
            Fechar
          </button>
        </div>
      )}
    </Dialogo>
  );
}
