// Um resumo (F3-C, C1): leitura com "Enviar às frases" em qualquer seleção, e edição.
import { criarCartaoDeLacuna } from '../../../dominios/recall/servico';
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
  const [confirmando, setConfirmando] = useState(false);

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
          <div ref={corpoRef} className="resumo-corpo texto-leitura">
            {nota.conteudo}
          </div>
          <div className="linha-acoes">
            <button
              type="button"
              disabled={!selecionado}
              title={selecionado ? undefined : 'Selecione um trecho do resumo'}
              onClick={() => {
                setFraseAberta(selecionado);
              }}
            >
              Enviar às frases
            </button>
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
          </div>
          {confirmando ? (
            <p className="resumo-confirmar" role="alert">
              Excluir este resumo?{' '}
              <button
                type="button"
                onClick={() => {
                  void apagar();
                }}
              >
                Excluir
              </button>{' '}
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setConfirmando(false);
                }}
              >
                Manter
              </button>
            </p>
          ) : (
            <p className="resumo-discreto">
              <button
                type="button"
                className="resumo-excluir"
                onClick={() => {
                  setConfirmando(true);
                }}
              >
                Excluir resumo
              </button>
            </p>
          )}
        </article>
      )}
      <p role="status" className="resumo-discreto">
        {anuncio}
      </p>
      <DialogoEnviarAsFrases
        aberto={fraseAberta !== undefined}
        trecho={fraseAberta?.texto ?? ''}
        enviar={async (texto, ocultos) => {
          if (!fraseAberta) return false;
          try {
            const frase = await criarFraseDeResumo(repo, {
              texto,
              notaId: id,
              citado: fraseAberta.texto,
              inicio: fraseAberta.inicio,
              fim: fraseAberta.fim,
              ...(nota.disciplinaId ? { disciplinaId: nota.disciplinaId } : {}),
            });
            if (ocultos.length > 0) await criarCartaoDeLacuna(repo, frase.id, ocultos);
          } catch {
            return false;
          }
          setAnuncio('Enviado às frases.');
          setTimeout(() => {
            setAnuncio('');
          }, 3000);
          return true;
        }}
        fechar={() => {
          setFraseAberta(undefined);
        }}
      />
    </>
  );
}
