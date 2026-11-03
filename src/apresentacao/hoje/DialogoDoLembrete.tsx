// O "Lembrete" do "+" (escolha do Gabriel, 03/11/2026): a mesma nota do "Para lembrar" do Hoje
// (`Preferencias.lembrete`, uma só), num diálogo que abre de qualquer tela com o "+". O nome é dele e o
// subtítulo diz o que o app não faz: sem data, hora nem aviso, então nada promete notificação.
import { useCallback, useId } from 'react';
import { obterPreferencias } from '../../core/preferencias';
import { Dialogo } from '../componentes/Dialogo';
import { useDados } from '../dados/contexto';
import { CampoDoLembrete, NotasDasSessoes } from './ParaLembrar';
import './estilos-hoje.css';

function Conteudo({
  idDoTitulo,
  idDaDica,
  aoFechar,
}: {
  idDoTitulo: string;
  idDaDica: string;
  aoFechar: () => void;
}) {
  const { dados } = useDados(useCallback((r) => obterPreferencias(r), []));
  return (
    <>
      <h2 id={idDoTitulo}>Lembrete</h2>
      <p id={idDaDica} className="dica">
        Uma nota rápida sobre o que fazer fora do app. Sem hora nem aviso.
      </p>
      <div className="para-lembrar">
        <NotasDasSessoes />
        {dados ? (
          <CampoDoLembrete inicial={dados.lembrete ?? ''} idDoRotulo={idDoTitulo} foco />
        ) : null}
      </div>
      <div className="linha-acoes">
        <button type="button" onClick={aoFechar}>
          Fechar
        </button>
      </div>
    </>
  );
}

/** O que abre quando se toca em "Lembrete" no "+". O conteúdo só monta com o diálogo aberto. */
export function DialogoDoLembrete({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const titulo = useId();
  const dica = useId();
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      idDoTitulo={titulo}
      descritoPor={dica}
      classe="dialogo-lembrete"
    >
      <Conteudo idDoTitulo={titulo} idDaDica={dica} aoFechar={aoFechar} />
    </Dialogo>
  );
}
