import { animate } from 'motion/mini';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { movimentoAgora } from '../../movimento';
import './fio-avisos.css';

/**
 * Avisos discretos do Fio (estilo Sonner: um canto, empilha, some sozinho, "Desfazer" quando o efeito é
 * reversível). Sem modal: não interrompe o estudo. Entrada e saída com Motion (`motion/mini`).
 * Tudo vive na casca do Fio; fora dela `useAvisos` devolve um `avisar` que não faz nada.
 */
export interface Aviso {
  texto: string;
  /** Aparece o botão "Desfazer"; roda ao tocar e fecha o aviso. */
  desfazer?: () => void;
  /** Padrão 5 000 ms. */
  duracaoMs?: number;
}

interface Item extends Aviso {
  id: number;
}

const Contexto = createContext<(aviso: Aviso) => void>(() => undefined);

export const useAvisos = () => useContext(Contexto);

const MAXIMO = 3;

function AvisoNaTela({ item, fechar }: { item: Item; fechar: (id: number) => void }) {
  const caixa = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const mov = movimentoAgora();
    if (mov === 'reduzido' || !caixa.current) return;
    animate(
      caixa.current,
      mov === 'calmo'
        ? { opacity: [0, 1] }
        : {
            opacity: [0, 1],
            transform: ['translateY(12px) scale(0.97)', 'translateY(0) scale(1)'],
          },
      { duration: mov === 'calmo' ? 0.25 : 0.42, ease: [0.34, 1.56, 0.64, 1] },
    );
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => {
      fechar(item.id);
    }, item.duracaoMs ?? 5000);
    return () => {
      window.clearTimeout(t);
    };
  }, [item, fechar]);
  return (
    <li className="fio-aviso" ref={caixa}>
      <span>{item.texto}</span>
      {item.desfazer && (
        <button
          type="button"
          onClick={() => {
            item.desfazer?.();
            fechar(item.id);
          }}
        >
          Desfazer
        </button>
      )}
    </li>
  );
}

export function AvisosDoFio({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Item[]>([]);
  const proximo = useRef(0);
  const fechar = useCallback((id: number) => {
    setItens((atual) => atual.filter((i) => i.id !== id));
  }, []);
  const avisar = useCallback((aviso: Aviso) => {
    proximo.current += 1;
    const item = { ...aviso, id: proximo.current };
    setItens((atual) => [...atual, item].slice(-MAXIMO));
  }, []);
  const valor = useMemo(() => avisar, [avisar]);
  return (
    <Contexto.Provider value={valor}>
      {children}
      <ul className="fio-avisos" role="status" aria-live="polite" aria-label="Avisos">
        {itens.map((i) => (
          <AvisoNaTela key={i.id} item={i} fechar={fechar} />
        ))}
      </ul>
    </Contexto.Provider>
  );
}
