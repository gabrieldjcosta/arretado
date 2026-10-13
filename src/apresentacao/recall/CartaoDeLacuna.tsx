import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Frase, Intervalo } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import {
  criarCartaoDeLacuna,
  normalizarOcultos,
  textoComLacunas,
} from '../../dominios/recall/servico';
import { Esqueleto, Vazio } from '../componentes/estados';
import { useDados, useRepositorio } from '../dados/contexto';

/** Cartão com lacuna: selecione o trecho da frase, esconda, crie. Oclusão (Frases 2). */
export function CartaoDeLacuna() {
  const { id = '' } = useParams();
  const carregar = useCallback(
    async (repo: Repositorio) => (await repo.colecao('frases').obter(id)) ?? null,
    [id],
  );
  const { dados } = useDados(carregar);
  if (dados === undefined) return <Esqueleto />;
  if (!dados) {
    return <Vazio titulo="Frase não encontrada" acao={<Link to="/recall/frases">Voltar</Link>} />;
  }
  return <Editor key={dados.id} frase={dados} />;
}

function Editor({ frase }: { frase: Frase }) {
  const repo = useRepositorio();
  const navegar = useNavigate();
  const [ocultos, setOcultos] = useState<Intervalo[]>([]);
  const [selecao, setSelecao] = useState<Intervalo | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  // Eventos nativos: o toque, o teclado e o programa mudam a seleção por caminhos diferentes.
  useEffect(() => {
    const el = campo.current;
    if (!el) return;
    const ler = () => {
      const { selectionStart: inicio, selectionEnd: fim } = el;
      setSelecao(fim > inicio ? { inicio, fim } : null);
    };
    const eventos = ['select', 'keyup', 'pointerup'] as const;
    for (const e of eventos) el.addEventListener(e, ler);
    return () => {
      for (const e of eventos) el.removeEventListener(e, ler);
    };
  }, []);

  const esconder = () => {
    if (!selecao) return;
    setOcultos(normalizarOcultos(frase.texto, [...ocultos, selecao]));
    setSelecao(null);
  };

  const criar = async () => {
    try {
      await criarCartaoDeLacuna(repo, frase.id, ocultos);
      void navegar('/recall/cartoes');
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível criar o cartão.');
    }
  };

  return (
    <>
      <h1>Esconder trecho</h1>
      <p className="dica">Selecione o que você quer lembrar e toque em “Esconder seleção”.</p>
      <textarea
        ref={campo}
        readOnly
        aria-label="Texto da frase"
        className="texto-leitura campo-frase"
        rows={5}
        value={frase.texto}
      />
      <div className="linha-acoes">
        <button type="button" disabled={!selecao} onClick={esconder}>
          Esconder seleção
        </button>
        <button
          type="button"
          className="discreto"
          disabled={ocultos.length === 0}
          onClick={() => {
            setOcultos([]);
          }}
        >
          Desfazer tudo
        </button>
      </div>
      <section aria-label="Como vai aparecer" className="cartao-bloco">
        <p className="frase-correta-titulo">Como vai aparecer</p>
        <p className="texto-leitura">{textoComLacunas(frase.texto, ocultos)}</p>
      </section>
      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
      <div className="linha-acoes">
        <button
          type="button"
          className="principal"
          disabled={ocultos.length === 0}
          onClick={() => void criar()}
        >
          Criar cartão
        </button>
        <Link to="/recall/frases" className="botao discreto">
          Cancelar
        </Link>
      </div>
    </>
  );
}
