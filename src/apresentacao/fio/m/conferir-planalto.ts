// "Atualizar com o Planalto", do item de uma norma no Varal: confere a página oficial com o texto guardado. É o mesmo caminho
// do "Verificar atualização" do Leitor e só lê: nunca troca o texto nem cria versão (D16: quem decide é a pessoa; para atualizar,
// ela importa a página de novo). Fica à parte, e só é carregado quando a pessoa pede, para não pesar no folheto.
import type { Repositorio } from '../../../core/persistencia';
import { sanitizarHtml } from '../../../core/seguranca/sanitizador';
import {
  alvoDaVerificacao,
  compararComVersao,
  VerificacaoIndisponivel,
  type ResultadoDaVerificacao,
} from '../../../dominios/legislacao/verificacao';
import { buscarPagina, FalhaNaBusca, type PaginaBuscada } from '../../../integracoes/url/buscar';

export type Conferencia =
  | { tipo: 'resultado'; resultado: ResultadoDaVerificacao; urlOficial: string }
  | { tipo: 'falha'; mensagem: string };

const SEM_ENDERECO = 'Esta norma não tem endereço oficial guardado.';
const FALHA_GERAL = 'Não deu para conferir agora. A norma continua como está.';

/** Busca a página oficial da norma e a compara com a versão vigente. Nunca lança: a falha vira uma frase. */
export async function conferirComOPlanalto(
  repo: Repositorio,
  normaId: string,
  buscar: (endereco: string) => Promise<PaginaBuscada> = buscarPagina,
): Promise<Conferencia> {
  try {
    const { versao, urlOficial } = await alvoDaVerificacao(repo, normaId);
    const pagina = await buscar(urlOficial);
    const { blocos } = sanitizarHtml(pagina.html);
    if (blocos.length === 0) {
      throw new FalhaNaBusca('A página buscada não tem texto.', 'status_erro');
    }
    return { tipo: 'resultado', resultado: await compararComVersao(versao, blocos), urlOficial };
  } catch (e) {
    return {
      tipo: 'falha',
      mensagem: e instanceof VerificacaoIndisponivel ? SEM_ENDERECO : FALHA_GERAL,
    };
  }
}

/** O aviso curto de quando não há o que decidir; `undefined` quando há indício e a pessoa precisa ler (a folha abre). */
export function avisoDaConferencia(nome: string, c: Conferencia): string | undefined {
  if (c.tipo === 'falha') return c.mensagem;
  switch (c.resultado.tipo) {
    case 'igual':
      return `${nome}: o texto guardado é igual ao da página oficial.`;
    case 'sem_indicio':
      return `${nome}: nenhuma alteração de vigência na página oficial.`;
    case 'indicio':
      return undefined;
  }
}
