import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { Repositorio } from '../../core/persistencia';
import { FIXAR_POR_DIA } from '../../dominios/recall/fixar-estas';
import { listarFrases } from '../../dominios/recall/servico';
import { Esqueleto, Vazio } from '../componentes/estados';
import { useDados } from '../dados/contexto';
import { FixarEstas } from './FixarEstas';
import { sumulasVinculantes } from './fixar-estas';

const carregar = async (repo: Repositorio) => {
  const [frases, sumulas, todas] = await Promise.all([
    listarFrases(repo, {}, null, 200),
    sumulasVinculantes(repo).catch(() => undefined),
    repo.colecao('frases').todosDoUsuario(),
  ]);
  const fixadas = new Set(
    todas.flatMap((f) => (f.excluidoEm === null ? [f.trecho?.dispositivoId] : [])),
  );
  return {
    frases: frases.itens,
    paraFixar: (sumulas ?? []).filter((s) => !fixadas.has(s.dispositivoId)),
    semColecao: sumulas === undefined,
  };
};

/**
 * Aba Frases (D9, D25, D-D5): a lista das Frases, uma por linha. Cada uma leva ao Erro que a
 * originou (é por aqui que se chega a ele, já que "Erros" deixou de ser aba) e, por "Esconder
 * trecho", ao cartão com lacuna. A lista dos Erros, com os filtros (resultado, situação,
 * "completar"), é a página `/recall/erros`, a que um link no fim desta lista leva. O link fica
 * também sem Frase nenhuma: Erro antigo, sem frase correta, só se alcança por ele. Sem Frase, a aba
 * diz de onde elas vêm (o Erro e o trecho enviado na leitura) e leva à Biblioteca.
 */
export function ListaFrases() {
  const { dados } = useDados(carregar);
  const [fixadas, setFixadas] = useState<number | null>(null);
  const aviso = useRef<HTMLParagraphElement>(null);
  const levarOFoco = useRef(false);
  // "Fixar N frases" recarrega a lista e o cartão some junto: o foco vai à linha que diz o que houve.
  useEffect(() => {
    if (levarOFoco.current && aviso.current) {
      levarOFoco.current = false;
      aviso.current.focus();
    }
  });
  const aoFixar = (n: number) => {
    levarOFoco.current = true;
    setFixadas(n);
  };
  if (!dados) return <Esqueleto />;
  const verErros = (
    <p className="mais-da-lista">
      <Link to="/recall/erros" className="botao botao-texto na-margem">
        Ver os erros, com filtros
      </Link>
    </p>
  );
  const { frases, paraFixar, semColecao } = dados;
  if (frases.length === 0) {
    return (
      <>
        <Vazio
          titulo="Nenhuma frase ainda"
          acao={
            <Link to="/biblioteca" className="botao">
              Ler uma norma
            </Link>
          }
        >
          <p>
            Elas vêm do erro que você registra, com a frase correta, e do trecho de norma que você
            envia às frases durante a leitura.
          </p>
        </Vazio>
        <FixarEstas itens={paraFixar} semColecao={semColecao} aoFixar={aoFixar} />
        {verErros}
      </>
    );
  }
  return (
    <section aria-label="Frases">
      {fixadas !== null && (
        <p ref={aviso} tabIndex={-1} className="sucesso">
          {fixadas === 1 ? '1 frase fixada.' : `${String(fixadas)} frases fixadas.`} A Revisão
          começa amanhã, {FIXAR_POR_DIA} por dia.
        </p>
      )}
      <ul className="lista-simples frases">
        {frases.map((f) => (
          <li key={f.id}>
            <span className="texto-leitura">
              {f.erroId ? <Link to={`/recall/erros/${f.erroId}`}>{f.texto}</Link> : f.texto}
            </span>
            <Link
              to={`/recall/frases/${f.id}/cartao`}
              className="botao botao-texto na-margem"
              aria-label={`Esconder trecho: ${f.texto}`}
            >
              Esconder trecho
            </Link>
          </li>
        ))}
      </ul>
      <FixarEstas itens={paraFixar} aoFixar={aoFixar} />
      {verErros}
    </section>
  );
}
