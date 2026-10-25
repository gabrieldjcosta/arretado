import { useState } from 'react';
import type { PendenciaDeReleitura } from '../../core/modelo';
import {
  atualizarTextoDaFrase,
  type ItemAfetado,
  type MudancaDeDispositivo,
  type TipoAfetado,
} from '../../dominios/acervo/mudancas';
import { resolverPendencia } from '../../dominios/acervo/pendencias';
import { useRepositorio } from '../dados/contexto';

const ROTULO: Record<TipoAfetado, string> = {
  frase: 'Frase',
  cartao: 'Cartão',
  estrela: 'Estrela',
  erro: 'Erro',
};

const nome = (p: PendenciaDeReleitura, m: MudancaDeDispositivo | undefined) =>
  m?.rotulo ?? p.rotulo ?? m?.endereco ?? p.enderecoAntigo;

/**
 * "A lei mudou" (AP-05): o texto de um dispositivo mudou no mesmo endereço e a pessoa guardou algo
 * sobre ele. Mostra o de antes e o de agora; "Já reli" resolve o aviso e "Atualizar minha Frase" é
 * ação da pessoa (o app nunca troca o texto dela em silêncio).
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
  const [falha, setFalha] = useState(false);
  const porDispositivo = new Map(mudancas.map((m) => [m.dispositivoId, m]));
  const lista = pendencias.map((p) => ({ p, m: porDispositivo.get(p.referenciaId ?? '') }));
  if (lista.length === 0) return null;

  const guardar = () => {
    if (!editando) return;
    setFalha(false);
    atualizarTextoDaFrase(repo, editando.id, editando.texto).then(
      () => {
        setEditando(undefined);
        aoMudar();
      },
      () => {
        setFalha(true);
      },
    );
  };

  const item = (a: ItemAfetado) => (
    <li key={`${a.tipo}-${a.id}`}>
      {ROTULO[a.tipo]}
      {a.tipo === 'estrela' ? '' : `: ${a.titulo}`}{' '}
      {a.tipo === 'frase' && editando?.id !== a.id && (
        <button
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
            id={`frase-${a.id}`}
            value={editando.texto}
            onChange={(e) => {
              setEditando({ id: a.id, texto: e.target.value });
            }}
          />
          <button type="button" disabled={editando.texto.trim() === ''} onClick={guardar}>
            Guardar a Frase
          </button>{' '}
          <button
            type="button"
            className="botao-texto"
            onClick={() => {
              setEditando(undefined);
            }}
          >
            Deixar como está
          </button>
        </span>
      )}
    </li>
  );

  return (
    <section className="aviso" aria-label="A lei mudou">
      <h2>A lei mudou</h2>
      <p>O texto destes dispositivos mudou. Veja o que você guardou sobre eles.</p>
      <ul className="lista-simples">
        {lista.map(({ p, m }) => (
          <li key={p.id}>
            <h3>{nome(p, m)}</h3>
            {m && (
              <>
                <p>
                  <strong>Antes:</strong> {m.antes}
                </p>
                <p>
                  <strong>Agora:</strong> {m.agora}
                </p>
                <p>Você guardou:</p>
                <ul className="lista-simples">{m.afetados.map(item)}</ul>
              </>
            )}
            <button
              type="button"
              aria-label={`Já reli ${nome(p, m)}`}
              onClick={() => {
                void resolverPendencia(repo, p.id).then(aoMudar);
              }}
            >
              Já reli
            </button>
          </li>
        ))}
      </ul>
      {falha && (
        <p role="alert" className="aviso falha">
          Não foi possível guardar a Frase. Nada foi alterado.
        </p>
      )}
    </section>
  );
}
