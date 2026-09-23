/**
 * Versão do esquema local. Sobe a cada `version(n)` em `core/persistencia/db.ts` e vai no manifesto
 * do pacote (T6): pacote com versão maior que esta é recusado com mensagem clara (§7.2).
 */
export const VERSAO_ESQUEMA = 1;

/** Versão do app exibida em Conta, gravada em relatos de Problema e no manifesto do pacote. */
export const VERSAO_APP = "0.0.1";
