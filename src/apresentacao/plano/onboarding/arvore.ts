// Árvore de matérias e assuntos do passo "Quais matérias entram no plano?": as disciplinas do
// edital escolhido mais o que a pessoa acrescentou. Pura — só monta a lista que a tela mostra.
import {
  chaveDeNome,
  disciplinasDoEdital,
  type EditalDoCatalogo,
} from '../../../dominios/catalogo';
import { chaveDoItem } from '../../../integracoes/catalogo/linhas';
import type { Acrescentos } from './rascunho';

export interface AssuntoDaArvore {
  id: string;
  texto: string;
  codigo?: string;
  /** Acrescentado pela pessoa. */
  seu?: boolean;
}

export interface DisciplinaDaArvore {
  nome: string;
  /** `chaveDeNome` do nome: é o que desmarca a matéria. */
  chave: string;
  /** Acrescentada pela pessoa. */
  seu: boolean;
  assuntos: AssuntoDaArvore[];
}

/** Matérias do edital (com os assuntos dele) mais as acrescentadas pela pessoa, com os assuntos dela juntados na matéria certa. */
export function montarArvore(
  edital: EditalDoCatalogo,
  acrescentos: Acrescentos,
): DisciplinaDaArvore[] {
  const doEdital = disciplinasDoEdital(edital).map(({ disciplina, nome }) => ({
    nome,
    seu: false,
    assuntos: disciplina.itens.map((item, i): AssuntoDaArvore => ({
      id: chaveDoItem(nome, i),
      texto: item.assunto,
      ...(item.numero ? { codigo: item.numero } : {}),
    })),
  }));
  const acrescentadas = acrescentos.disciplinas.map((nome) => ({
    nome,
    seu: true,
    assuntos: [] as AssuntoDaArvore[],
  }));
  return [...doEdital, ...acrescentadas].map((d) => {
    const chave = chaveDeNome(d.nome);
    const seus = acrescentos.assuntos
      .filter((a) => chaveDeNome(a.disciplina) === chave)
      .map((a): AssuntoDaArvore => ({
        id: `seu#${chave}#${chaveDeNome(a.titulo)}`,
        texto: a.titulo,
        seu: true,
      }));
    return { ...d, chave, assuntos: [...d.assuntos, ...seus] };
  });
}
