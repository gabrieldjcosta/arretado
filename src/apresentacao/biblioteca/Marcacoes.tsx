// Grifos e notas no leitor (F2, 11.4): as ações do grupo fixo enquanto há trecho selecionado (ou
// grifo escolhido) e o diálogo da nota. O estado das marcações fica em `usarMarcacoes.ts`.
import { useRef, useState, type SyntheticEvent } from 'react';
import { CORES_DO_GRIFO, type CorDoGrifo } from '../../dominios/legislacao/marcacoes';
import { Dialogo } from '../componentes/Dialogo';

/** O texto da âncora no diálogo: até aqui, com reticências. */
const CITACAO_MAXIMA = 240;
/** O teto do texto da Frase (modelo). */
const TEXTO_MAXIMO_DA_FRASE = 2_000;

/**
 * As ações do grupo fixo enquanto há trecho selecionado: as 3 cores do grifo (sem nomes) e a nota.
 * Ficam no lugar de "Buscar", "Modo foco" e "Lido até aqui", no mesmo canto, nos dois modos.
 */
export function AcoesDaSelecao({
  cortadaEm,
  grifar,
  anotar,
  enviarAsFrases,
  cancelar,
}: {
  /** A seleção passava do dispositivo: a referência dele, onde a marcação fica. */
  cortadaEm: string | undefined;
  grifar: (cor: CorDoGrifo) => void;
  anotar: () => void;
  enviarAsFrases: () => void;
  cancelar: () => void;
}) {
  return (
    <div role="group" aria-label="Marcar o trecho selecionado" className="acoes-marcacao">
      {cortadaEm && (
        <p className="aviso-da-selecao">
          <span>Só no {cortadaEm}</span>
        </p>
      )}
      {CORES_DO_GRIFO.map((cor) => (
        <button
          key={cor}
          type="button"
          className={`cor-do-grifo grifo-${String(cor)}`}
          aria-label={`Grifar com a cor ${String(cor)}`}
          onClick={() => {
            grifar(cor);
          }}
        >
          {cor}
        </button>
      ))}
      <button type="button" onClick={anotar}>
        Nota
      </button>
      <button type="button" onClick={enviarAsFrases}>
        Enviar às frases
      </button>
      <button type="button" aria-label="Cancelar a marcação" onClick={cancelar}>
        ✕
      </button>
    </div>
  );
}

/** As ações do grifo escolhido (tocado no texto): trocar a cor, anotar o mesmo trecho, tirar. */
export function AcoesDoGrifo({
  cor,
  mudar,
  anotar,
  tirar,
  fechar,
}: {
  cor: number;
  mudar: (cor: CorDoGrifo) => void;
  anotar: () => void;
  tirar: () => void;
  fechar: () => void;
}) {
  return (
    <div role="group" aria-label="Grifo escolhido" className="acoes-marcacao">
      {CORES_DO_GRIFO.map((c) => (
        <button
          key={c}
          type="button"
          className={`cor-do-grifo grifo-${String(c)}`}
          aria-label={`Cor ${String(c)}`}
          aria-pressed={c === cor}
          onClick={() => {
            mudar(c);
          }}
        >
          {c}
        </button>
      ))}
      <button type="button" onClick={anotar}>
        Nota
      </button>
      <button type="button" aria-label="Tirar o grifo" onClick={tirar}>
        Tirar
      </button>
      <button type="button" aria-label="Fechar as ações do grifo" onClick={fechar}>
        ✕
      </button>
    </div>
  );
}

const citacao = (texto: string) =>
  texto.length > CITACAO_MAXIMA ? `${texto.slice(0, CITACAO_MAXIMA).trimEnd()}…` : texto;

/**
 * A nota: nova (o campo aberto) ou existente (o texto, com "Editar" e "Tirar a nota"). Num diálogo
 * modal: abre por cima do texto, sem rolar a página, e a posição de leitura fica onde estava.
 */
export function DialogoDaNota({
  aberto,
  trecho,
  nota,
  guardar,
  tirar,
  fechar,
}: {
  aberto: boolean;
  /** O texto anotado. */
  trecho: string;
  /** O texto da nota existente; sem ele, nota nova. */
  nota: string | undefined;
  guardar: (texto: string) => Promise<boolean>;
  tirar: () => Promise<boolean>;
  fechar: () => void;
}) {
  return (
    <Dialogo aberto={aberto} aoFechar={fechar} titulo="Nota" classe="dialogo-nota">
      <ConteudoDaNota
        key={nota ?? ''}
        trecho={trecho}
        nota={nota}
        guardar={guardar}
        tirar={tirar}
        fechar={fechar}
      />
    </Dialogo>
  );
}

function ConteudoDaNota({
  trecho,
  nota,
  guardar,
  tirar,
  fechar,
}: {
  trecho: string;
  nota: string | undefined;
  guardar: (texto: string) => Promise<boolean>;
  tirar: () => Promise<boolean>;
  fechar: () => void;
}) {
  const [editando, setEditando] = useState(nota === undefined);
  const [texto, setTexto] = useState(nota ?? '');
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function aoGuardar(e: SyntheticEvent) {
    e.preventDefault();
    if (!texto.trim() || ocupado) return;
    setOcupado(true);
    const deu = await guardar(texto);
    setOcupado(false);
    if (deu) fechar();
  }

  return (
    <>
      <blockquote className="trecho-da-nota">{citacao(trecho)}</blockquote>
      {editando ? (
        <form
          onSubmit={(e) => {
            void aoGuardar(e);
          }}
        >
          <label className="campo-da-nota">
            Texto da nota
            <textarea
              value={texto}
              rows={4}
              // A nota nova abre já para escrever; a existente só ao tocar em "Editar".
              autoFocus
              onChange={(e) => {
                setTexto(e.target.value);
              }}
            />
          </label>
          <div className="linha-acoes">
            <button type="submit" className="principal" disabled={!texto.trim() || ocupado}>
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                if (nota === undefined) fechar();
                else {
                  setTexto(nota);
                  setEditando(false);
                }
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="texto-da-nota">{nota}</p>
          <div className="linha-acoes">
            {confirmando ? (
              <>
                <button
                  type="button"
                  className="perigoso"
                  disabled={ocupado}
                  onClick={() => {
                    setOcupado(true);
                    void tirar().then((deu) => {
                      setOcupado(false);
                      if (deu) fechar();
                    });
                  }}
                >
                  Tirar mesmo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmando(false);
                  }}
                >
                  Manter
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditando(true);
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmando(true);
                  }}
                >
                  Tirar a nota
                </button>
                <button type="button" onClick={fechar}>
                  Fechar
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

/**
 * "Enviar às frases" (Frases 3): o trecho selecionado vira o texto de uma Frase, que a pessoa pode
 * encurtar ou reescrever. O link de volta (dispositivo + intervalo) vai junto; só o texto da frase
 * é obrigatório (D25).
 */
export function DialogoEnviarAsFrases({
  aberto,
  trecho,
  enviar,
  fechar,
}: {
  aberto: boolean;
  /** O texto selecionado, que abre o campo. */
  trecho: string;
  enviar: (texto: string) => Promise<boolean>;
  fechar: () => void;
}) {
  return (
    <Dialogo aberto={aberto} aoFechar={fechar} titulo="Enviar às frases" classe="dialogo-nota">
      <ConteudoDoEnvio key={trecho} trecho={trecho} enviar={enviar} fechar={fechar} />
    </Dialogo>
  );
}

function ConteudoDoEnvio({
  trecho,
  enviar,
  fechar,
}: {
  trecho: string;
  enviar: (texto: string) => Promise<boolean>;
  fechar: () => void;
}) {
  const [texto, setTexto] = useState(trecho.slice(0, TEXTO_MAXIMO_DA_FRASE));
  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState(false);
  const trava = useRef(false);

  async function aoEnviar(e: SyntheticEvent) {
    e.preventDefault();
    if (!texto.trim() || trava.current) return;
    trava.current = true;
    setOcupado(true);
    setFalha(false);
    const deu = await enviar(texto);
    setOcupado(false);
    if (deu) fechar();
    else {
      trava.current = false;
      setFalha(true);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        void aoEnviar(e);
      }}
    >
      <label className="campo-da-nota">
        Frase
        <textarea
          value={texto}
          rows={4}
          maxLength={TEXTO_MAXIMO_DA_FRASE}
          autoFocus
          onChange={(e) => {
            setTexto(e.target.value);
          }}
        />
      </label>
      {falha && (
        <p role="alert" className="aviso falha">
          Não foi possível enviar. Tente de novo; nada foi perdido.
        </p>
      )}
      <div className="linha-acoes">
        <button type="submit" className="principal" disabled={!texto.trim() || ocupado}>
          Enviar
        </button>
        <button type="button" onClick={fechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
