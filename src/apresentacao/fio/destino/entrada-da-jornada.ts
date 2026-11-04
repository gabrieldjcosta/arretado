// Do que o Fio sabe (`EntradaDoFio` e o estado guardado) ao que o mapa do Destino precisa (`EntradaDaJornada`).
// A matéria em que a pessoa "está" é a do último pouso; enquanto ela não pousou nenhuma, a etapa aberta e
// depois a da vez. Os artigos que caem vêm só da matéria que o Fio abriu (as outras vêm sem artigos).
import {
  artigosRelevantes,
  escolherMateria,
  normaTemMapa,
  type EntradaDoFio,
  type EstadoDoFio,
} from '../../../dominios/fio';
import { materiasDoMapa, type ArtigoDoMapa, type EntradaDaJornada } from './jornada';

export function entradaDaJornada(entrada: EntradaDoFio, estado: EstadoDoFio): EntradaDaJornada {
  const materias = materiasDoMapa(entrada);
  const noMapa = new Set(materias.map((m) => m.id));
  const candidatas = [
    estado.pousos[0]?.materiaId,
    estado.etapa?.materiaId,
    escolherMateria(entrada)?.id,
  ];
  const atualId = candidatas.find((id): id is string => id !== undefined && noMapa.has(id));

  const doApp = entrada.materias.find((m) => m.id === atualId);
  const normas = doApp?.normas.filter((n) => n.artigos.length > 0) ?? [];
  // Os mais lidos do Mapa primeiro, entre as normas da matéria (cada uma já traz a sua ordem).
  const ranqueados = normas.flatMap((n) =>
    artigosRelevantes(n).map((a, i) => ({
      posicao: a.posicaoNoMapa ?? i,
      artigo: {
        normaId: n.id,
        endereco: a.endereco,
        rotulo: `${n.tituloCurto}, ${a.rotulo}`,
        lido: a.lido,
      } satisfies ArtigoDoMapa,
    })),
  );
  ranqueados.sort((a, b) => a.posicao - b.posicao);

  return {
    materias,
    ...(atualId === undefined ? {} : { atualId }),
    pousosPorMateria: estado.etapasPorMateria,
    portasAbertas: estado.porteirasDoFim,
    ...(normas.length === 0
      ? {}
      : { artigos: ranqueados.map((r) => r.artigo), comMapa: normas.some(normaTemMapa) }),
  };
}
