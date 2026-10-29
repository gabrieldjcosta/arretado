// Sessão de questões: Acertei / Errei contam na hora; "Errei" pede só a frase correta (D25) e grava o
// Erro já ligado a esta Sessão. Tudo cabe no cartão da Sessão, sem sair do estudo.
import { useEffect, useRef, useState } from 'react';
import type { Sessao } from '../../core/modelo';
import { registrarErro } from '../../dominios/recall/servico';
import { registrarQuestao } from '../../dominios/sessao/servico';
import { useRepositorio } from '../dados/contexto';
import { ROTULO_DA_AREA } from '../textos';
import './estilos-sessao.css';

const contagem = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

export function QuestoesDaSessao({ sessao }: { sessao: Sessao }) {
  const repo = useRepositorio();
  const campo = useRef<HTMLTextAreaElement>(null);
  const errei = useRef<HTMLButtonElement>(null);
  const [errando, setErrando] = useState(false);
  const [frase, setFrase] = useState('');
  const [aviso, setAviso] = useState('');
  const feitas = sessao.questoesFeitas ?? 0;
  const acertos = sessao.questoesAcertadas ?? 0;
  const pontoId = sessao.alvo?.tipo === 'ponto' ? sessao.alvo.id : undefined;
  const falhou = () => {
    setAviso('Não foi possível salvar. Tente de novo; nada foi perdido.');
  };
  const acertei = () => {
    setAviso('');
    registrarQuestao(repo, sessao.id, true).catch(falhou);
  };
  // O formulário sai da tela com o foco dentro dele: depois de fechado (também por promessa, fora de
  // um clique), o foco volta ao botão que o abriu, não ao começo da página.
  const jaAbriu = useRef(false);
  useEffect(() => {
    if (errando) jaAbriu.current = true;
    else if (jaAbriu.current) errei.current?.focus();
  }, [errando]);
  const abrirErrei = () => {
    setAviso('');
    setErrando(true);
    // O campo só existe depois da renderização.
    setTimeout(() => campo.current?.focus(), 0);
  };
  const fechar = () => {
    setFrase('');
    setErrando(false);
  };
  const salvarErro = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!frase.trim()) return;
    registrarErro(repo, {
      fraseCorreta: frase,
      sessaoId: sessao.id,
      ...(pontoId ? { pontoId } : {}),
    })
      .then(() => registrarQuestao(repo, sessao.id, false))
      .then(() => {
        fechar();
        setAviso(`Erro guardado. Já está no ${ROTULO_DA_AREA.recall}.`);
      }, falhou);
  };
  const soContar = () => {
    registrarQuestao(repo, sessao.id, false).then(fechar, falhou);
  };
  return (
    <section className="alavanca questoes-sessao" aria-labelledby="questoes-sessao-titulo">
      <h2 id="questoes-sessao-titulo">Questões</h2>
      <p className="sessao-detalhe" role="status">
        {feitas === 0
          ? 'Nenhuma questão contada ainda.'
          : `${contagem(feitas, 'feita', 'feitas')}, ${contagem(acertos, 'acerto', 'acertos')}.`}
      </p>
      {errando ? (
        <form onSubmit={salvarErro} className="questoes-sessao__erro">
          <div className="campo">
            <label htmlFor="questao-frase">Frase correta</label>
            <textarea
              ref={campo}
              id="questao-frase"
              rows={3}
              maxLength={2000}
              value={frase}
              onChange={(e) => {
                setFrase(e.target.value);
              }}
              aria-describedby="questao-frase-dica"
            />
            <p id="questao-frase-dica" className="dica">
              Só isso é obrigatório. Os detalhes você completa depois, no {ROTULO_DA_AREA.recall}.
            </p>
          </div>
          <div className="linha-acoes">
            <button type="submit" className="principal" disabled={!frase.trim()}>
              Guardar erro
            </button>
            <button type="button" onClick={soContar}>
              Só contar
            </button>
            <button type="button" className="botao-texto" onClick={fechar}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="linha-acoes">
          <button type="button" onClick={acertei}>
            Acertei
          </button>
          <button ref={errei} type="button" onClick={abrirErrei}>
            Errei
          </button>
        </div>
      )}
      {aviso && (
        <p role="status" className="dica">
          {aviso}
        </p>
      )}
    </section>
  );
}
