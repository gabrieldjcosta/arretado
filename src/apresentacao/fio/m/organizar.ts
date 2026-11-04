// As escolhas do "Organizar" do Varal (o `ORG` do mockup aprovado) e o que a pessoa fixou no alto ou tirou do varal.
// Ficam no aparelho (`localStorage`, com a versão no nome) e valem para o Varal todo, como o plano pede ("Organizar:
// fica no aparelho, vale para o Varal todo"). Sem armazenamento (janela privada, jsdom), valem só nesta aba. Nada aqui
// apaga dado de estudo: "tirar do varal" só esconde a linha neste aparelho, e "Mostrar as que tirei" a devolve.
import { useSyncExternalStore } from 'react';

export type Ordem = 'cai' | 'rec' | 'nome' | 'disc';
export type Vista = 'cai' | 'disc' | 'data';

/** Os nomes do mockup (`ORDENS` e `VISTAS`). */
export const ORDENS: Readonly<Record<Ordem, string>> = {
  cai: 'O que mais cai',
  rec: 'Recentes',
  nome: 'Nome',
  disc: 'Disciplina',
};
export const VISTAS: Readonly<Record<Vista, string>> = {
  cai: 'O que cai',
  disc: 'Disciplina',
  data: 'Atualização',
};

/** A ordem em que o Organizar mostra as opções. */
export const ORDEM_DAS_ORDENS: readonly Ordem[] = ['cai', 'rec', 'nome', 'disc'];
export const ORDEM_DAS_VISTAS: readonly Vista[] = ['cai', 'disc', 'data'];

export interface Organizacao {
  ordem: Ordem;
  vista: Vista;
  /** "Agrupar por disciplina". */
  grupo: boolean;
  /** Os fixados no alto, por folheto (`normas`, `sumulas`...). */
  fixos: Readonly<Record<string, readonly string[]>>;
  /** Os que a pessoa tirou do varal neste aparelho, por folheto. */
  tirados: Readonly<Record<string, readonly string[]>>;
  /** "Mostrar as que tirei": as linhas tiradas voltam à lista, marcadas. */
  mostrarTirados: boolean;
}

const PADRAO: Organizacao = {
  ordem: 'cai',
  vista: 'cai',
  grupo: false,
  fixos: {},
  tirados: {},
  mostrarTirados: false,
};

const CHAVE = 'arretado:fio:varal:v1';

const ehOrdem = (v: unknown): v is Ordem => typeof v === 'string' && Object.hasOwn(ORDENS, v);
const ehVista = (v: unknown): v is Vista => typeof v === 'string' && Object.hasOwn(VISTAS, v);

/** `{ folheto: [ids] }` lido do armazenamento: só o que tem a forma certa fica. */
function listasPorFolheto(v: unknown): Record<string, readonly string[]> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
  const saida: Record<string, readonly string[]> = {};
  for (const [folheto, ids] of Object.entries(v)) {
    if (Array.isArray(ids))
      saida[folheto] = ids.filter((id): id is string => typeof id === 'string');
  }
  return saida;
}

/** O que o armazenamento devolve vira uma `Organizacao` válida; o que não se lê volta ao padrão. */
function validar(bruto: unknown): Organizacao {
  if (typeof bruto !== 'object' || bruto === null) return PADRAO;
  const o = bruto as Record<string, unknown>;
  return {
    ordem: ehOrdem(o.ordem) ? o.ordem : PADRAO.ordem,
    vista: ehVista(o.vista) ? o.vista : PADRAO.vista,
    grupo: o.grupo === true,
    fixos: listasPorFolheto(o.fixos),
    tirados: listasPorFolheto(o.tirados),
    mostrarTirados: o.mostrarTirados === true,
  };
}

function ler(): Organizacao {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto === null ? PADRAO : validar(JSON.parse(bruto));
  } catch {
    return PADRAO;
  }
}

let atual: Organizacao | undefined;
const ouvintes = new Set<() => void>();

/** O que está valendo agora. O objeto só muda quando algo muda (o React compara por identidade). */
export function organizacaoAgora(): Organizacao {
  atual ??= ler();
  return atual;
}

function avisar() {
  ouvintes.forEach((o) => {
    o();
  });
}

function gravar(proximo: Organizacao) {
  atual = proximo;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(proximo));
  } catch {
    /* sem armazenamento: vale só nesta aba */
  }
  avisar();
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  // Outra aba do app mexeu: relê.
  const aoMudarFora = (e: StorageEvent) => {
    if (e.key !== CHAVE) return;
    atual = undefined;
    avisar();
  };
  window.addEventListener('storage', aoMudarFora);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener('storage', aoMudarFora);
  };
}

/** A organização do Varal, que se atualiza em toda tela que a lê. */
export function useOrganizacao(): Organizacao {
  return useSyncExternalStore(assinar, organizacaoAgora, () => PADRAO);
}

/** Ordem, vista, agrupamento e "mostrar as que tirei". */
export function mudarOrganizacao(
  parte: Partial<Pick<Organizacao, 'ordem' | 'vista' | 'grupo' | 'mostrarTirados'>>,
): void {
  gravar({ ...organizacaoAgora(), ...parte });
}

function comIds(
  lista: Readonly<Record<string, readonly string[]>>,
  folheto: string,
  ids: readonly string[],
  poe: boolean,
): Record<string, readonly string[]> {
  const atuais = lista[folheto] ?? [];
  const proximos = poe
    ? [...atuais, ...ids.filter((id) => !atuais.includes(id))]
    : atuais.filter((id) => !ids.includes(id));
  return { ...lista, [folheto]: proximos };
}

/** Fixa (ou solta) uma linha no alto do folheto. */
export function fixarNoAlto(folheto: string, id: string, fixa: boolean): void {
  const o = organizacaoAgora();
  gravar({ ...o, fixos: comIds(o.fixos, folheto, [id], fixa) });
}

/** Tira linhas do varal (só neste aparelho: nada é apagado). */
export function tirarDoVaral(folheto: string, ids: readonly string[]): void {
  const o = organizacaoAgora();
  gravar({ ...o, tirados: comIds(o.tirados, folheto, ids, true) });
}

/** Devolve ao varal o que foi tirado. */
export function devolverAoVaral(folheto: string, ids: readonly string[]): void {
  const o = organizacaoAgora();
  gravar({ ...o, tirados: comIds(o.tirados, folheto, ids, false) });
}

/** A bolinha do botão "Organizar": acesa quando há algo fora do padrão (`marca-org` do mockup). */
export const haOrganizacao = (o: Organizacao): boolean =>
  o.ordem !== PADRAO.ordem || o.vista !== PADRAO.vista || o.grupo || o.mostrarTirados;

/** Para os testes: volta ao padrão e esquece o que o armazenamento guardava. */
export function esquecerOrganizacao(): void {
  atual = undefined;
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    /* sem armazenamento */
  }
  avisar();
}
