// Resumos na Biblioteca (F3-C, C1): lista e criação. Só o corpo é obrigatório (D25).
import { useCallback, useState, type SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { criarResumo, listarResumos } from '../../../dominios/notas/resumos';
import { Esqueleto, Falha, Vazio } from '../../componentes/estados';
import { LinhaLista } from '../../componentes/LinhaLista';
import { useDados, useRepositorio } from '../../dados/contexto';
import { AbasDaBiblioteca } from '../AbasDaBiblioteca';
import { CamposDoResumo } from './CamposDoResumo';
import './estilos-resumos.css';

export function Resumos({ novo = false }: { novo?: boolean }) {
  const repo = useRepositorio();
  const navegar = useNavigate();
  const carregar = useCallback((r: typeof repo) => listarResumos(r), []);
  const { dados, falha } = useDados(carregar);
  const [erro, setErro] = useState<string>();

  async function salvar(corpo: string, titulo: string) {
    setErro(undefined);
    try {
      const nota = await criarResumo(repo, { corpo, titulo });
      void navegar(`/biblioteca/resumos/${nota.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    }
  }

  return (
    <>
      <h1>Biblioteca</h1>
      <AbasDaBiblioteca atual="resumos" />
      {novo ? (
        <FormNovo salvar={salvar} erro={erro} />
      ) : !dados ? (
        falha ? (
          <Falha
            oQue="Não foi possível carregar os resumos."
            oQueFazer="Recarregue a página. Se continuar, feche as outras abas do Arretado."
          />
        ) : (
          <Esqueleto />
        )
      ) : dados.length === 0 ? (
        <Vazio
          titulo="Nenhum resumo ainda"
          acao={
            <Link to="/biblioteca/resumos/novo" className="botao principal">
              Escrever um resumo
            </Link>
          }
        >
          <p>Escreva ou cole um resumo seu. Depois é só selecionar um trecho e enviar às frases.</p>
        </Vazio>
      ) : (
        <section aria-labelledby="titulo-resumos">
          <div className="cabecalho-secao">
            <h2 id="titulo-resumos">Resumos</h2>
            <Link to="/biblioteca/resumos/novo" className="botao">
              Novo resumo
            </Link>
          </div>
          <ul className="lista-simples lista-de-linhas">
            {dados.map((n) => (
              <li key={n.id}>
                <LinhaLista
                  para={`/biblioteca/resumos/${n.id}`}
                  icone="¶"
                  titulo={n.titulo}
                  apoio={n.conteudo.slice(0, 100)}
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
  salvar: (corpo: string, titulo: string) => Promise<void>;
  erro: string | undefined;
}) {
  const [corpo, setCorpo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function aoEnviar(e: SyntheticEvent) {
    e.preventDefault();
    if (!corpo.trim() || ocupado) return;
    setOcupado(true);
    await salvar(corpo, titulo);
    setOcupado(false);
  }
  return (
    <form
      onSubmit={(e) => {
        void aoEnviar(e);
      }}
    >
      <h2>Novo resumo</h2>
      <CamposDoResumo corpo={corpo} titulo={titulo} setCorpo={setCorpo} setTitulo={setTitulo} />
      {erro && (
        <p role="alert" className="aviso falha">
          {erro}
        </p>
      )}
      <div className="linha-acoes">
        <button type="submit" className="principal" disabled={!corpo.trim() || ocupado}>
          Salvar
        </button>
        <Link to="/biblioteca/resumos" className="botao">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
