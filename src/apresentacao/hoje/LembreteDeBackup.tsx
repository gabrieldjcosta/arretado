// Uma linha no Hoje quando faz tempo que não há backup. Dispensável por 7 dias; nunca bloqueia nem
// usa tom de alarme (backup fica fora da voz regional).
import { useState } from 'react';
import { Link } from 'react-router';
import { dispensarPorDias, lembreteDeBackup } from '../../dominios/dados/lembrete-de-backup';
import {
  carregarBackup,
  fraseDoBackup,
  gravarDispensa,
  lerDispensa,
} from '../componentes/backup-pendente';
import { useDados, useRepositorio } from '../dados/contexto';
import './estilos-hoje.css';

export function LembreteDeBackup() {
  const repo = useRepositorio();
  const { dados } = useDados(carregarBackup);
  const [dispensadoAte, setDispensadoAte] = useState(lerDispensa);
  if (dados === undefined) return null;
  const agora = repo.ctx.agora();
  const l = lembreteDeBackup({ ...dados, agora, dispensadoAte });
  if (!l.mostrar) return null;
  return (
    <p className="lembrete-backup" role="status">
      <span>{fraseDoBackup(l.dias)}</span> <Link to="/conta/dados">Fazer agora</Link>{' '}
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
