import { type Core, inicializarCore } from "@core/inicializar";
import {
  BancoArretado,
  ESQUEMA_CORE,
  type EsquemaVersionado,
  type IndicesPorTabela,
} from "@core/persistencia/db";
import { ESQUEMA_CATALOGO } from "@dominios/catalogo/esquema";
import { ESQUEMA_EXECUCAO } from "@dominios/execucao/esquema";
import { ESQUEMA_INTELIGENCIA } from "@dominios/inteligencia/esquema";
import { ESQUEMA_LEGISLACAO } from "@dominios/legislacao/esquema";
import { ESQUEMA_NOTAS } from "@dominios/notas/esquema";
import { ESQUEMA_PLANO } from "@dominios/plano/esquema";
import { ESQUEMA_PRECEDENTES } from "@dominios/precedentes/esquema";
import { ESQUEMA_RECALL } from "@dominios/recall/esquema";
import { ESQUEMA_RELATAR } from "@suporte/relatar/esquema";
import { ServicoDeRelatos } from "@suporte/relatar/servico";

/**
 * Raiz de composição: o único arquivo que enxerga todas as camadas. O Core não conhece os domínios
 * (§6), mas o Dexie exige um esquema único — então cada domínio declara suas tabelas e aqui elas
 * são juntadas. Para acrescentar um domínio, basta importar o `ESQUEMA_*` dele nesta lista.
 */
const ESQUEMAS = [
  ESQUEMA_CORE,
  ESQUEMA_PLANO,
  ESQUEMA_EXECUCAO,
  ESQUEMA_RECALL,
  ESQUEMA_LEGISLACAO,
  ESQUEMA_CATALOGO,
  ESQUEMA_PRECEDENTES,
  ESQUEMA_NOTAS,
  ESQUEMA_INTELIGENCIA,
  ESQUEMA_RELATAR,
];

/** Junta os esquemas por versão. Uma tabela declarada duas vezes na mesma versão é um erro. */
export function montarEsquema(
  esquemas: readonly EsquemaVersionado[] = ESQUEMAS,
): EsquemaVersionado {
  const resultado: EsquemaVersionado = {};
  for (const esquema of esquemas) {
    for (const [versao, tabelas] of Object.entries(esquema)) {
      const numero = Number(versao);
      resultado[numero] ??= {};
      const destino: IndicesPorTabela = resultado[numero];
      for (const [tabela, indices] of Object.entries(tabelas)) {
        if (tabela in destino) {
          throw new Error(`Tabela "${tabela}" declarada duas vezes na versão ${versao}.`);
        }
        destino[tabela] = indices;
      }
    }
  }
  return resultado;
}

export function criarBanco(nome = "arretado"): BancoArretado {
  return new BancoArretado(nome, montarEsquema());
}

/** O que a interface recebe: o Core e os serviços que não pertencem a nenhum domínio de estudo. */
export interface Aplicacao {
  core: Core;
  relatos: ServicoDeRelatos;
}

/** Sobe o app inteiro: banco com todas as tabelas + Core + serviços de suporte. */
export async function iniciar(nome?: string): Promise<Aplicacao> {
  const core = await inicializarCore(criarBanco(nome));
  const contexto = () => core.identidade;
  return { core, relatos: new ServicoDeRelatos(core.db, contexto, core.relogio) };
}

/** Monta a Aplicação a partir de um Core já criado (usado pelos testes de interface). */
export function comporApartirDoCore(core: Core): Aplicacao {
  return { core, relatos: new ServicoDeRelatos(core.db, () => core.identidade, core.relogio) };
}
