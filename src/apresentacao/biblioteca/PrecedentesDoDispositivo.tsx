// "Precedentes" nas ações de um dispositivo (F3-C, C2): só aparece quando há algum ligado a ele.
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import type { Precedente } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { trechoPadrao, vinculosDoDispositivo } from '../../dominios/precedentes/servico';
import { useRepositorio } from '../dados/contexto';

const RESUMO = 140;

async function carregar(repo: Repositorio, dispositivoId: string): Promise<Precedente[]> {
  const vinculos = await vinculosDoDispositivo(repo, dispositivoId);
  const ids = [...new Set(vinculos.map((v) => v.precedenteId))];
  const achados: Precedente[] = [];
  for (const id of ids) {
    const p = await repo.colecao('precedentes').obter(id);
    if (p) achados.push(p);
  }
  return achados;
}

export function PrecedentesDoDispositivo({ dispositivoId }: { dispositivoId: string }) {
  const repo = useRepositorio();
  const titulo = useId();
  const [lista, setLista] = useState<Precedente[]>([]);

  useEffect(() => {
    let ativo = true;
    carregar(repo, dispositivoId).then(
      (achados) => {
        if (ativo) setLista(achados);
      },
      () => {
        if (ativo) setLista([]);
      },
    );
    return () => {
      ativo = false;
    };
  }, [repo, dispositivoId]);

  if (lista.length === 0) return null;
  return (
    <section aria-labelledby={titulo}>
      <h3 id={titulo}>{lista.length === 1 ? '1 precedente' : `${lista.length} precedentes`}</h3>
      <ul className="erros-vinculados">
        {lista.map((p) => {
          const tese = (trechoPadrao(p)?.texto ?? '').slice(0, RESUMO);
          return (
            <li key={p.id}>
              <Link to={`/biblioteca/precedentes/${p.id}`}>{p.tituloTese}</Link>
              {tese && <span className="dica"> — {tese}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
