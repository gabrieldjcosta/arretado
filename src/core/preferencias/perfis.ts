import { COTA_DIARIA_PADRAO, type PerfilDeEstudo, type Preferencias } from '../modelo';

/** Preferências que um perfil pode mexer; nada além disso (só padrões da interface). */
export type CamposDePerfil = Pick<
  Preferencias,
  | 'fonteLeitura'
  | 'tamanhoFonte'
  | 'destacarCondicionantesEPrazos'
  | 'reguaDeLeitura'
  | 'espiadaDosVizinhos'
  | 'cotaDiaria'
  | 'modoSoEstudo'
  | 'temporizadorPadraoMin'
>;

type Valor = CamposDePerfil[keyof CamposDePerfil];

/** `undefined` = campo ausente (volta ao padrão do app). */
export type AlteracoesDePerfil = { [K in keyof CamposDePerfil]?: CamposDePerfil[K] | undefined };

export interface DescricaoDePerfil {
  id: PerfilDeEstudo;
  nome: string;
  resumo: string;
}

export const PERFIS: readonly DescricaoDePerfil[] = [
  { id: 'calmo', nome: 'Calmo', resumo: 'Menos coisas na tela e poucos cartões por vez.' },
  { id: 'guiado', nome: 'Guiado', resumo: 'Sessões com temporizador de 25 minutos, sem bloquear.' },
  { id: 'leitura', nome: 'Leitura', resumo: 'Texto maior e apoios de leitura ligados.' },
];

const PREDEFINICOES: Record<
  PerfilDeEstudo,
  Required<Omit<CamposDePerfil, 'temporizadorPadraoMin'>> & {
    temporizadorPadraoMin: number | undefined;
  }
> = {
  calmo: {
    fonteLeitura: 'serifa',
    tamanhoFonte: 18,
    destacarCondicionantesEPrazos: false,
    reguaDeLeitura: false,
    espiadaDosVizinhos: false,
    cotaDiaria: 5,
    modoSoEstudo: true,
    temporizadorPadraoMin: undefined,
  },
  guiado: {
    fonteLeitura: 'serifa',
    tamanhoFonte: 18,
    destacarCondicionantesEPrazos: false,
    reguaDeLeitura: false,
    espiadaDosVizinhos: false,
    cotaDiaria: COTA_DIARIA_PADRAO,
    modoSoEstudo: false,
    temporizadorPadraoMin: 25,
  },
  leitura: {
    fonteLeitura: 'serifa',
    tamanhoFonte: 20,
    destacarCondicionantesEPrazos: true,
    reguaDeLeitura: true,
    espiadaDosVizinhos: true,
    cotaDiaria: COTA_DIARIA_PADRAO,
    modoSoEstudo: false,
    temporizadorPadraoMin: undefined,
  },
};

const ROTULOS: Record<keyof CamposDePerfil, string> = {
  fonteLeitura: 'Fonte de leitura',
  tamanhoFonte: 'Tamanho do texto de leitura',
  destacarCondicionantesEPrazos: 'Destacar prazos, condições e penas',
  reguaDeLeitura: 'Régua de leitura',
  espiadaDosVizinhos: 'Espiada dos vizinhos no foco',
  cotaDiaria: 'Cartões por vez',
  modoSoEstudo: 'Modo só estudo na Sessão',
  temporizadorPadraoMin: 'Temporizador da Sessão',
};

const CAMPOS = Object.keys(ROTULOS) as (keyof CamposDePerfil)[];

/** Valor efetivo (com o padrão do app quando o campo está ausente). */
function efetivo(prefs: Partial<CamposDePerfil>, campo: keyof CamposDePerfil): Valor {
  switch (campo) {
    case 'fonteLeitura':
      return prefs.fonteLeitura ?? 'serifa';
    case 'tamanhoFonte':
      return prefs.tamanhoFonte ?? 18;
    case 'cotaDiaria':
      return prefs.cotaDiaria ?? COTA_DIARIA_PADRAO;
    case 'temporizadorPadraoMin':
      return prefs.temporizadorPadraoMin;
    default:
      return prefs[campo] ?? false;
  }
}

function texto(campo: keyof CamposDePerfil, v: Valor): string {
  if (typeof v === 'boolean') return v ? 'Ligado' : 'Desligado';
  if (campo === 'fonteLeitura') return v === 'sem_serifa' ? 'Sem serifa' : 'Com serifa';
  if (campo === 'tamanhoFonte') return `${String(v)} px`;
  if (campo === 'temporizadorPadraoMin')
    return v === undefined ? 'Sem temporizador' : `${String(v)} min`;
  return String(v);
}

export interface MudancaPrevista {
  campo: keyof CamposDePerfil;
  rotulo: string;
  de: string;
  para: string;
}

/** Prévia: só o que realmente muda com o perfil, do valor de hoje para o novo. */
export function preverPerfil(
  prefs: Partial<CamposDePerfil>,
  perfil: PerfilDeEstudo,
): MudancaPrevista[] {
  const alvo = PREDEFINICOES[perfil];
  return CAMPOS.flatMap((campo) => {
    const antes = efetivo(prefs, campo);
    const depois = alvo[campo];
    if (antes === depois) return [];
    return [{ campo, rotulo: ROTULOS[campo], de: texto(campo, antes), para: texto(campo, depois) }];
  });
}

/** Alterações a gravar para aplicar o perfil (inclui o perfil e o anterior para a volta atrás). */
export function alteracoesDoPerfil(
  prefs: Pick<Preferencias, 'perfilDeEstudo'>,
  perfil: PerfilDeEstudo,
): AlteracoesDePerfil & Pick<Preferencias, 'perfilDeEstudo' | 'perfilAnterior'> {
  return {
    ...PREDEFINICOES[perfil],
    perfilDeEstudo: perfil,
    // Reaplicar o mesmo perfil não apaga a volta atrás.
    ...(prefs.perfilDeEstudo && prefs.perfilDeEstudo !== perfil
      ? { perfilAnterior: prefs.perfilDeEstudo }
      : {}),
  };
}

/** Fotografia dos campos que o perfil vai mexer, para desfazer exatamente (inclui ausentes). */
export function fotografar(
  prefs: Preferencias,
): AlteracoesDePerfil & Pick<Preferencias, 'perfilDeEstudo' | 'perfilAnterior'> {
  const foto: Record<string, unknown> = {};
  for (const c of CAMPOS) foto[c] = prefs[c];
  foto.perfilDeEstudo = prefs.perfilDeEstudo;
  foto.perfilAnterior = prefs.perfilAnterior;
  return foto;
}
