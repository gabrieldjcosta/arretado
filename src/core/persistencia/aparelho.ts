// Nome do Aparelho (F4-B, B4; revisão da Marca): o nome padrão vem da plataforma, para que "Seus
// Aparelhos" distinga um celular de um computador sem a pessoa ter de batizar cada um. O `userAgent`
// cru fica guardado em `plataforma`, mas a tela mostra só a palavra legível.

/** Nome padrão que os aparelhos recebiam até o B4; o aparelho atual com esse nome é renomeado uma vez. */
export const NOME_PADRAO_ANTIGO = 'Este aparelho';

/** "Celular Android", "iPhone", "Computador com Windows"… a partir do `userAgent`. */
export function nomeDaPlataforma(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('ipad')) return 'iPad';
  if (ua.includes('iphone') || ua.includes('ipod')) return 'iPhone';
  if (ua.includes('android')) return ua.includes('mobile') ? 'Celular Android' : 'Tablet Android';
  if (ua.includes('windows')) return 'Computador com Windows';
  if (ua.includes('cros')) return 'Chromebook';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'Mac';
  if (ua.includes('linux')) return 'Computador com Linux';
  return 'Aparelho';
}

/** O `userAgent` atual, cortado no limite do esquema (`plataforma`). */
export function plataformaAtual(): string {
  const ua = typeof navigator === 'undefined' ? 'desconhecida' : navigator.userAgent;
  return ua.slice(0, 200) || 'desconhecida';
}
