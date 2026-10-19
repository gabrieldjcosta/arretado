// "Para lembrar" do Hoje (P7b; D-D5, resposta 6): uma nota livre sobre o que fazer fora do app. Não é
// a Frase correta (essa entra pelo "+"). Fica em `Preferencias.lembrete`: "Salvar" grava, sair do campo
// também (o que se escreve e não se salva não some ao tocar em "Começar"), e esvaziar o campo apaga.
// Sem data, hora nem aviso; fora do Recall e do cálculo do Agora. Acima do campo ficam as notas que a
// pessoa guardou no Estacionamento da Sessão (as mais recentes ainda por resolver), cada uma com uma caixa.
import { useCallback, useId, useRef, useState, type SubmitEvent } from 'react';
import { LEMBRETE_MAX } from '../../core/modelo';
import { alterarPreferencias, obterPreferencias } from '../../core/preferencias';
import type { Repositorio } from '../../core/persistencia';
import {
  chaveDeNota,
  notasParaLembrar,
  resolverNota,
  type EnderecoDeNota,
} from '../../dominios/sessao/estacionamento';
import { useDados, useRepositorio } from '../dados/contexto';
import './estilos-hoje.css';

/** Daqui até o teto o campo mostra quantos caracteres já tem: colar mais que o teto corta sem dizer. */
const AVISO_DO_TETO = LEMBRETE_MAX - 50;

/**
 * As notas do Estacionamento ainda por resolver, de todas as Sessões; a caixa chama `resolverNota`.
 * A nota que a pessoa toca continua na lista, marcada ou não, até ela sair do Hoje: dá para desfazer.
 */
function NotasDasSessoes() {
  const repo = useRepositorio();
  const [tocadas, setTocadas] = useState<readonly EnderecoDeNota[]>([]);
  const [falhou, setFalhou] = useState(false);
  const carregar = useCallback((r: Repositorio) => notasParaLembrar(r, tocadas), [tocadas]);
  const { dados: notas } = useDados(carregar);
  if (!notas?.length) return null;
  return (
    <>
      <ul className="para-lembrar-notas" aria-label="Guardado nas Sessões">
        {notas.map((n) => (
          <li key={chaveDeNota(n)}>
            <label className="opcao">
              <input
                type="checkbox"
                checked={Boolean(n.resolvidaEm)}
                onChange={(e) => {
                  setFalhou(false);
                  setTocadas((t) =>
                    t.some((x) => chaveDeNota(x) === chaveDeNota(n)) ? t : [...t, n],
                  );
                  resolverNota(repo, n.sessaoId, n.indice, e.target.checked).catch(() => {
                    setFalhou(true);
                  });
                }}
              />
              <span>{n.texto}</span>
            </label>
          </li>
        ))}
      </ul>
      {falhou && (
        <p role="alert" className="aviso falha">
          Problema ao marcar. Tente de novo.
        </p>
      )}
    </>
  );
}

/** O campo parte do que está salvo ao abrir o Hoje e, daí em diante, vale o que a pessoa escreve. */
function Campo({ inicial }: { inicial: string }) {
  const repo = useRepositorio();
  const titulo = useId();
  const contador = useId();
  const gravando = useRef(false);
  const [guardado, setGuardado] = useState(inicial);
  const [texto, setTexto] = useState(inicial);
  const [salvo, setSalvo] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const mudou = texto.trim() !== guardado;
  const perto = texto.length >= AVISO_DO_TETO;

  async function salvar(e?: SubmitEvent) {
    e?.preventDefault();
    // Sair do campo clicando em "Salvar" chama isto duas vezes; a segunda não grava de novo.
    if (gravando.current) return;
    gravando.current = true;
    const novo = texto.trim();
    setFalhou(false);
    try {
      if (novo !== guardado) await alterarPreferencias(repo, { lembrete: novo });
      setGuardado(novo);
      // Se a pessoa escreveu mais enquanto gravava, o que ela escreveu fica.
      setTexto((atual) => (atual === texto ? novo : atual));
      setSalvo(true);
    } catch {
      setFalhou(true);
    } finally {
      gravando.current = false;
    }
  }

  return (
    <section className="para-lembrar" aria-labelledby={titulo}>
      <h2 id={titulo} className="para-lembrar-titulo">
        Para lembrar
      </h2>
      <NotasDasSessoes />
      <form
        onSubmit={(e) => {
          void salvar(e);
        }}
      >
        <textarea
          aria-labelledby={titulo}
          aria-describedby={perto ? contador : undefined}
          rows={3}
          maxLength={LEMBRETE_MAX}
          placeholder="O que fazer fora do app"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setSalvo(false);
          }}
          onBlur={() => {
            if (mudou) void salvar();
          }}
        />
        <div className="linha-acoes">
          <button type="submit">Salvar</button>
          <p role="status" className="dica para-lembrar-estado">
            {mudou ? 'Ainda não salvo.' : salvo ? 'Salvo.' : ''}
          </p>
          {perto && (
            <p id={contador} className="dica para-lembrar-contador">
              {texto.length}/{LEMBRETE_MAX}
            </p>
          )}
        </div>
        {falhou && (
          <p role="alert" className="aviso falha">
            Problema ao salvar. O que você escreveu continua aqui; tente de novo.
          </p>
        )}
      </form>
    </section>
  );
}

export function ParaLembrar() {
  const { dados } = useDados(useCallback((r) => obterPreferencias(r), []));
  return dados ? <Campo inicial={dados.lembrete ?? ''} /> : null;
}
