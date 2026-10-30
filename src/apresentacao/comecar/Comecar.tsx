import { useCallback } from 'react';
import { Link } from 'react-router';
import { Esqueleto, Falha } from '../componentes/estados';
import { Voltar } from '../componentes/Voltar';
import { useFonteAcervo } from '../dados/fonteAcervoContexto';
import { useCarga } from './useCarga';
import './estilos-comecar.css';

const editais = (n: number) => (n === 1 ? '1 edital' : `${String(n)} editais`);

/**
 * `/comecar`: "Qual concurso você estuda?". Uma pergunta, uma resposta por toque: a carreira leva às normas
 * com que ela começa (`ParaComecar`). As carreiras vêm do pacote de partida, então uma nova entra sem
 * código novo. Quem não achou o seu concurso, ou ainda não sabe, vai ao acervo inteiro.
 */
export function Comecar() {
  const fonte = useFonteAcervo();
  const carregar = useCallback(() => fonte.pacoteDePartida(), [fonte]);
  const { carga, tentarDeNovo } = useCarga(carregar);
  return (
    <section className="comecar" aria-labelledby="comecar-titulo">
      <Voltar para="/">Voltar ao Hoje</Voltar>
      <h1 id="comecar-titulo">Qual concurso você estuda?</h1>
      {carga.estado === 'carregando' && <Esqueleto />}
      {carga.estado === 'falha' && (
        <>
          <Falha
            oQue="Não foi possível abrir a lista de concursos."
            oQueFazer="Precisa de internet só para adicionar normas. Conecte-se e tente de novo."
          />
          <div className="linha-acoes">
            <button type="button" className="principal" onClick={tentarDeNovo}>
              Tentar de novo
            </button>
            <Link to="/biblioteca" className="botao">
              Ir à Biblioteca
            </Link>
          </div>
        </>
      )}
      {carga.estado === 'pronto' && (
        <>
          <p className="dica">
            Cada carreira começa pelas normas que mais aparecem nos editais dela. Seu concurso não
            está aqui, ou ainda não saiu o edital? Escolha o mais parecido; dá para ajustar depois.
          </p>
          <ul className="comecar-escolhas">
            {Object.entries(carga.dados.carreiras).map(([slug, c]) => (
              <li key={slug}>
                <Link to={`/comecar/${slug}`} className="botao comecar-escolha">
                  <strong>{c.nome}</strong>
                  <span>{editais(c.editaisComTexto)}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link to="/biblioteca/acervo" className="botao comecar-escolha">
                <strong>Outro concurso, ou ainda não sei</strong>
                <span>Ver todo o acervo</span>
              </Link>
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
