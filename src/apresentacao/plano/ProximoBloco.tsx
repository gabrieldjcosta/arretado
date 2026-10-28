// A Trilha abre pelo próximo bloco do Ciclo (F5), não pela lista de Pontos.
import { Link } from 'react-router';
import type { Repositorio } from '../../core/persistencia';
import { cicloAtivo, posicaoDoCiclo } from '../../dominios/ciclos';
import { useDados } from '../dados/contexto';

async function carregarProximoBloco(repo: Repositorio) {
  const ciclo = await cicloAtivo(repo);
  if (!ciclo) return null;
  const { indice } = await posicaoDoCiclo(repo, ciclo);
  const bloco = ciclo.blocos[indice];
  const disciplina = bloco
    ? await repo.colecao('disciplinas').obter(bloco.disciplinaId)
    : undefined;
  if (!bloco || !disciplina || disciplina.excluidoEm !== null) return null;
  return { cicloId: ciclo.id, indice, minutos: bloco.minutos, materia: disciplina.nome };
}

export function ProximoBloco() {
  const { dados } = useDados(carregarProximoBloco);
  if (!dados) return null;
  const rota = `/sessao/iniciar?tipo=ciclo&id=${dados.cicloId}&ciclo=${dados.cicloId}&bloco=${String(dados.indice)}&rotulo=${encodeURIComponent(dados.materia)}&origem=ciclo&direto=1`;
  return (
    <section className="proximo-bloco" aria-label="Próximo bloco">
      <p>
        <strong>Próximo bloco:</strong> {dados.materia} · {dados.minutos} min
      </p>
      <Link to={rota} className="botao principal">
        Começar este bloco
      </Link>
    </section>
  );
}
