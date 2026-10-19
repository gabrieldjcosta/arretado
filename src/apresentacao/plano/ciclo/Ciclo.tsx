// `/plano/ciclo` (C3): o ciclo ativo (volta, bloco atual, pesos) e o assistente `novo`.
import { useState } from 'react';
import { Link, Route, Routes } from 'react-router';
import type { Ciclo as CicloGravado } from '../../../core/modelo';
import {
  ajustarPeso,
  ativarCiclo,
  desfazerUltimoAjuste,
  pularBloco,
  ultimoAjusteDesfazivel,
  PESO_MAX,
  PESO_MIN,
} from '../../../dominios/ciclos';
import { Esqueleto, Vazio } from '../../componentes/estados';
import { Voltar } from '../../componentes/Voltar';
import { useDados, useRepositorio } from '../../dados/contexto';
import { mensagem } from '../erros';
import { Assistente } from './Assistente';
import { carregarCiclo, type DadosDoCiclo } from './carregar';
import './estilos-ciclo.css';

const nomeDe = (dados: DadosDoCiclo, id: string) =>
  dados.disciplinas.find((d) => d.id === id)?.nome ?? 'Matéria removida';

function Pesos({ ciclo, dados }: { ciclo: CicloGravado; dados: DadosDoCiclo }) {
  const repo = useRepositorio();
  const [erro, setErro] = useState<string | null>(null);
  const mudar = (disciplinaId: string, novo: number) => {
    setErro(null);
    ajustarPeso(repo, ciclo.id, disciplinaId, novo, 'manual').catch((x: unknown) => {
      setErro(mensagem(x));
    });
  };
  return (
    <section aria-labelledby="ciclo-pesos">
      <h2 id="ciclo-pesos">Quantas vezes por volta</h2>
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}
      <ul className="lista-simples ciclo-pesos">
        {ciclo.pesos.map((p) => {
          const nome = nomeDe(dados, p.disciplinaId);
          return (
            <li key={p.disciplinaId}>
              <span>
                {nome}{' '}
                <span className="dica">{p.peso === 1 ? '1 vez' : `${String(p.peso)} vezes`}</span>
              </span>
              <span className="ciclo-passos">
                <button
                  type="button"
                  aria-label={`Menos uma vez de ${nome}`}
                  disabled={p.peso <= PESO_MIN}
                  onClick={() => {
                    mudar(p.disciplinaId, p.peso - 1);
                  }}
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label={`Mais uma vez de ${nome}`}
                  disabled={p.peso >= PESO_MAX}
                  onClick={() => {
                    mudar(p.disciplinaId, p.peso + 1);
                  }}
                >
                  +
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Sugestão de peso pelo desempenho: nunca aplica sozinha, e o último ajuste volta com um toque. */
function Ajustes({ ciclo, dados }: { ciclo: CicloGravado; dados: DadosDoCiclo }) {
  const repo = useRepositorio();
  const [adiadas, setAdiadas] = useState<readonly string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const visiveis = dados.sugestoes.filter((x) => !adiadas.includes(x.disciplinaId));
  const desfazivel = ultimoAjusteDesfazivel(ciclo);
  const rodar = (promessa: Promise<unknown>) => {
    setErro(null);
    promessa.catch((x: unknown) => {
      setErro(mensagem(x));
    });
  };
  if (visiveis.length === 0 && !desfazivel) return null;
  return (
    <section aria-labelledby="ciclo-ajustes" className="cartao-bloco">
      <h2 id="ciclo-ajustes">Ajuste pelo seu desempenho</h2>
      <p className="dica">Sugestão sua para o ciclo, não um cartão de revisão. Você decide.</p>
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}
      <ul className="lista-simples">
        {visiveis.map((x) => (
          <li key={x.disciplinaId}>
            <span>
              {x.razao}{' '}
              <span className="dica">
                {x.para > x.de ? 'Sobe' : 'Desce'} de {x.de} para {x.para}{' '}
                {x.para === 1 ? 'vez' : 'vezes'} por volta.
              </span>
            </span>
            <span className="ciclo-passos">
              <button
                type="button"
                className="principal"
                onClick={() => {
                  rodar(ajustarPeso(repo, ciclo.id, x.disciplinaId, x.para, 'erro', x.razao));
                }}
              >
                Aceitar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdiadas([...adiadas, x.disciplinaId]);
                }}
              >
                Agora não
              </button>
            </span>
          </li>
        ))}
      </ul>
      {desfazivel && (
        <p>
          Último ajuste: {nomeDe(dados, desfazivel.disciplinaId)}, de {desfazivel.antes} para{' '}
          {desfazivel.depois}.{' '}
          <button
            type="button"
            className="botao-texto"
            onClick={() => {
              rodar(desfazerUltimoAjuste(repo, ciclo.id));
            }}
          >
            Desfazer
          </button>
        </p>
      )}
    </section>
  );
}

function Volta({ ciclo, dados }: { ciclo: CicloGravado; dados: DadosDoCiclo }) {
  const repo = useRepositorio();
  const atual = dados.posicao?.indice ?? 0;
  return (
    <section aria-labelledby="ciclo-volta">
      <h2 id="ciclo-volta">Volta {dados.posicao?.volta ?? 1}</h2>
      <ol className="ciclo-volta">
        {ciclo.blocos.map((b, i) => (
          <li
            key={`${String(i)}-${b.disciplinaId}`}
            aria-current={i === atual ? 'step' : undefined}
            className={i === atual ? 'ciclo-atual' : i < atual ? 'ciclo-feito' : undefined}
          >
            <span>{nomeDe(dados, b.disciplinaId)}</span>
            <span className="dica">
              {b.minutos} min{i < atual ? ' · feito' : ''}
            </span>
          </li>
        ))}
      </ol>
      <div className="linha-acao">
        <Link
          className="botao principal"
          to={`/sessao/iniciar?tipo=ciclo&id=${ciclo.id}&ciclo=${ciclo.id}&bloco=${String(atual)}&rotulo=${encodeURIComponent(nomeDe(dados, ciclo.blocos[atual]?.disciplinaId ?? ''))}&origem=ciclo`}
        >
          Começar este bloco
        </Link>
        <button
          type="button"
          className="botao-texto"
          onClick={() => {
            pularBloco(repo, ciclo.id).catch(() => undefined);
          }}
        >
          Pular este bloco
        </button>
      </div>
    </section>
  );
}

function Visao() {
  const repo = useRepositorio();
  const { dados } = useDados(carregarCiclo);
  if (!dados) return <Esqueleto />;
  const { ativo } = dados;
  return (
    <>
      <Voltar para="/plano">Trilha</Voltar>
      <h1>Ciclo de estudo</h1>
      {ativo ? (
        <>
          <p className="dica">{ativo.nome}</p>
          <Volta ciclo={ativo} dados={dados} />
          <Ajustes ciclo={ativo} dados={dados} />
          <Pesos ciclo={ativo} dados={dados} />
          <Link to="/plano/ciclo/novo" className="botao botao-texto na-margem">
            Criar outro ciclo
          </Link>
        </>
      ) : (
        <Vazio
          titulo="Um ciclo põe suas matérias numa ordem que se repete"
          acao={
            <Link to="/plano/ciclo/novo" className="botao principal">
              Criar ciclo
            </Link>
          }
        >
          <p>Você escolhe as matérias; o Arretado monta a volta e mostra o bloco da vez.</p>
        </Vazio>
      )}
      {dados.outros.length > 0 && (
        <section aria-labelledby="ciclo-salvos">
          <h2 id="ciclo-salvos">Ciclos salvos</h2>
          <ul className="lista-simples">
            {dados.outros.map((c) => (
              <li key={c.id}>
                <span>{c.nome}</span>
                <button
                  type="button"
                  className="botao-texto"
                  onClick={() => {
                    ativarCiclo(repo, c.id).catch(() => undefined);
                  }}
                >
                  Usar este
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function CicloDeEstudo() {
  return (
    <Routes>
      <Route index element={<Visao />} />
      <Route path="novo" element={<Assistente />} />
    </Routes>
  );
}
