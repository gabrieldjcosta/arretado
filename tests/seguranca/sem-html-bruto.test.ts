import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = join(import.meta.dirname, "..", "..", "src");

/**
 * O app nunca renderiza HTML: sanitizar e **converter em estrutura** é a regra (D13, D18).
 * O sanitizador é o único lugar que pode tocar `innerHTML`, e ainda assim num `<template>`
 * fora do documento e só depois do DOMPurify.
 */
const EXCECOES = ["core/seguranca/sanitizar.ts"];

const PROIBIDO = [
  "dangerouslySetInnerHTML",
  "innerHTML",
  "outerHTML",
  "insertAdjacentHTML",
  "document.write",
  "eval(",
  "new Function(",
];

function arquivosDeCodigo(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivosDeCodigo(caminho);
    return /\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

describe("nenhuma injeção de HTML no projeto (D18)", () => {
  it.each(PROIBIDO)("nenhum arquivo de src usa %s", (termo) => {
    const infratores = arquivosDeCodigo(RAIZ)
      .map((caminho) => ({ caminho, conteudo: readFileSync(caminho, "utf8") }))
      .filter(({ caminho }) => !EXCECOES.includes(relative(RAIZ, caminho).replaceAll("\\", "/")))
      .filter(({ conteudo }) => conteudo.includes(termo))
      .map(({ caminho }) => relative(RAIZ, caminho));

    expect(infratores).toEqual([]);
  });

  it("a exceção do sanitizador continua sendo uma só", () => {
    const comInnerHtml = arquivosDeCodigo(RAIZ)
      .filter((caminho) => readFileSync(caminho, "utf8").includes("innerHTML"))
      .map((caminho) => relative(RAIZ, caminho).replaceAll("\\", "/"));
    expect(comInnerHtml).toEqual(EXCECOES);
  });
});
