import { useEffect, useRef } from 'react';
import { contasHabilitadas } from '../../../integracoes/conta';
import type { ControleDoZe } from '../../componentes/ze/controle';
import { Ze } from '../../componentes/ze/Ze';
import { BotaoGoogle } from './BotaoGoogle';
import { COMECAR } from './passos';

interface Props {
  /** O título da tela é também o nome do diálogo (a Chegada o aponta em `aria-labelledby`). */
  idTitulo: string;
  /** Entrar com o Google: o link leva à tela Entrar, e a folha sai do caminho. */
  aoEntrar: () => void;
  /** Experimentar sem conta: a pessoa já está no Hoje, então só fecha. */
  aoSemConta: () => void;
}

/**
 * O Começar (D-D10): "Vamo começar?" com o Zé contente e duas saídas. "Entrar com o Google" (com a nota de
 * que por ora só e-mails convidados entram) e "Experimentar sem conta e salvar seus dados manualmente",
 * que fecha a folha: o Hoje vazio já oferece "Escolher meu concurso". Nada aqui pergunta nem grava coisa
 * nenhuma. Sem a conta ligada (a compilação de teste), a única saída é a segunda, como botão principal.
 * Só se chega aqui pelo passeio da primeira vez: refeito, o último passo diz "Concluir" e fecha.
 */
export function TelaComecar({ idTitulo, aoEntrar, aoSemConta }: Props) {
  const titulo = useRef<HTMLHeadingElement>(null);
  const ze = useRef<ControleDoZe>(null);
  const contas = contasHabilitadas();

  // O Zé chega neutro e fica contente: os olhos viram arcos (200 ms; na hora fora do movimento normal).
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true });
    ze.current?.humor('contente');
  }, []);

  return (
    <div className="chegada-tela" data-tela="comecar">
      <div className="chegada-corpo">
        <div className="chegada-ze" data-fim="">
          <Ze ref={ze} humor="neutro" tamanho="grande" />
        </div>
        <div className="chegada-fim-texto">
          <h2 id={idTitulo} ref={titulo} tabIndex={-1} className="chegada-titulo">
            {COMECAR.titulo}
          </h2>
        </div>
      </div>
      <div className="chegada-rodape">
        {contas && (
          <>
            <BotaoGoogle aoEscolher={aoEntrar} />
            <p className="chegada-nota">{COMECAR.nota}</p>
          </>
        )}
        <button
          type="button"
          className={contas ? 'botao botao-texto' : 'botao principal'}
          onClick={aoSemConta}
        >
          {COMECAR.semConta}
        </button>
      </div>
    </div>
  );
}
