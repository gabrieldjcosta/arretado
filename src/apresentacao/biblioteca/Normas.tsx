import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import type { Norma, VersaoDeNorma } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { normasPublicadas } from '../../dominios/legislacao/leitor';
import {
  descartarRascunho,
  RascunhoIndisponivel,
  rascunhosPendentes,
} from '../../dominios/legislacao/servico';
import { Dialogo } from '../componentes/Dialogo';
import { Esqueleto, Falha, Vazio } from '../componentes/estados';
import { useDados, useRepositorio } from '../dados/contexto';
import { formatarQuando } from '../recall/rotulos';

interface Pendente {
  norma: Norma;
  versao: VersaoDeNorma;
}

async function carregarBiblioteca(repo: Repositorio) {
  const [normas, pendentes] = await Promise.all([normasPublicadas(repo), rascunhosPendentes(repo)]);
  return { normas, pendentes };
}

/** "Lei nº 7.210/1984 · Institui a Lei de Execução Penal.": o que o título curto não diz. */
function descricaoDe(norma: Norma): string {
  const referencia =
    norma.tipo !== undefined && norma.referencia !== undefined
      ? `${norma.tipo} nº ${norma.referencia}`
      : undefined;
  const partes = [
    referencia?.toLocaleLowerCase('pt-BR') === norma.tituloCurto.toLocaleLowerCase('pt-BR')
      ? undefined
      : referencia,
    norma.ementa,
  ];
  return partes.filter((p) => p !== undefined && p !== '').join(' · ');
}

/** Aviso deixado pela tela Importar ao publicar ou descartar (estado da navegação). */
function avisoDaNavegacao(estado: unknown): string | null {
  if (typeof estado !== 'object' || estado === null || !('aviso' in estado)) return null;
  return typeof estado.aviso === 'string' ? estado.aviso : null;
}

const IMPORTAR = (
  <Link to="/biblioteca/importar" className="botao principal">
    Importar norma
  </Link>
);

/** Biblioteca › Normas (F2, 9.5; Parte 2 §9.2): as normas publicadas e a retomada da importação. */
export function Normas() {
  const repo = useRepositorio();
  const { dados, falha, recarregar } = useDados(carregarBiblioteca);
  const [descartando, setDescartando] = useState<Pendente | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [falhaDescarte, setFalhaDescarte] = useState<string | null>(null);
  const estadoNavegacao: unknown = useLocation().state;
  const navegar = useNavigate();
  const [aviso, setAviso] = useState(() => avisoDaNavegacao(estadoNavegacao));

  useEffect(() => {
    // Lido uma vez: recarregar a página ou voltar a ela não repete o aviso.
    if (avisoDaNavegacao(estadoNavegacao) !== null) {
      void navegar('/biblioteca', { replace: true, state: null });
    }
  }, [estadoNavegacao, navegar]);

  function fecharDescarte() {
    setDescartando(null);
    setFalhaDescarte(null);
  }

  function descartar(pendente: Pendente) {
    if (ocupado) return;
    setOcupado(true);
    setFalhaDescarte(null);
    descartarRascunho(repo, pendente.versao.id).then(
      () => {
        setOcupado(false);
        setDescartando(null);
        setAviso(`Importação de ${pendente.norma.tituloCurto} descartada.`);
      },
      (e: unknown) => {
        setOcupado(false);
        // Outra aba pode ter publicado ou descartado antes: a lista se atualiza.
        recarregar();
        setFalhaDescarte(
          e instanceof RascunhoIndisponivel
            ? e.message
            : 'Não foi possível descartar. Feche as outras abas do Arretado e tente de novo.',
        );
      },
    );
  }

  return (
    <>
      <h1>Biblioteca</h1>
      {aviso && (
        <p role="status" className="sucesso">
          {aviso}
        </p>
      )}
      {!dados ? (
        falha ? (
          <Falha
            oQue="Não foi possível carregar a Biblioteca."
            oQueFazer="Recarregue a página. Se continuar, feche as outras abas do Arretado."
          />
        ) : (
          <Esqueleto />
        )
      ) : (
        <>
          {dados.pendentes.length > 0 && (
            <section className="aviso faixa-rascunho" aria-label="Importações pendentes">
              <ul className="lista-simples">
                {dados.pendentes.map((p) => (
                  <li key={p.versao.id}>
                    <p>
                      <strong>{p.norma.tituloCurto}</strong>: importação pendente de revisão, desde{' '}
                      {formatarQuando(p.versao.capturadaEm)}.
                    </p>
                    <div className="acoes-item">
                      <Link
                        to={`/biblioteca/importar/${p.versao.id}`}
                        className="botao"
                        aria-label={`Retomar a importação de ${p.norma.tituloCurto}`}
                      >
                        Retomar
                      </Link>
                      <button
                        type="button"
                        aria-label={`Descartar a importação de ${p.norma.tituloCurto}`}
                        onClick={() => {
                          setAviso(null);
                          setDescartando(p);
                        }}
                      >
                        Descartar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {dados.normas.length === 0 ? (
            <Vazio titulo="Nenhuma norma ainda" acao={IMPORTAR}>
              <p>
                Cole a lei da página do Planalto ou da ALESP: o Arretado separa artigos, parágrafos
                e incisos para você ler e marcar.
              </p>
            </Vazio>
          ) : (
            <section aria-labelledby="titulo-normas">
              <div className="cabecalho-secao">
                <h2 id="titulo-normas">Normas</h2>
                {IMPORTAR}
              </div>
              <ul className="lista-simples">
                {dados.normas.map((n) => {
                  const descricao = descricaoDe(n);
                  return (
                    <li key={n.id}>
                      <Link className="item-norma" to={`/biblioteca/normas/${n.id}`}>
                        <strong>{n.tituloCurto}</strong>
                        {descricao && <span className="dica">{descricao}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
      <Dialogo
        aberto={descartando !== null}
        aoFechar={fecharDescarte}
        titulo={`Descartar a importação de ${descartando?.norma.tituloCurto ?? ''}?`}
      >
        <p>
          A norma importada e a página guardada saem deste aparelho. Para lê-la, será preciso
          importá-la de novo.
        </p>
        {falhaDescarte && (
          <p role="alert" className="aviso falha">
            {falhaDescarte}
          </p>
        )}
        <div className="linha-acoes">
          <button
            type="button"
            className="perigoso"
            disabled={ocupado}
            onClick={() => {
              if (descartando) descartar(descartando);
            }}
          >
            Descartar
          </button>
          <button type="button" onClick={fecharDescarte}>
            Cancelar
          </button>
        </div>
      </Dialogo>
    </>
  );
}
