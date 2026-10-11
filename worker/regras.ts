// Regras da rota /api/buscar-norma (T17): só https, lista fechada de hosts (comparação exata),
// redirecionamento seguido só dentro da lista, limites de tempo e tamanho, User-Agent de
// navegador (o Planalto recusa o padrão). A rota só repassa os bytes; decodificação e hash
// ficam no aparelho. Sem dependência de ambiente: o fetch entra por parâmetro.

export const HOSTS_PERMITIDOS: readonly string[] = [
  'planalto.gov.br',
  'www.planalto.gov.br',
  'al.sp.gov.br',
  'www.al.sp.gov.br',
];

export const USER_AGENT = 'Mozilla/5.0 (compatible; Arretado/0.1; leitor pessoal de normas)';
/** Maior página do corpus: CF/88, 1,8 MB. */
export const LIMITE_BYTES = 6 * 1024 * 1024;
export const LIMITE_MS = 15_000;
export const LIMITE_REDIRECIONAMENTOS = 5;

export type Motivo =
  | 'url_ausente'
  | 'url_invalida'
  | 'protocolo_nao_https'
  | 'host_nao_permitido'
  | 'porta_nao_permitida'
  | 'credenciais_na_url'
  | 'redirecionamento_invalido'
  | 'redirecionamentos_demais'
  | 'status_erro'
  | 'grande_demais'
  | 'tempo_esgotado'
  | 'falha_de_rede';

export type Validada = { ok: true; url: URL } | { ok: false; motivo: Motivo };

/** Valida o endereço: https, host exatamente na lista, sem porta nem credenciais. */
export function validarUrl(entrada: string | null | undefined, base?: string): Validada {
  if (!entrada) return { ok: false, motivo: 'url_ausente' };
  let url: URL;
  try {
    url = new URL(entrada, base);
  } catch {
    return { ok: false, motivo: 'url_invalida' };
  }
  if (url.protocol !== 'https:') return { ok: false, motivo: 'protocolo_nao_https' };
  if (url.username || url.password) return { ok: false, motivo: 'credenciais_na_url' };
  if (url.port) return { ok: false, motivo: 'porta_nao_permitida' };
  if (!HOSTS_PERMITIDOS.includes(url.hostname)) return { ok: false, motivo: 'host_nao_permitido' };
  return { ok: true, url };
}

export type Buscada =
  | { ok: true; bytes: Uint8Array<ArrayBuffer>; tipo: string; urlFinal: string }
  | { ok: false; motivo: Motivo };

type Buscar = (url: string, init: RequestInit) => Promise<Response>;

async function lerLimitado(corpo: ReadableStream<Uint8Array> | null, limite: number) {
  if (!corpo) return new Uint8Array(0);
  const leitor = corpo.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > limite) {
      await leitor.cancel();
      return null;
    }
    partes.push(value);
  }
  const bytes = new Uint8Array(total);
  let posicao = 0;
  for (const parte of partes) {
    bytes.set(parte, posicao);
    posicao += parte.byteLength;
  }
  return bytes;
}

/** Busca a página seguindo redirecionamentos à mão: cada destino passa pela mesma validação. */
export async function buscarPagina(entrada: string, buscar: Buscar): Promise<Buscada> {
  const validada = validarUrl(entrada);
  if (!validada.ok) return validada;
  let atual = validada.url;
  const sinal = AbortSignal.timeout(LIMITE_MS);
  try {
    for (let salto = 0; salto <= LIMITE_REDIRECIONAMENTOS; salto++) {
      const resposta = await buscar(atual.href, {
        method: 'GET',
        redirect: 'manual',
        signal: sinal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*;q=0.8' },
      });
      if (resposta.status >= 300 && resposta.status < 400) {
        const destino = validarUrl(resposta.headers.get('Location'), atual.href);
        if (!destino.ok) {
          return {
            ok: false,
            motivo:
              destino.motivo === 'url_ausente' || destino.motivo === 'url_invalida'
                ? 'redirecionamento_invalido'
                : destino.motivo,
          };
        }
        atual = destino.url;
        continue;
      }
      if (!resposta.ok) return { ok: false, motivo: 'status_erro' };
      const declarado = Number(resposta.headers.get('Content-Length'));
      if (declarado > LIMITE_BYTES) return { ok: false, motivo: 'grande_demais' };
      const bytes = await lerLimitado(resposta.body, LIMITE_BYTES);
      if (!bytes) return { ok: false, motivo: 'grande_demais' };
      return {
        ok: true,
        bytes,
        tipo: resposta.headers.get('Content-Type') ?? '',
        urlFinal: atual.href,
      };
    }
    return { ok: false, motivo: 'redirecionamentos_demais' };
  } catch (erro) {
    const nome = (erro as { name?: string } | null)?.name ?? '';
    return {
      ok: false,
      motivo: nome === 'TimeoutError' || nome === 'AbortError' ? 'tempo_esgotado' : 'falha_de_rede',
    };
  }
}

const STATUS: Record<Motivo, number> = {
  url_ausente: 400,
  url_invalida: 400,
  protocolo_nao_https: 400,
  host_nao_permitido: 403,
  porta_nao_permitida: 403,
  credenciais_na_url: 400,
  redirecionamento_invalido: 502,
  redirecionamentos_demais: 502,
  status_erro: 502,
  grande_demais: 413,
  tempo_esgotado: 504,
  falha_de_rede: 502,
};

export function statusDoMotivo(motivo: Motivo): number {
  return STATUS[motivo];
}
