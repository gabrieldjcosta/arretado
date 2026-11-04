import { animate } from 'motion/mini';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRepositorio } from '../../dados/contexto';
import { movimentoAgora } from '../../movimento';
import { useNavegarComTransicao } from '../transicao';
import { filtrarItens, ITENS_FIXOS, type ItemDaPaleta } from './itens';
import './fio-paleta.css';

/**
 * A busca ⌘K (Ctrl+K) do Fio: um campo, uma lista, setas, Enter e Esc. Acha os lugares, o que fazer e as
 * leis da pessoa (pelo nome curto), tudo no aparelho, sem rede. Porte da prancha 7 da Marca
 * (https://claude.ai/artifact/XeS8YjZrCL6hJVhSSs84Xk): entrada com Motion (`motion/mini`), mola curta.
 */
export function PaletaDoFio() {
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !e.altKey) {
        e.preventDefault();
        setAberta((v) => !v);
      }
    };
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
    };
  }, []);
  if (!aberta) return null;
  return (
    <Caixa
      aoFechar={() => {
        setAberta(false);
      }}
    />
  );
}

function Caixa({ aoFechar }: { aoFechar: () => void }) {
  const repo = useRepositorio();
  const navegar = useNavegarComTransicao();
  const [consulta, setConsulta] = useState('');
  const [atual, setAtual] = useState(0);
  const [leis, setLeis] = useState<ItemDaPaleta[]>([]);
  const caixa = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const antes = useRef<Element | null>(document.activeElement);
  const lista = useId();

  useEffect(() => {
    let vivo = true;
    void repo
      .colecao('normas')
      .todosDoUsuario()
      .then((normas) => {
        if (!vivo) return;
        setLeis(
          normas.map((n) => ({
            id: `lei-${n.id}`,
            grupo: 'Leis' as const,
            texto: n.tituloCurto,
            para: `/biblioteca/normas/${n.id}`,
            ...(n.tituloOficial ? { chaves: n.tituloOficial } : {}),
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [repo]);

  useEffect(() => {
    campo.current?.focus();
    const mov = movimentoAgora();
    if (mov !== 'reduzido' && caixa.current) {
      animate(
        caixa.current,
        mov === 'calmo'
          ? { opacity: [0, 1] }
          : {
              opacity: [0, 1],
              transform: ['translateY(-8px) scale(0.98)', 'translateY(0) scale(1)'],
            },
        { duration: 0.22, ease: [0.2, 0.7, 0.2, 1] },
      );
    }
    const foco = antes.current;
    return () => {
      if (foco instanceof HTMLElement) foco.focus();
    };
  }, []);

  const achados = useMemo(
    () => filtrarItens([...ITENS_FIXOS, ...leis], consulta).slice(0, 12),
    [leis, consulta],
  );
  const ativo = Math.min(atual, Math.max(0, achados.length - 1));

  const escolher = (item: ItemDaPaleta) => {
    aoFechar();
    navegar(item.para);
  };

  const tecla = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAtual(Math.min(achados.length - 1, ativo + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAtual(Math.max(0, ativo - 1));
    } else if (e.key === 'Enter') {
      const item = achados[ativo];
      if (item) {
        e.preventDefault();
        escolher(item);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      aoFechar();
    }
  };

  return (
    <div
      className="fio-veu"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div className="fio-paleta" ref={caixa} role="dialog" aria-modal="true" aria-label="Buscar">
        <input
          ref={campo}
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value);
            setAtual(0);
          }}
          onKeyDown={tecla}
          placeholder="Buscar lei, lugar ou ação"
          aria-label="Buscar"
          role="combobox"
          aria-expanded="true"
          aria-controls={lista}
          aria-activedescendant={achados[ativo] ? `${lista}-${achados[ativo].id}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <ul id={lista} role="listbox" aria-label="Resultados">
          {achados.length === 0 && <li className="nada">Nada com esse nome.</li>}
          {achados.map((item, k) => (
            <li
              key={item.id}
              id={`${lista}-${item.id}`}
              role="option"
              aria-selected={k === ativo}
              className={k === ativo ? 'sel' : undefined}
              onMouseEnter={() => {
                setAtual(k);
              }}
              onClick={() => {
                escolher(item);
              }}
            >
              <em>{item.grupo}</em>
              {item.texto}
            </li>
          ))}
        </ul>
        <p className="atalhos">
          <kbd>↑</kbd>
          <kbd>↓</kbd> escolher · <kbd>Enter</kbd> abrir · <kbd>Esc</kbd> fechar
        </p>
      </div>
    </div>
  );
}
