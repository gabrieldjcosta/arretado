import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { NORMA_GRANDE } from '../../dominios/acervo/agrupar';
import { adicionarPartida, normasDaPartida } from '../../dominios/acervo/partida';
import type { EntradaDoIndice } from '../../dominios/acervo/esquemas';
import { FonteEmbutida, type FonteDoCatalogo } from '../../dominios/catalogo';
import { Esqueleto, Falha, Vazio } from '../componentes/estados';
import { Voltar } from '../componentes/Voltar';
import { useRepositorio } from '../dados/contexto';
import { useFonteAcervo } from '../dados/fonteAcervoContexto';
import { montarTrilha, trilhaOferecida, type TrilhaOferecida } from './trilha-do-edital';
import { useCarga } from './useCarga';
import './estilos-comecar.css';

const lista = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' });

interface Andamento {
  feitos: number;
  total: number;
  atual?: EntradaDoIndice;
  /** As normas já entraram; agora é a Trilha. */
  trilha?: true;
}

interface Falhou {
  /** O que não entrou, com o motivo; vazio quando só o caminho até a leitura quebrou. */
  falhas: { id: string; motivo: string }[];
  /** A norma da biblioteca com que a pessoa já pode começar, se alguma entrou. */
  normaId?: string;
  /** As normas entraram, mas a Trilha não: a leitura segue; a Trilha fica para a tela dela. */
  trilha?: true;
}

/**
 * `/comecar/:carreira`: "Para começar". As normas que mais aparecem nos editais da carreira, só as que
 * o acervo tem hoje, e um botão que adiciona todas e abre a primeira no Leitor. Das que o pacote cita
 * e o acervo ainda não tem, a tela diz quais são e leva ao importador. Um fluxo só (27/10/2026): a
 * mesma tela oferece a Trilha do edital mais recente da carreira, marcada de saída, e o mesmo botão
 * monta as duas coisas; a Trilha falhar não impede a leitura.
 */
export function ParaComecar({ catalogo }: { catalogo?: FonteDoCatalogo } = {}) {
  const { carreira: slug } = useParams<{ carreira: string }>();
  const repo = useRepositorio();
  const fonte = useFonteAcervo();
  const navegar = useNavigate();
  const fonteDoCatalogo = useMemo(() => catalogo ?? new FonteEmbutida(), [catalogo]);
  const carregar = useCallback(async () => {
    const [pacote, indice, trilha] = await Promise.all([
      fonte.pacoteDePartida(),
      fonte.listar(),
      // A Trilha é um extra: sem catálogo, a tela fica como era.
      slug === undefined ? null : trilhaOferecida(repo, fonteDoCatalogo, slug).catch(() => null),
    ]);
    return { pacote, indice, trilha };
  }, [fonte, fonteDoCatalogo, repo, slug]);
  const { carga, tentarDeNovo } = useCarga(carregar);
  const [andamento, setAndamento] = useState<Andamento | null>(null);
  const [falhou, setFalhou] = useState<Falhou | null>(null);
  const [querTrilha, setQuerTrilha] = useState(true);
  // Tentar de novo depois de uma falha nas normas não cria a Trilha duas vezes.
  const [trilhaMontada, setTrilhaMontada] = useState(false);

  // `hasOwn`: o endereço é de quem digita, e "constructor" ou "__proto__" não são carreiras.
  const carreiras = carga.estado === 'pronto' ? carga.dados.pacote.carreiras : undefined;
  const carreira =
    carreiras && slug !== undefined && Object.hasOwn(carreiras, slug) ? carreiras[slug] : undefined;
  const { presentes, faltam } =
    carga.estado === 'pronto' && carreira
      ? normasDaPartida(carreira, carga.dados.indice)
      : { presentes: [], faltam: [] };
  const tituloDe = new Map(presentes.map((p) => [p.entrada.id, p.norma.titulo]));
  const trilha: TrilhaOferecida | null =
    carga.estado === 'pronto' && carreira ? carga.dados.trilha : null;

  async function adicionarELer() {
    if (andamento || presentes.length === 0) return;
    const ids = presentes.map((p) => p.entrada.id);
    setFalhou(null);
    setAndamento({ feitos: 0, total: ids.length });
    try {
      const r = await adicionarPartida(repo, fonte, ids, {
        aoProgresso: (feitos, total, atual) => {
          setAndamento({ feitos, total, ...(atual ? { atual } : {}) });
        },
      });
      // A Trilha só depois das normas: se a rede cair no meio, o que a pessoa pediu primeiro entrou.
      let trilhaFalhou = false;
      if (trilha && querTrilha && r.normaId !== undefined && !trilhaMontada) {
        setAndamento({ feitos: ids.length, total: ids.length, trilha: true });
        try {
          await montarTrilha(repo, trilha);
          setTrilhaMontada(true);
        } catch {
          trilhaFalhou = true;
        }
      }
      if (r.lote.falhas.length === 0 && r.normaId !== undefined && !trilhaFalhou) {
        void navegar(`/biblioteca/normas/${r.normaId}`);
        return;
      }
      setFalhou({
        falhas: r.lote.falhas,
        ...(r.normaId === undefined ? {} : { normaId: r.normaId }),
        ...(trilhaFalhou ? { trilha: true } : {}),
      });
    } catch {
      setFalhou({ falhas: ids.map((id) => ({ id, motivo: 'Não foi possível adicionar.' })) });
    } finally {
      setAndamento(null);
    }
  }

  return (
    <section className="comecar" aria-labelledby="comecar-titulo">
      <Voltar para="/comecar">Outro concurso</Voltar>
      {carga.estado === 'carregando' && (
        <>
          <h1 id="comecar-titulo">Para começar</h1>
          <Esqueleto />
        </>
      )}
      {carga.estado === 'falha' && (
        <>
          <h1 id="comecar-titulo">Para começar</h1>
          <Falha
            oQue="Não foi possível abrir o acervo."
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
      {carga.estado === 'pronto' && !carreira && (
        <Vazio
          titulo="Esse concurso não está na lista"
          acao={
            <Link to="/comecar" className="botao principal">
              Escolher meu concurso
            </Link>
          }
        />
      )}
      {carga.estado === 'pronto' && carreira && (
        <>
          <header className="comecar-cabeca">
            <p className="comecar-carreira">{carreira.nome}</p>
            <h1 id="comecar-titulo">Para começar</h1>
          </header>
          <p className="dica">As normas que mais aparecem nos editais desta carreira.</p>
          {presentes.length > 0 && (
            <ul className="lista-simples comecar-normas">
              {presentes.map(({ norma }) => (
                <li key={norma.id}>
                  <strong>{norma.titulo}</strong>
                  <span className="dica">
                    {norma.editaisQueCitam} de {carreira.editaisComTexto} editais
                  </span>
                </li>
              ))}
            </ul>
          )}
          {andamento && (
            <div role="status" className="aviso">
              {andamento.trilha ? (
                <p>Montando a Trilha…</p>
              ) : (
                <p>
                  Adicionando {Math.min(andamento.feitos + 1, andamento.total)} de {andamento.total}
                  {andamento.atual &&
                    `: ${tituloDe.get(andamento.atual.id) ?? andamento.atual.titulo}`}
                </p>
              )}
              <progress
                aria-label="Andamento da adição"
                value={andamento.feitos}
                max={andamento.total}
              />
              {andamento.atual && andamento.atual.tamanho > NORMA_GRANDE && (
                <p className="dica">
                  Norma grande: salvar no aparelho leva alguns segundos. Pode continuar; nada
                  depende da internet.
                </p>
              )}
            </div>
          )}
          {falhou && (
            <div role="alert" className="aviso falha">
              <p>
                <strong>
                  {falhou.falhas.length > 0
                    ? 'Não deu para adicionar tudo.'
                    : 'As normas entraram; a Trilha, não.'}
                </strong>
              </p>
              {falhou.falhas.length > 0 && (
                <ul className="lista-simples">
                  {falhou.falhas.map((f) => (
                    <li key={f.id}>
                      {tituloDe.get(f.id) ?? f.id}: {f.motivo}
                    </li>
                  ))}
                </ul>
              )}
              {falhou.trilha && (
                <p>
                  Dá para montar a Trilha depois, na <Link to="/plano">Trilha</Link>.
                </p>
              )}
              {falhou.falhas.length > 0 && (
                <p>Precisa de internet só para adicionar. O que já entrou continua no aparelho.</p>
              )}
              {falhou.normaId && (
                <Link to={`/biblioteca/normas/${falhou.normaId}`} className="botao">
                  Ler o que já entrou
                </Link>
              )}
            </div>
          )}
          {presentes.length > 0 ? (
            <>
              {!andamento && !falhou && (
                <p className="dica">
                  {presentes.length === 1
                    ? 'A norma entra no aparelho e abre para ler.'
                    : `As ${String(presentes.length)} normas entram no aparelho e a primeira abre para ler.`}
                </p>
              )}
              {trilha && !trilhaMontada && (
                <label className="opcao comecar-trilha">
                  <input
                    type="checkbox"
                    checked={querTrilha}
                    disabled={andamento !== null}
                    onChange={(e) => {
                      setQuerTrilha(e.target.checked);
                    }}
                  />
                  <span>
                    <b>Montar também a Trilha</b>
                    <span className="dica">
                      {trilha.materias} matérias, {trilha.rotulo}. Dá para ajustar e desfazer
                      depois.
                    </span>
                  </span>
                </label>
              )}
              <button
                type="button"
                className="principal grande"
                disabled={andamento !== null}
                onClick={() => void adicionarELer()}
              >
                {falhou ? 'Tentar de novo' : 'Adicionar e ler'}
              </button>
            </>
          ) : (
            <p>Nenhuma dessas normas está no acervo ainda.</p>
          )}
          <Link to="/biblioteca/acervo" className="botao botao-texto comecar-acervo">
            Ver todo o acervo
          </Link>
          {faltam.length > 0 && (
            <p className="dica">
              Faltam no acervo: {lista.format(faltam.map((n) => n.titulo))}.{' '}
              <Link to="/biblioteca/importar">Importe do Planalto</Link> quando quiser.
            </p>
          )}
        </>
      )}
    </section>
  );
}
