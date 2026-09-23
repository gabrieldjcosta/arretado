import { v7 } from "uuid";

/** Identificador estável de entidade: UUIDv7, gerado no cliente, ordenável por tempo (T4, §8.1). */
export type Id = string;

export const novoId = (): Id => v7();

const FORMATO_UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ehId = (valor: unknown): valor is Id =>
  typeof valor === "string" && FORMATO_UUID_V7.test(valor);
