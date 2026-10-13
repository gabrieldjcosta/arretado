// Correção do texto da norma publicada (F2, 11.7): o formulário nas ações do dispositivo, o texto
// de antes (a versão anterior fica consultável) e o aviso com "Desfazer a correção" no leitor.
import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import {
  corrigirTextoPublicado,
  CorrecaoRecusada,
  MAXIMO_DO_TEXTO,
  textoLimpo,
  textosAnteriores,
  voltarParaVersao,
  type ResultadoDaCorrecao,
  type TextoDeAntes,
} from '../../dominios/legislacao/correcao';
import { useRepositorio } from '../dados/contexto';

/** Onde a correção grava: a norma e a versão que o leitor mostra; `aoCorrigir` recarrega. */
export interface CorrecaoNoLeitor {
  normaId: string;
  versaoId: string;
  aoCorrigir: (resultado: ResultadoDaCorrecao, dispositivoId: string) => void;
}

const mensagemDe = (e: unknown): string =>
  e instanceof CorrecaoRecusada
    ? e.message
    : 'Não foi possível gravar a correção. Tente de novo; nada foi perdido.';

const DATA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function FormularioDaCorrecao({
  correcao,
  dispositivoId,
  textoAtual,
  voltar,
}: {
  correcao: CorrecaoNoLeitor;
  dispositivoId: string;
  textoAtual: string;
  voltar: () => void;
}) {
  const repo = useRepositorio();
  const [texto, setTexto] = useState(textoAtual);
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState('');
  const trava = useRef(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const dica = useId();

  useEffect(() => {
    campo.current?.focus();
  }, []);

  const limpo = textoLimpo(texto);
  const pronto = limpo !== '' && limpo !== textoLimpo(textoAtual);

  async function salvar(e: SubmitEvent) {
    e.preventDefault();
    if (!pronto || trava.current) return;
    trava.current = true;
    setSalvando(true);
    setFalha('');
    try {
      const r = await corrigirTextoPublicado(repo, correcao.normaId, correcao.versaoId, [
        { dispositivoId, texto },
      ]);
      correcao.aoCorrigir(r, dispositivoId);
    } catch (excecao) {
      trava.current = false;
      setFalha(mensagemDe(excecao));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={(e) => void salvar(e)} className="correcao-do-texto">
      <div className="campo">
        <label htmlFor="texto-corrigido">Texto do dispositivo</label>
        <textarea
          id="texto-corrigido"
          ref={campo}
          rows={6}
          maxLength={MAXIMO_DO_TEXTO}
          aria-describedby={dica}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
          }}
        />
      </div>
      <p id={dica} className="dica">
        O texto de antes fica guardado e dá para desfazer. Estrela, erros e “lido até” continuam
        aqui. Grifo que perder o trecho vai para “Para reler”.
      </p>
      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
      <div className="linha-acoes">
        <button type="submit" className="principal" disabled={!pronto || salvando}>
          {salvando ? 'Salvando…' : 'Salvar correção'}
        </button>
        <button type="button" onClick={voltar}>
          Voltar
        </button>
      </div>
    </form>
  );
}

/** Os textos anteriores do dispositivo, com "Voltar a este texto". Nada aparece sem histórico. */
export function TextosDeAntes({
  correcao,
  dispositivoId,
}: {
  correcao: CorrecaoNoLeitor;
  dispositivoId: string;
}) {
  const repo = useRepositorio();
  const [lista, setLista] = useState<TextoDeAntes[]>([]);
  const [falha, setFalha] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const titulo = useId();

  useEffect(() => {
    let ativo = true;
    textosAnteriores(repo, correcao.normaId, dispositivoId).then(
      (l) => {
        if (ativo) setLista(l);
      },
      () => {
        // O histórico é consulta: sem ele, as ações continuam.
      },
    );
    return () => {
      ativo = false;
    };
  }, [repo, correcao.normaId, dispositivoId]);

  if (lista.length === 0) return null;

  async function voltarA(versaoAlvoId: string) {
    if (ocupado) return;
    setOcupado(true);
    setFalha('');
    try {
      const r = await voltarParaVersao(repo, correcao.normaId, correcao.versaoId, versaoAlvoId, [
        dispositivoId,
      ]);
      correcao.aoCorrigir(r, dispositivoId);
    } catch (excecao) {
      setFalha(mensagemDe(excecao));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section aria-labelledby={titulo}>
      <h3 id={titulo}>Texto de antes</h3>
      <ul className="lista-simples textos-de-antes">
        {lista.map((t) => (
          <li key={t.versaoId}>
            <p className="dica">Até {DATA.format(new Date(t.substituidoEm))}</p>
            <p className="texto-de-antes">{t.texto}</p>
            <button type="button" disabled={ocupado} onClick={() => void voltarA(t.versaoId)}>
              Voltar a este texto
            </button>
          </li>
        ))}
      </ul>
      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
    </section>
  );
}

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

/** O que a correção fez, no alto do leitor, com "Desfazer a correção". */
export function AvisoDaCorrecao({
  resultado,
  desfeita,
  aoDesfazer,
  aoFechar,
}: {
  resultado: ResultadoDaCorrecao;
  desfeita: boolean;
  aoDesfazer: (r: ResultadoDaCorrecao) => void;
  aoFechar: () => void;
}) {
  const repo = useRepositorio();
  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState('');
  const anterior = resultado.versaoAnteriorId;

  async function desfazer() {
    if (ocupado || anterior === undefined) return;
    setOcupado(true);
    setFalha('');
    try {
      aoDesfazer(
        await voltarParaVersao(
          repo,
          resultado.normaId,
          resultado.versaoId,
          anterior,
          resultado.alterados,
        ),
      );
    } catch (excecao) {
      setFalha(mensagemDe(excecao));
      setOcupado(false);
    }
  }

  const partes: string[] = [];
  if (resultado.reancoradas > 0)
    partes.push(
      `${plural(resultado.reancoradas, 'grifo ou nota mudou', 'grifos ou notas mudaram')} de lugar com o texto.`,
    );
  if (resultado.recuperadas > 0)
    partes.push(
      `${plural(resultado.recuperadas, 'grifo ou nota voltou', 'grifos ou notas voltaram')} ao texto.`,
    );
  if (resultado.pendentes > 0)
    partes.push(
      `${plural(resultado.pendentes, 'grifo ou nota ficou', 'grifos ou notas ficaram')} em “Para reler”.`,
    );

  return (
    <section className="aviso aviso-da-correcao" aria-label="Correção do texto">
      <p role="status">
        {resultado.estado === 'sem_mudanca'
          ? 'Nada mudou: o texto já era este.'
          : desfeita
            ? 'Correção desfeita.'
            : 'Texto corrigido. O texto de antes ficou guardado.'}
        {partes.length > 0 && ` ${partes.join(' ')}`}
      </p>
      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
      <div className="linha-acoes">
        {!desfeita && resultado.estado !== 'sem_mudanca' && anterior !== undefined && (
          <button type="button" disabled={ocupado} onClick={() => void desfazer()}>
            Desfazer a correção
          </button>
        )}
        <button type="button" className="discreto" onClick={aoFechar}>
          Fechar aviso
        </button>
      </div>
    </section>
  );
}
