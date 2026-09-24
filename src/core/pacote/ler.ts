// Leitura e validação do pacote (docs/formato-pacote.md, "Validação na importação").
import { unzipSync } from 'fflate';
import {
  ENTIDADES,
  NOMES_COLECOES,
  colecoesDoModulo,
  versaoDeOrigem,
  type NomeColecao,
} from '../modelo';
import { VERSAO_ESQUEMA } from '../persistencia';
import { deBytes, sha256 } from './bytes';
import { decifrar } from './cifra';
import { hashDoConjunto } from './exportar';
import {
  ARQUIVO_CIFRADO,
  ARQUIVO_LOG,
  ARQUIVO_MANIFESTO,
  FORMATO,
  Manifesto,
  ManifestoCifrado,
  PacoteRecusado,
  PASTA_ANEXOS,
  PASTA_DADOS,
  VERSAO_FORMATO,
} from './formato';

export interface PacoteLido {
  manifesto: Manifesto;
  /** Registros validados por coleção (todas as coleções dos módulos do pacote). */
  registros: Map<NomeColecao, Record<string, unknown>[]>;
  log: unknown[] | null;
  anexos: Map<string, Uint8Array>;
  /** SHA-256 do arquivo inteiro, como recebido (para o LogDeImportação). */
  hashArquivo: string;
  cifrado: boolean;
}

/** Teto do conteúdo descompactado (proteção contra "zip bomb"). */
export const LIMITE_DESCOMPACTADO = 512 * 1024 * 1024;

function descompactar(bytes: Uint8Array, limite: number): Record<string, Uint8Array> {
  const leitura = { total: 0, excedeu: false };
  let arquivos: Record<string, Uint8Array>;
  try {
    arquivos = unzipSync(bytes, {
      // Tamanhos declarados conferidos antes de descompactar qualquer entrada.
      filter: (f) => {
        leitura.total += f.originalSize;
        if (f.originalSize > limite || leitura.total > limite) leitura.excedeu = true;
        return !leitura.excedeu;
      },
    });
  } catch {
    throw new PacoteRecusado('nao_e_pacote');
  }
  if (leitura.excedeu)
    throw new PacoteRecusado('arquivo_alterado', 'conteúdo descompactado grande demais');
  // O tamanho declarado pode mentir: confere o real.
  const real = Object.values(arquivos).reduce((s, a) => s + a.length, 0);
  if (real > limite)
    throw new PacoteRecusado('arquivo_alterado', 'conteúdo descompactado grande demais');
  return arquivos;
}

function lerJson(bytes: Uint8Array | undefined, motivo: 'nao_e_pacote' | 'arquivo_alterado') {
  if (!bytes) throw new PacoteRecusado(motivo);
  try {
    return JSON.parse(deBytes(bytes)) as unknown;
  } catch {
    throw new PacoteRecusado(motivo);
  }
}

function verificarCabecalho(obj: unknown): void {
  const o = obj as { formato?: unknown; versaoFormato?: unknown } | null;
  if (typeof o !== 'object' || o === null || o.formato !== FORMATO) {
    throw new PacoteRecusado('nao_e_pacote');
  }
  if (o.versaoFormato !== VERSAO_FORMATO) throw new PacoteRecusado('formato_desconhecido');
}

export async function lerPacote(
  bytes: Uint8Array,
  opcoes: { senha?: string; limiteDescompactado?: number } = {},
): Promise<PacoteLido> {
  const limite = opcoes.limiteDescompactado ?? LIMITE_DESCOMPACTADO;
  const hashArquivo = await sha256(bytes);
  let arquivos = descompactar(bytes, limite);
  let cabecalho = lerJson(arquivos[ARQUIVO_MANIFESTO], 'nao_e_pacote');
  verificarCabecalho(cabecalho);

  let cifrado = false;
  if (typeof cabecalho === 'object' && cabecalho !== null && 'cifra' in cabecalho) {
    const externo = ManifestoCifrado.safeParse(cabecalho);
    const conteudo = arquivos[ARQUIVO_CIFRADO];
    if (!externo.success || !conteudo) throw new PacoteRecusado('formato_desconhecido');
    if (opcoes.senha === undefined) throw new PacoteRecusado('senha_necessaria');
    let interno: Uint8Array;
    try {
      interno = await decifrar(conteudo, opcoes.senha, externo.data.cifra);
    } catch {
      throw new PacoteRecusado('senha_ou_arquivo_invalido');
    }
    arquivos = descompactar(interno, limite);
    cabecalho = lerJson(arquivos[ARQUIVO_MANIFESTO], 'arquivo_alterado');
    verificarCabecalho(cabecalho);
    cifrado = true;
  }

  const versao = (cabecalho as { versaoEsquema?: unknown }).versaoEsquema;
  if (typeof versao === 'number' && versao > VERSAO_ESQUEMA) {
    throw new PacoteRecusado('versao_posterior');
  }
  const m = Manifesto.safeParse(cabecalho);
  if (!m.success) throw new PacoteRecusado('arquivo_alterado', 'manifesto inválido');
  const manifesto = m.data;

  // Conjunto de arquivos exatamente igual ao declarado, com hashes conferidos.
  const presentes = Object.keys(arquivos).filter((c) => c !== ARQUIVO_MANIFESTO);
  const declarados = Object.keys(manifesto.arquivos);
  if (presentes.length !== declarados.length || presentes.some((c) => !(c in manifesto.arquivos))) {
    throw new PacoteRecusado('arquivo_alterado', 'arquivos diferentes do manifesto');
  }
  for (const [caminho, info] of Object.entries(manifesto.arquivos)) {
    const conteudo = arquivos[caminho];
    if (!conteudo || conteudo.length !== info.bytes || (await sha256(conteudo)) !== info.sha256) {
      throw new PacoteRecusado('arquivo_alterado', `hash de ${caminho}`);
    }
  }
  if ((await hashDoConjunto(manifesto.arquivos)) !== manifesto.hashConjunto) {
    throw new PacoteRecusado('arquivo_alterado', 'hash do conjunto');
  }

  // Registros: toda coleção dos módulos presente, todo registro válido e do usuário do pacote.
  // Pacote de esquema anterior não traz as coleções nascidas depois: entram vazias (migração).
  const registros = new Map<NomeColecao, Record<string, unknown>[]>();
  const doModulo = manifesto.modulos.flatMap((mod) => colecoesDoModulo(mod));
  const esperadas = new Set(doModulo.filter((n) => versaoDeOrigem(n) <= manifesto.versaoEsquema));
  for (const nome of doModulo) if (!esperadas.has(nome)) registros.set(nome, []);
  for (const caminho of declarados.filter((c) => c.startsWith(PASTA_DADOS))) {
    const nome = caminho.slice(PASTA_DADOS.length).replace(/\.json$/, '') as NomeColecao;
    if (!NOMES_COLECOES.includes(nome) || !esperadas.has(nome)) {
      throw new PacoteRecusado('arquivo_alterado', `coleção inesperada: ${nome}`);
    }
    const lista = lerJson(arquivos[caminho], 'arquivo_alterado');
    if (!Array.isArray(lista)) throw new PacoteRecusado('arquivo_alterado', caminho);
    const validos: Record<string, unknown>[] = [];
    for (const item of lista) {
      const r = ENTIDADES[nome].esquema.safeParse(item);
      if (!r.success || r.data.usuarioId !== manifesto.usuarioId) {
        throw new PacoteRecusado('arquivo_alterado', `registro inválido em ${nome}`);
      }
      validos.push(r.data);
    }
    if (manifesto.contagens[nome] !== validos.length) {
      throw new PacoteRecusado('arquivo_alterado', `contagem de ${nome}`);
    }
    registros.set(nome, validos);
  }
  for (const nome of esperadas) {
    if (!registros.has(nome)) throw new PacoteRecusado('arquivo_alterado', `falta ${nome}`);
  }

  let log: unknown[] | null = null;
  if (manifesto.incluiLog) {
    const l = lerJson(arquivos[ARQUIVO_LOG], 'arquivo_alterado');
    if (!Array.isArray(l)) throw new PacoteRecusado('arquivo_alterado', 'log');
    log = l;
  }
  // Anexos: só com incluiAnexos, cada um com registro no pacote e hash igual ao do registro.
  const anexos = new Map<string, Uint8Array>();
  const registrosAnexos = new Map(
    (registros.get('anexos') ?? []).map((r) => [r.id as string, r.hash as string]),
  );
  for (const caminho of declarados.filter((c) => c.startsWith(PASTA_ANEXOS))) {
    const id = caminho.slice(PASTA_ANEXOS.length);
    const conteudo = arquivos[caminho];
    const hashEsperado = registrosAnexos.get(id);
    if (!manifesto.incluiAnexos || !conteudo || hashEsperado !== (await sha256(conteudo))) {
      throw new PacoteRecusado('arquivo_alterado', `anexo ${id}`);
    }
    anexos.set(id, conteudo);
  }

  return { manifesto, registros, log, anexos, hashArquivo, cifrado };
}
