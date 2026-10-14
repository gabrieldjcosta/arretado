/** Textos de tela num só lugar (guia de voz: sem sotaque em backup). */
export const TEXTOS = {
  titulo: 'Seus dados',
  nunca: 'Ainda não há backup. Seus dados estão só neste aparelho.',
  hoje: 'Último backup: hoje.',
  ontem: 'Último backup: ontem.',
  dias: (n: number) => `Último backup: há ${String(n)} dias.`,
  persistente: 'Este aparelho guarda os dados com proteção contra limpeza.',
  temporario: 'O navegador pode limpar os dados se faltar espaço. Faça um backup.',
  indisponivel: 'Este navegador não informa se os dados podem ser limpos. Faça um backup.',
  acao: 'Fazer backup agora',
};

const DIA = 86_400_000;

export function textoDoBackup(data: string | null, agora = Date.now()): string {
  if (data === null) return TEXTOS.nunca;
  const t = Date.parse(data);
  if (Number.isNaN(t)) return TEXTOS.nunca;
  const dias = Math.floor((agora - t) / DIA);
  if (dias <= 0) return TEXTOS.hoje;
  return dias === 1 ? TEXTOS.ontem : TEXTOS.dias(dias);
}
