// Um resumo (F3-C, C1): leitura com "Enviar às frases" em qualquer seleção, e edição.
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  criarFraseDeResumo,
  editarResumo,
  excluirResumo,
  lerResumo,
} from '../../../dominios/notas/resumos';
import { Esqueleto, Falha } from '../../componentes/estados';
import { useDados, useRepositorio } from '../../dados/contexto';
import { AbasDaBiblioteca } from '../AbasDaBiblioteca';
import { DialogoEnviarAsFrases } from '../Marcacoes';
import { CamposDoResumo } from './CamposDoResumo';
import { selecaoNoCorpo, type Selecionado } from './selecaoNoCorpo';
import './estilos-resumos.css';

export function Resumo() {
  const { id = '' } = useParams();
  const repo = useRepositorio();
  const navegar = useNavigate();
  const carregar = useCallback((r: typeof repo) => lerResumo(r, id), [id]);
  const { dados: nota, carregando, falha } = useDados(carregar);
  const corpoRef = useRef<HTMLDivElement>(null);
  const [selecionado, setSelecionado] = useState<Selecionado>();
  const [fraseAberta, setFraseAberta] = useState<Selecionado>();
  const [editando, setEditando] = useState(false);
  const [corpo, setCorpo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [erro, setErro] = useState<string>();
  const [anuncio, setAnuncio] = useState('');

  useEffect(() => {
    function aoMudar() {
      setSelecionado(selecaoNoCorpo(corpoRef.current));
    }
    document.addEventListener('selectionchange', aoMudar);
    return () => {
      document.removeEventListener('selectionchange', aoMudar);
    };
  }, []);

  if (falha && !nota) {
    return (
      <Falha oQue="Não foi possível abrir o resumo." oQueFazer="Volte à lista e tente de novo." />
    );
  }
  if (carregando && !nota) return <Esqueleto />;
  if (!nota) {
    return (
      <>
        <h1>Biblioteca</h1>
        <AbasDaBiblioteca atual="resumos" />
        <p>Este resumo não existe mais.</p>
        <Link to="/biblioteca/resumos" className="botao">
          Voltar aos resumos
        </Link>
      </>
    );
  }

  async function salvar(e: SyntheticEvent) {
    e.preventDefault();
    setErro(undefined);
    try {
      await editarResumo(repo, id, { corpo, titulo });
      setEditando(false);
    } catch (x) {
      setErro(x instanceof Error ? x.message : 'Não foi possível salvar.');
    }
  }

  async function apagar() {
    if (!window.confirm('Excluir este resumo?')) return;
    await excluirResumo(repo, id);
    void navegar('/biblioteca/resumos');
  }

  return (
    <>
      <h1>Biblioteca</h1>
      <AbasDaBiblioteca atual="resumos" />
      {editando ? (
        <form
          onSubmit={(e) => {
            void salvar(e);
          }}
        >
          <CamposDoResumo corpo={corpo} titulo={titulo} setCorpo={setCorpo} setTitulo={setTitulo} />
          {erro && (
            <p role="alert" className="aviso falha">
              {erro}
            </p>
          )}
          <div className="linha-acoes">
            <button type="submit" className="principal" disabled={!corpo.trim()}>
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setEditando(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <article>
          <h2>{nota.titulo}</h2>
          <div ref={corpoRef} className="resumo-corpo">
            {nota.conteudo}
          </div>
          <div className="linha-acoes">
            {selecionado && (
              <button
                type="button"
                className="principal"
                onClick={() => {
                  setFraseAberta(selecionado);
                }}
              >
                Enviar às frases
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setCorpo(nota.conteudo);
                setTitulo(nota.titulo);
                setEditando(true);
              }}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => {
                void apagar();
              }}
            >
              Excluir
            </button>
          </div>
        </article>
      )}
      <p role="status" className="visualmente-oculto">
        {anuncio}
      </p>
      <DialogoEnviarAsFrases
        aberto={fraseAberta !== undefined}
        trecho={fraseAberta?.texto ?? ''}
        enviar={async (texto) => {
          if (!fraseAberta) return false;
          try {
            await criarFraseDeResumo(repo, {
              texto,
              notaId: id,
              citado: fraseAberta.texto,
              inicio: fraseAberta.inicio,
              fim: fraseAberta.fim,
              ...(nota.disciplinaId ? { disciplinaId: nota.disciplinaId } : {}),
            });
          } catch {
            return false;
          }
          setAnuncio('Enviado às frases.');
          return true;
        }}
        fechar={() => {
          setFraseAberta(undefined);
        }}
      />
    </>
  );
}
