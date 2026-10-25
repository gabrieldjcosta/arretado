import { useEffect, useRef, useState } from 'react';
import type { PendenciaDeReleitura } from '../../core/modelo';
import { diffPorPalavra, type TrechoDoDiff } from '../../dominios/acervo/diff-palavras';
import {
  atualizarTextoDaFrase,
  type ItemAfetado,
  type MudancaDeDispositivo,
  type TipoAfetado,
} from '../../dominios/acervo/mudancas';
import { resolverPendencia } from '../../dominios/acervo/pendencias';
import { useRepositorio } from '../dados/contexto';
import './estilos-acervo.css';

const ROTULO: Record<TipoAfetado, string> = {
  frase: 'Frase',
  cartao: 'Cartão',
  estrela: 'Estrela',
  erro: 'Erro',
};

const nome = (p: PendenciaDeReleitura, m: MudancaDeDispositivo | undefined) =>
  m?.rotulo ?? p.rotulo ?? m?.endereco ?? p.enderecoAntigo;

/** O texto com o que mudou marcado: `del` no que saiu (antes) e `b` no que entrou (agora). */
function Marcado({ trechos, lado }: { trechos: TrechoDoDiff[]; lado: 'antes' | 'agora' }) {
  const marca = lado === 'antes' ? 'sai' : 'entra';
  return trechos
    .filter((t) => t.tipo === 'igual' || t.tipo === marca)
    .map((t, k) =>
      t.tipo === 'igual' ? (
        <span key={k}>{t.texto}</span>
      ) : lado === 'antes' ? (
        <del key={k}>{t.texto}</del>
      ) : (
        <b key={k}>{t.texto}</b>
      ),
    );
}

/**
 * "A lei mudou" (AP-05): o texto de um dispositivo mudou no mesmo endereço e a pessoa guardou algo
 * sobre ele. Só o primeiro vem aberto; os outros ficam numa linha com "Ver". Mostra o de antes e o
 * de agora com o que mudou marcado; "Já reli" resolve o aviso e "Atualizar minha Frase" é ação da
 * pessoa (o app nunca troca o texto dela em silêncio).
 */
export function LeiMudou({
  pendencias,
  mudancas,
  aoMudar,
}: {
  pendencias: PendenciaDeReleitura[];
  mudancas: MudancaDeDispositivo[];
  aoMudar: () => void;
}) {
  const repo = useRepositorio();
  const [editando, setEditando] = useState<{ id: string; texto: string }>();
  const [falha, setFalha] = useState<string>();
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(
    () => new Set(pendencias[0] ? [pendencias[0].id] : []),
  );
  const titulo = useRef<HTMLHeadingElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const aoFechar = useRef<string | null>(null);
  const editar = editando?.id;

  useEffect(() => {
    if (editar !== undefined) campo.current?.focus();
  }, [editar]);
  useEffect(() => {
    if (aoFechar.current === null) return;
    const alvo = document.getElementById(aoFechar.current);
    if (alvo) {
      alvo.focus();
      aoFechar.current = null;
    }
  });

  const porDispositivo = new Map(mudancas.map((m) => [m.dispositivoId, m]));
  const lista = pendencias.map((p) => ({ p, m: porDispositivo.get(p.referenciaId ?? '') }));
  if (lista.length === 0) return null;

  const guardar = (fraseId: string) => {
    if (!editando) return;
    setFalha(undefined);
    atualizarTextoDaFrase(repo, editando.id, editando.texto).then(
      () => {
        aoFechar.current = `editar-${fraseId}`;
        setEditando(undefined);
        aoMudar();
      },
      () => {
        setFalha(fraseId);
      },
    );
  };

  const item = (a: ItemAfetado) => (
    <li key={`${a.tipo}-${a.id}`}>
      {ROTULO[a.tipo]}
      {a.tipo === 'estrela' ? '' : `: ${a.titulo}`}{' '}
      {a.tipo === 'frase' && editando?.id !== a.id && (
        <button
          id={`editar-${a.id}`}
          type="button"
          className="botao-texto"
          aria-label={`Atualizar minha Frase: ${a.titulo}`}
          onClick={() => {
            setEditando({ id: a.id, texto: a.titulo });
          }}
        >
          Atualizar minha Frase
        </button>
      )}
      {a.tipo === 'frase' && editando?.id === a.id && (
        <span className="campo">
          <label htmlFor={`frase-${a.id}`}>Sua Frase</label>
          <textarea
            ref={campo}
            id={`frase-${a.id}`}
            value={editando.texto}
            maxLength={2000}
            onChange={(e) => {
              setEditando({ id: a.id, texto: e.target.value });
            }}
          />
          <button
            type="button"
            disabled={editando.texto.trim() === ''}
            onClick={() => {
              guardar(a.id);
            }}
          >
            Guardar a Frase
          </button>{' '}
          <button
            type="button"
            className="botao-texto"
            onClick={() => {
              aoFechar.current = `editar-${a.id}`;
              setEditando(undefined);
            }}
          >
            Deixar como está
          </button>
          {falha === a.id && (
            <span role="alert" className="aviso falha">
              Não foi possível guardar a Frase. Nada foi alterado.
            </span>
          )}
        </span>
      )}
    </li>
  );

  return (
    <section className="aviso lei-mudou" aria-label="A lei mudou">
      <h2 id="lei-mudou-titulo" ref={titulo} tabIndex={-1}>
        A lei mudou
      </h2>
      <p>O texto destes dispositivos mudou. Veja o que você guardou sobre eles.</p>
      <ul className="lei-mudou-lista">
        {lista.map(({ p, m }) => {
          const aberto = abertos.has(p.id) || m === undefined;
          return (
            <li key={p.id}>
              <div className="lei-mudou-linha">
                <h3>{nome(p, m)}</h3>
                {m !== undefined && (
                  <button
                    type="button"
                    className="botao-texto"
                    aria-expanded={aberto}
                    aria-label={`${aberto ? 'Recolher' : 'Ver'} ${nome(p, m)}`}
                    onClick={() => {
                      setAbertos((antes) => {
                        const depois = new Set(antes);
                        if (depois.has(p.id)) depois.delete(p.id);
                        else depois.add(p.id);
                        return depois;
                      });
                    }}
                  >
                    {aberto ? 'Recolher' : 'Ver'}
                  </button>
                )}
              </div>
              {aberto && (
                <>
                  {m && (
                    <>
                      <TextosDoDiff antes={m.antes} agora={m.agora} />
                      <p>Você guardou:</p>
                      <ul className="lei-mudou-guardado">{m.afetados.map(item)}</ul>
                    </>
                  )}
                  <button
                    type="button"
                    aria-label={`Já reli ${nome(p, m)}`}
                    onClick={() => {
                      aoFechar.current = titulo.current ? 'lei-mudou-titulo' : null;
                      void resolverPendencia(repo, p.id).then(aoMudar);
                    }}
                  >
                    Já reli
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TextosDoDiff({ antes, agora }: { antes: string; agora: string }) {
  const trechos = diffPorPalavra(antes, agora);
  return (
    <>
      <p>
        <strong>Antes:</strong> <Marcado trechos={trechos} lado="antes" />
      </p>
      <p>
        <strong>Agora:</strong> <Marcado trechos={trechos} lado="agora" />
      </p>
    </>
  );
}
