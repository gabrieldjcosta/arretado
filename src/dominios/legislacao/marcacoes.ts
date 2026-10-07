// Grifos e notas do leitor (F2, 11.4; Parte 2 §10.6, Grifos): a marcação de um trecho do texto
// vigente de um dispositivo, ancorada pelo texto e pelos offsets sobre o texto gravado da versão
// (os trechos juntos; o tachado conta com o comprimento dele, como no `textoParaDestacar` da 9.8).
// A reancoragem numa versão nova é da 11.7/F6: aqui toda marcação nasce `valida`.
import type { Marcacao } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { todos } from './consultas';

export type CorDoGrifo = 1 | 2 | 3;
export const CORES_DO_GRIFO: readonly CorDoGrifo[] = [1, 2, 3];
/** O máximo do texto da âncora no modelo (`ancora.texto`). */
export const MAXIMO_DA_ANCORA = 5_000;

export type MotivoMarcacaoInvalida =
  'sem_texto' | 'trecho_vazio' | 'trecho_longo' | 'nota_vazia' | 'tipo_errado' | 'inexistente';

const MENSAGEM: Record<MotivoMarcacaoInvalida, string> = {
  sem_texto: 'O texto deste dispositivo não está nesta versão.',
  trecho_vazio: 'Selecione um trecho do texto.',
  trecho_longo: `Trecho longo demais (no máximo ${MAXIMO_DA_ANCORA.toLocaleString('pt-BR')} caracteres).`,
  nota_vazia: 'Escreva a nota.',
  tipo_errado: 'Essa ação não vale para esta marcação.',
  inexistente: 'Essa marcação não existe mais.',
};

export class MarcacaoInvalida extends Error {
  constructor(readonly motivo: MotivoMarcacaoInvalida) {
    super(MENSAGEM[motivo]);
    this.name = 'MarcacaoInvalida';
  }
}

/** Onde marcar: o dispositivo, a versão lida e os offsets da seleção no texto gravado dela. */
export interface TrechoParaMarcar {
  normaId: string;
  dispositivoId: string;
  versaoId: string;
  inicio: number;
  fim: number;
}

/** O texto gravado do dispositivo na versão: os trechos juntos, o tachado inclusive. */
async function textoGravado(repo: Repositorio, versaoId: string, dispositivoId: string) {
  const [texto] = await repo
    .colecao('textosDispositivo')
    .obterPorChaves('[versaoId+dispositivoId]', [[versaoId, dispositivoId]]);
  if (!texto) throw new MarcacaoInvalida('sem_texto');
  return texto.trechos.map((t) => t.texto).join('');
}

/**
 * A âncora do trecho: os offsets dentro do texto e sem os espaços das pontas (o toque duplo do
 * celular leva o espaço depois da palavra), e o texto entre eles.
 */
export function ancorar(texto: string, inicio: number, fim: number): Marcacao['ancora'] {
  let de = Math.max(0, Math.min(inicio, fim, texto.length));
  let ate = Math.min(texto.length, Math.max(inicio, fim, 0));
  while (de < ate && /\s/u.test(texto.charAt(de))) de++;
  while (ate > de && /\s/u.test(texto.charAt(ate - 1))) ate--;
  if (de === ate) throw new MarcacaoInvalida('trecho_vazio');
  if (ate - de > MAXIMO_DA_ANCORA) throw new MarcacaoInvalida('trecho_longo');
  return { texto: texto.slice(de, ate), inicio: de, fim: ate };
}

async function criar(
  repo: Repositorio,
  trecho: TrechoParaMarcar,
  campos: Pick<Marcacao, 'tipo' | 'cor' | 'nota'>,
): Promise<Marcacao> {
  const texto = await textoGravado(repo, trecho.versaoId, trecho.dispositivoId);
  return repo.colecao('marcacoes').criar({
    normaId: trecho.normaId,
    dispositivoId: trecho.dispositivoId,
    versaoId: trecho.versaoId,
    ...campos,
    ancora: ancorar(texto, trecho.inicio, trecho.fim),
    status: 'valida',
  });
}

const notaLimpa = (nota: string) => {
  const limpa = nota.trim();
  if (!limpa) throw new MarcacaoInvalida('nota_vazia');
  return limpa;
};

/** Grifa o trecho numa das 3 cores. */
export function criarGrifo(
  repo: Repositorio,
  trecho: TrechoParaMarcar,
  cor: CorDoGrifo,
): Promise<Marcacao> {
  return criar(repo, trecho, { tipo: 'grifo', cor });
}

/** Anota o trecho (a nota não pode ficar vazia: para tirá-la, `removerMarcacao`). */
export async function criarNota(
  repo: Repositorio,
  trecho: TrechoParaMarcar,
  nota: string,
): Promise<Marcacao> {
  return criar(repo, trecho, { tipo: 'nota', nota: notaLimpa(nota) });
}

async function obterDoTipo(repo: Repositorio, id: string, tipo: Marcacao['tipo']) {
  const marcacao = await repo.colecao('marcacoes').obter(id);
  if (!marcacao) throw new MarcacaoInvalida('inexistente');
  if (marcacao.tipo !== tipo) throw new MarcacaoInvalida('tipo_errado');
  return marcacao;
}

/** Troca a cor do grifo. */
export async function mudarCor(repo: Repositorio, id: string, cor: CorDoGrifo): Promise<Marcacao> {
  await obterDoTipo(repo, id, 'grifo');
  return repo.colecao('marcacoes').atualizar(id, { cor });
}

/** Troca o texto da nota. */
export async function editarNota(repo: Repositorio, id: string, nota: string): Promise<Marcacao> {
  const limpa = notaLimpa(nota);
  await obterDoTipo(repo, id, 'nota');
  return repo.colecao('marcacoes').atualizar(id, { nota: limpa });
}

/** Tira o grifo ou a nota (exclusão lógica, como todo registro do usuário). */
export async function removerMarcacao(repo: Repositorio, id: string): Promise<void> {
  if (!(await repo.colecao('marcacoes').obter(id))) throw new MarcacaoInvalida('inexistente');
  await repo.colecao('marcacoes').excluir(id);
}

/**
 * As marcações da norma, por dispositivo, na ordem em que foram criadas (a mais nova por cima, no
 * desenho). Com `versaoId`, só as ancoradas nessa versão (as de outra esperam a reancoragem, 11.7).
 */
export async function marcacoesDaNorma(
  repo: Repositorio,
  normaId: string,
  versaoId?: string,
): Promise<Map<string, Marcacao[]>> {
  const lidas = await todos(repo.colecao('marcacoes'), {
    indice: 'normaId',
    de: normaId,
    ate: normaId,
    ...(versaoId === undefined ? {} : { filtro: (m: Marcacao) => m.versaoId === versaoId }),
  });
  lidas.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm) || a.id.localeCompare(b.id));
  const porDispositivo = new Map<string, Marcacao[]>();
  for (const marcacao of lidas) {
    const lista = porDispositivo.get(marcacao.dispositivoId);
    if (lista) lista.push(marcacao);
    else porDispositivo.set(marcacao.dispositivoId, [marcacao]);
  }
  return porDispositivo;
}
