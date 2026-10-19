// `/plano/ciclo/novo` (C3): uma pergunta por tela; no fim, a prévia com o "por quê" de cada peso.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  criarCiclo,
  gerarBlocos,
  pesosDoModelo,
  ROTULO_DO_MODELO,
  voltasPorSemana,
} from '../../../dominios/ciclos';
import { BarraFina } from '../../componentes/BarraFina';
import { Esqueleto } from '../../componentes/estados';
import { Voltar } from '../../componentes/Voltar';
import { useDados, useRepositorio } from '../../dados/contexto';
import { mensagem } from '../erros';
import { carregarCiclo } from './carregar';
import './estilos-ciclo.css';

const HORAS = [5, 10, 15, 20] as const;
const MINUTOS = [25, 40, 60] as const;
const MODELOS = ['equilibrado', 'reforco', 'reta_final', 'igual'] as const;
type ModeloEscolhido = (typeof MODELOS)[number];
const EXPLICA: Record<ModeloEscolhido, string> = {
  equilibrado: 'Mais vezes para as matérias com mais assuntos de peso no seu plano.',
  reforco: 'Equilibrado, e sobe a matéria em que você mais erra (precisa de questões feitas).',
  reta_final: 'Foca no que mais cai; o resto aparece só uma vez.',
  igual: 'Cada matéria uma vez por volta.',
};
const TOTAL = 4;

export function Assistente() {
  const repo = useRepositorio();
  const navegar = useNavigate();
  const { dados } = useDados(carregarCiclo);
  const [passo, setPasso] = useState(1);
  const [escolhidas, setEscolhidas] = useState<ReadonlySet<string> | null>(null);
  const [horas, setHoras] = useState<number>(10);
  const [minutos, setMinutos] = useState<number>(40);
  const [modelo, setModelo] = useState<ModeloEscolhido>('equilibrado');
  const [nome, setNome] = useState('Meu ciclo');
  const [erro, setErro] = useState<string | null>(null);
  const pergunta = useRef<HTMLHeadingElement>(null);
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    pergunta.current?.focus();
  }, [passo]);

  const materias = useMemo(() => {
    if (!dados) return [];
    const marcadas = escolhidas ?? new Set(dados.materias.map((m) => m.disciplinaId));
    return dados.materias.filter((m) => marcadas.has(m.disciplinaId));
  }, [dados, escolhidas]);
  const calculo = useMemo(() => pesosDoModelo(modelo, materias), [modelo, materias]);

  if (!dados) return <Esqueleto />;
  if (dados.materias.length === 0) {
    return (
      <>
        <Voltar para="/plano/ciclo">Ciclo</Voltar>
        <h1>Novo ciclo</h1>
        <p>Primeiro monte o plano com as suas matérias. Depois o ciclo sai dele.</p>
      </>
    );
  }
  const marcadas = escolhidas ?? new Set(dados.materias.map((m) => m.disciplinaId));
  const blocos = gerarBlocos(calculo.pesos, minutos);
  const voltas = voltasPorSemana(blocos, horas);
  const titulos = [
    'Quais matérias entram?',
    'Quanto você estuda por semana?',
    'Como distribuir as vezes?',
    'Confira e crie',
  ];
  const nomeDe = (id: string) => materias.find((m) => m.disciplinaId === id)?.nome ?? '';

  const criar = () => {
    setErro(null);
    criarCiclo(repo, { nome, modelo, pesos: calculo.pesos, minutos }).then(
      () => {
        void navegar('/plano/ciclo');
      },
      (x: unknown) => {
        setErro(mensagem(x));
      },
    );
  };

  return (
    <section className="ciclo-assistente" aria-labelledby="ciclo-pergunta">
      <Voltar para="/plano/ciclo">Ciclo</Voltar>
      <h1>Novo ciclo</h1>
      <BarraFina valor={passo} max={TOTAL} rotulo="Passo do ciclo" />
      <h2 id="ciclo-pergunta" ref={pergunta} tabIndex={-1}>
        {titulos[passo - 1]}
      </h2>

      {passo === 1 && (
        <ul className="lista-simples">
          {dados.materias.map((m) => (
            <li key={m.disciplinaId}>
              <label className="ciclo-opcao">
                <input
                  type="checkbox"
                  checked={marcadas.has(m.disciplinaId)}
                  onChange={(e) => {
                    const novo = new Set(marcadas);
                    if (e.target.checked) novo.add(m.disciplinaId);
                    else novo.delete(m.disciplinaId);
                    setEscolhidas(novo);
                  }}
                />
                {m.nome}
              </label>
            </li>
          ))}
        </ul>
      )}

      {passo === 2 && (
        <>
          <fieldset className="ciclo-grupo">
            <legend>Horas por semana</legend>
            {HORAS.map((h) => (
              <label key={h} className="ciclo-opcao">
                <input
                  type="radio"
                  name="horas"
                  checked={horas === h}
                  onChange={() => {
                    setHoras(h);
                  }}
                />
                {h} h
              </label>
            ))}
          </fieldset>
          <fieldset className="ciclo-grupo">
            <legend>Tamanho de cada bloco</legend>
            {MINUTOS.map((m) => (
              <label key={m} className="ciclo-opcao">
                <input
                  type="radio"
                  name="minutos"
                  checked={minutos === m}
                  onChange={() => {
                    setMinutos(m);
                  }}
                />
                {m} min
              </label>
            ))}
          </fieldset>
        </>
      )}

      {passo === 3 && (
        <fieldset className="ciclo-grupo">
          <legend className="visualmente-oculto">Modelo</legend>
          {MODELOS.map((m) => (
            <label key={m} className="ciclo-opcao ciclo-modelo">
              <input
                type="radio"
                name="modelo"
                checked={modelo === m}
                onChange={() => {
                  setModelo(m);
                }}
              />
              <span>
                {ROTULO_DO_MODELO[m]}
                <span className="dica">{EXPLICA[m]}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {passo === 4 && (
        <>
          <p className="dica">
            {blocos.length} blocos por volta, cerca de {voltas.toLocaleString('pt-BR')}{' '}
            {voltas === 1 ? 'volta' : 'voltas'} por semana.
          </p>
          {calculo.aviso && <p role="status">{calculo.aviso}</p>}
          <ul className="lista-simples">
            {calculo.pesos.map((p) => (
              <li key={p.disciplinaId}>
                <span>
                  {nomeDe(p.disciplinaId)}{' '}
                  <span className="dica">{p.peso === 1 ? '1 vez' : `${String(p.peso)} vezes`}</span>
                </span>
                {p.razao && <span className="dica">{p.razao}</span>}
              </li>
            ))}
          </ul>
          <div className="campo">
            <label htmlFor="ciclo-nome">Nome do ciclo</label>
            <input
              id="ciclo-nome"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
              }}
            />
          </div>
          {erro && (
            <p role="alert" className="erro">
              {erro}
            </p>
          )}
        </>
      )}

      <div className="linha-acao">
        {passo < TOTAL ? (
          <button
            type="button"
            className="principal"
            disabled={passo === 1 && marcadas.size === 0}
            onClick={() => {
              setPasso(passo + 1);
            }}
          >
            Continuar
          </button>
        ) : (
          <button type="button" className="principal" onClick={criar}>
            Criar ciclo
          </button>
        )}
        {passo > 1 && (
          <button
            type="button"
            className="botao-texto"
            onClick={() => {
              setPasso(passo - 1);
            }}
          >
            Voltar
          </button>
        )}
      </div>
    </section>
  );
}
