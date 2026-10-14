// Uma linha no Hoje quando faz tempo que não há backup. Dispensável por 7 dias; nunca bloqueia nem
// usa tom de alarme (backup fica fora da voz regional).
import { useState } from 'react';
import { Link } from 'react-router';
import { lerUltimoBackup } from '../../core/persistencia';
import type { Repositorio } from '../../core/persistencia';
import { dispensarPorDias, lembreteDeBackup } from '../../dominios/dados/lembrete-de-backup';
import { useDados, useRepositorio } from '../dados/contexto';
import './estilos-hoje.css';

const CHAVE = 'arretado.lembreteBackup.ate';

const lerDispensa = (): string | null => {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
};
const gravarDispensa = (ate: string) => {
  try {
    localStorage.setItem(CHAVE, ate);
  } catch {
    /* sem armazenamento: some só até recarregar */
  }
};

async function carregar(repo: Repositorio) {
  const [ultimoBackup, erros, cartoes] = await Promise.all([
    lerUltimoBackup(repo),
    repo.colecao('erros').contar(),
    repo.colecao('cartoes').contar(),
  ]);
  return { ultimoBackup, haDados: erros + cartoes > 0 };
}

export function LembreteDeBackup() {
  const repo = useRepositorio();
  const { dados } = useDados(carregar);
  const [dispensadoAte, setDispensadoAte] = useState(lerDispensa);
  if (dados === undefined) return null;
  const agora = repo.ctx.agora();
  const l = lembreteDeBackup({ ...dados, agora, dispensadoAte });
  if (!l.mostrar) return null;
  return (
    <p className="lembrete-backup" role="status">
      <span>
        {l.dias === null
          ? 'Você ainda não fez backup.'
          : `Faz ${String(l.dias)} dias do último backup.`}
      </span>{' '}
      <Link to="/conta/dados">Fazer agora</Link>{' '}
      <button
        type="button"
        className="discreto"
        onClick={() => {
          const ate = dispensarPorDias(agora);
          gravarDispensa(ate);
          setDispensadoAte(ate);
        }}
      >
        Depois
      </button>
    </p>
  );
}
