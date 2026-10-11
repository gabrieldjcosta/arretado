import { useState, type SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Norma } from '../../core/modelo';
import {
  acharNasColecoes,
  colecoesPublicadas,
  type AchadoNaColecao,
  type EspecieDeColecao,
} from '../../dominios/legislacao/colecoes';
import { Esqueleto, Falha, Vazio } from '../componentes/estados';
import { LinhaLista } from '../componentes/LinhaLista';
import { useDados, useRepositorio } from '../dados/contexto';
import { AbasDaBiblioteca } from './AbasDaBiblioteca';

const TEXTOS = {
  sumulas: {
    titulo: 'Súmulas',
    icone: 'S',
    vazio: 'Nenhuma súmula ainda',
    exemplo: 'súmula 593, SV 11',
    explica: 'Adicione as coleções de súmulas do acervo para lê-las e achá-las pelo número.',
  },
  teses: {
    titulo: 'Teses',
    icone: 'T',
    vazio: 'Nenhuma tese ainda',
    exemplo: 'tese 12',
    explica: 'Adicione as teses do acervo para lê-las e achá-las pelo número.',
  },
} as const;

const paraLeitor = (a: AchadoNaColecao) =>
  `/biblioteca/normas/${a.norma.id}?ir=${encodeURIComponent(a.endereco)}`;

/** Biblioteca › Súmulas e Teses: as coleções já adicionadas, com busca por número. */
export function Colecoes({ especie }: { especie: EspecieDeColecao }) {
  const repo = useRepositorio();
  const navegar = useNavigate();
  const t = TEXTOS[especie];
  const { dados, falha } = useDados((r) => colecoesPublicadas(r, especie));
  const [texto, setTexto] = useState('');
  const [achados, setAchados] = useState<AchadoNaColecao[] | null>(null);
  const [falhaBusca, setFalhaBusca] = useState(false);

  function buscar(e: SyntheticEvent) {
    e.preventDefault();
    if (!dados || texto.trim() === '') return;
    setFalhaBusca(false);
    acharNasColecoes(repo, dados, especie, texto).then(
      (lista) => {
        if (lista.length === 1 && lista[0]) void navegar(paraLeitor(lista[0]));
        else setAchados(lista);
      },
      () => {
        setFalhaBusca(true);
      },
    );
  }

  const catalogo = (
    <Link to={`/biblioteca/acervo?tipo=${especie}`} className="botao">
      Adicionar do acervo
    </Link>
  );

  return (
    <>
      <h1>Biblioteca</h1>
      <AbasDaBiblioteca atual={especie} />
      {!dados ? (
        falha ? (
          <Falha
            oQue={`Não foi possível carregar as ${t.titulo.toLowerCase()}.`}
            oQueFazer="Recarregue a página. Se continuar, feche as outras abas do Arretado."
          />
        ) : (
          <Esqueleto />
        )
      ) : dados.length === 0 ? (
        <Vazio
          titulo={t.vazio}
          acao={
            <Link to={`/biblioteca/acervo?tipo=${especie}`} className="botao principal">
              Adicionar do acervo
            </Link>
          }
        >
          <p>{t.explica}</p>
        </Vazio>
      ) : (
        <>
          <form role="search" onSubmit={buscar} className="linha-acoes">
            <label>
              Achar por número
              <input
                type="search"
                value={texto}
                placeholder={t.exemplo}
                onChange={(e) => {
                  setTexto(e.target.value);
                  setAchados(null);
                }}
              />
            </label>
            <button type="submit" className="principal">
              Achar
            </button>
          </form>
          {falhaBusca && (
            <p role="alert" className="aviso falha">
              Não foi possível buscar. Tente de novo.
            </p>
          )}
          {achados?.length === 0 && (
            <p role="status" className="dica">
              Nenhum resultado para “{texto}”. Digite como em {t.exemplo}.
            </p>
          )}
          {achados && achados.length > 1 && (
            <ul className="lista-simples lista-de-linhas" aria-label="Resultados">
              {achados.map((a) => (
                <li key={a.norma.id}>
                  <LinhaLista
                    para={paraLeitor(a)}
                    icone={t.icone}
                    titulo={a.norma.tituloCurto}
                    {...(a.norma.ementa ? { apoio: a.norma.ementa } : {})}
                  />
                </li>
              ))}
            </ul>
          )}
          <section aria-labelledby="titulo-colecoes">
            <div className="cabecalho-secao">
              <h2 id="titulo-colecoes">{t.titulo}</h2>
              {catalogo}
            </div>
            <ul className="lista-simples lista-de-linhas">
              {dados.map((n: Norma) => (
                <li key={n.id}>
                  <LinhaLista
                    para={`/biblioteca/normas/${n.id}`}
                    icone={t.icone}
                    titulo={n.tituloCurto}
                    {...(n.ementa ? { apoio: n.ementa } : {})}
                  />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
