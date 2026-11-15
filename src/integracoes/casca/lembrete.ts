// Lembrete diário de estudo, só na casca nativa (Fase 1 do plano de apps). É local ao aparelho: a notificação
// é agendada pelo Android, sem servidor e sem rede (local-first). A escolha fica no `localStorage` do aparelho,
// não nas preferências da conta, porque cada aparelho tem o seu horário e nada disso entra no esquema nem no sync.

const CHAVE = 'arretado:lembrete-diario';
const ID_DA_NOTIFICACAO = 1;
export const HORA_PADRAO = '20:00';

export interface LembreteDiario {
  ligado: boolean;
  /** `HH:MM`, 24 h. */
  hora: string;
}

// (mesma checagem de conta/casca.ts; as pastas não se importam)
export function naCasca(): boolean {
  return (
    (
      window as { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor?.isNativePlatform?.() === true
  );
}

export function horaValida(hora: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}

export function lerLembrete(): LembreteDiario {
  try {
    const bruto = JSON.parse(
      localStorage.getItem(CHAVE) ?? 'null',
    ) as Partial<LembreteDiario> | null;
    if (typeof bruto?.hora === 'string' && horaValida(bruto.hora)) {
      return { ligado: bruto.ligado === true, hora: bruto.hora };
    }
  } catch {
    // Armazenamento bloqueado ou valor estranho: segue desligado.
  }
  return { ligado: false, hora: HORA_PADRAO };
}

function guardar(l: LembreteDiario) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(l));
  } catch {
    // Sem armazenamento a notificação vale até o aparelho reiniciar; nada a fazer.
  }
}

/** Pede a permissão (Android 13+) e agenda todo dia na hora dada. `false` se a pessoa não permitiu. */
export async function ligarLembrete(hora: string): Promise<boolean> {
  if (!horaValida(hora)) return false;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const permissao = await LocalNotifications.requestPermissions();
  if (permissao.display !== 'granted') return false;
  const [h, m] = hora.split(':').map(Number);
  await LocalNotifications.cancel({ notifications: [{ id: ID_DA_NOTIFICACAO }] });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID_DA_NOTIFICACAO,
        title: 'Arretado',
        body: 'Seu estudo está esperando onde você parou.',
        schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
      },
    ],
  });
  guardar({ ligado: true, hora });
  return true;
}

export async function desligarLembrete(): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await LocalNotifications.cancel({ notifications: [{ id: ID_DA_NOTIFICACAO }] });
  guardar({ ligado: false, hora: lerLembrete().hora });
}
