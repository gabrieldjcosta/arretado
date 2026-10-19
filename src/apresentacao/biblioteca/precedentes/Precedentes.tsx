// Precedentes na Biblioteca (F3-C, C2): lista e cadastro. Só tribunal, número e o texto são
// obrigatórios (D25); a tese nasce como o primeiro trecho-chave.
import { useCallback, useState, type SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  criarPrecedente,
  listarPrecedentes,
  trechoPadrao,
} from '../../../dominios/precedentes/servico';
import { Esqueleto, Falha, Vazio } from '../../componentes/estados';
import { LinhaLista } from '../../componentes/LinhaLista';
import { useDados, useRepositorio } from '../../dados/contexto';
import { AbasDaBiblioteca } from '../AbasDaBiblioteca';
import './estilos-precedentes.css';

export function Precedentes({ novo = false }: { novo?: boolean }) {
  const repo = useRepositorio();
  const navegar = useNavigate();
  const carregar = useCallback((r: typeof repo) => listarPrecedentes(r), []);
  const { dados, falha } = useDados(carregar);
  const [erro, setErro] = useState<string>();

  async function salvar(entrada: { tribunal: string; numero: string; texto: string }) {
    setErro(undefined);
    try {
      const p = await criarPrecedente(repo, entrada);
      void navegar(`/biblioteca/precedentes/${p.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    }
  }

  return (
    <>
      <h1>Biblioteca</h1>
      <AbasDaBiblioteca atual="precedentes" />
      {novo ? (
        <FormNovo salvar={salvar} erro={erro} />
      ) : !dados ? (
        falha ? (
          <Falha
            oQue="Não foi possível carregar os precedentes."
            oQueFazer="Recarregue a página. Se continuar, feche as outras abas do Arretado."
          />
        ) : (
          <Esqueleto />
        )
      ) : dados.length === 0 ? (
        <Vazio
          titulo="Nenhum precedente ainda"
          acao={
            <Link to="/biblioteca/precedentes/novo" className="botao principal">
              Cadastrar um precedente
            </Link>
          }
        >
          <p>
            Cole a ementa ou a tese, ligue à lei e envie trechos às frases. Súmulas e teses do
            acervo estão nas abas ao lado e também podem ser ligadas aos seus precedentes.
          </p>
        </Vazio>
      ) : (
        <section aria-labelledby="titulo-precedentes">
          <div className="cabecalho-secao">
            <h2 id="titulo-precedentes">Precedentes</h2>
            <Link to="/biblioteca/precedentes/novo" className="botao">
              Novo precedente
            </Link>
          </div>
          <ul className="lista-simples lista-de-linhas">
            {dados.map((p) => (
              <li key={p.id}>
                <LinhaLista
                  para={`/biblioteca/precedentes/${p.id}`}
                  selo={
                    p.favorito ? <span className="visualmente-oculto">Favorito</span> : undefined
                  }
                  titulo={p.tituloTese}
                  apoio={(trechoPadrao(p)?.texto ?? p.textoOriginal ?? '').slice(0, 120)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function FormNovo({
  salvar,
  erro,
}: {
  salvar: (e: { tribunal: string; numero: string; texto: string }) => Promise<void>;
  erro: string | undefined;
}) {
  const [tribunal, setTribunal] = useState('');
  const [numero, setNumero] = useState('');
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const pronto = texto.trim() !== '';
  async function aoEnviar(e: SyntheticEvent) {
    e.preventDefault();
    if (!pronto || ocupado) return;
    setOcupado(true);
    await salvar({ tribunal, numero, texto });
    setOcupado(false);
  }
  return (
    <form
      onSubmit={(e) => {
        void aoEnviar(e);
      }}
    >
      <h2>Novo precedente</h2>
      <label className="resumo-campo">
        Tribunal (opcional)
        <input
          type="text"
          value={tribunal}
          placeholder="STF"
          maxLength={500}
          onChange={(e) => {
            setTribunal(e.target.value);
          }}
        />
      </label>
      <label className="resumo-campo">
        Número (opcional)
        <input
          type="text"
          value={numero}
          placeholder="ADPF 347"
          maxLength={100}
          onChange={(e) => {
            setNumero(e.target.value);
          }}
        />
      </label>
      <label className="resumo-campo">
        Texto (ementa, tese ou o trecho que importa)
        <textarea
          value={texto}
          rows={10}
          autoFocus
          onChange={(e) => {
            setTexto(e.target.value);
          }}
        />
      </label>
      {erro && (
        <p role="alert" className="aviso falha">
          {erro}
        </p>
      )}
      <div className="linha-acoes">
        <button type="submit" className="principal" disabled={!pronto || ocupado}>
          Salvar
        </button>
        <Link to="/biblioteca/precedentes" className="botao">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
