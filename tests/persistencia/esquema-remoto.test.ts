import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { montarEsquema } from "../../src/composicao";

/**
 * O esquema remoto é criado na F0 e usado na F4 (D3): "ligar, não reconstruir". Estes testes
 * impedem a divergência silenciosa entre o banco local e a migração — o defeito que só apareceria
 * na F4, quando custaria caro.
 *
 * Não executam SQL (isso exige o projeto Supabase, que é do Gabriel): conferem a migração como texto.
 */
const SQL = readFileSync(
  join(import.meta.dirname, "..", "..", "supabase", "migrations", "0001_esquema_inicial.sql"),
  "utf8",
);

/** Tabelas que existem só no aparelho e não devem ir para o remoto. */
const SO_LOCAIS = [
  "meta", // estado deste aparelho
  "snapshots", // cópias de segurança locais, nunca enviadas
];

const paraSnakeCase = (nome: string): string =>
  nome.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);

const tabelasRemotas = (): string[] =>
  [...SQL.matchAll(/create table public\.(\w+)/g)].map((achado) => achado[1] as string);

const comRls = (): string[] => [
  // Habilitadas diretamente...
  ...[...SQL.matchAll(/alter table public\.(\w+) enable row level security/g)].map(
    (a) => a[1] as string,
  ),
  // ...e as tratadas em laço, cujos nomes estão nos arrays `text[] := array[...]`.
  ...[...SQL.matchAll(/text\[\] := array\[([\s\S]*?)\]/g)].flatMap((bloco) =>
    [...(bloco[1] ?? "").matchAll(/'(\w+)'/g)].map((nome) => nome[1] as string),
  ),
];

describe("esquema remoto com RLS (D3, D18)", () => {
  it("toda tabela local tem correspondente remota, salvo as que são só do aparelho", () => {
    const locais = Object.keys(montarEsquema()[1] ?? {}).filter((t) => !SO_LOCAIS.includes(t));
    const remotas = tabelasRemotas();

    const faltando = locais.map(paraSnakeCase).filter((nome) => !remotas.includes(nome));
    expect(faltando).toEqual([]);
  });

  it("nenhuma tabela remota é inventada sem existir no modelo local", () => {
    const locais = new Set(Object.keys(montarEsquema()[1] ?? {}).map(paraSnakeCase));
    const sobrando = tabelasRemotas().filter((nome) => !locais.has(nome));
    expect(sobrando).toEqual([]);
  });

  it("toda tabela remota tem RLS habilitada — sem política, sem acesso", () => {
    const protegidas = new Set(comRls());
    const desprotegidas = tabelasRemotas().filter((nome) => !protegidas.has(nome));
    expect(desprotegidas).toEqual([]);
  });

  it("as políticas isolam por auth.uid(), nunca por confiança no cliente", () => {
    // Políticas escritas diretamente e as geradas em laço por `execute format`.
    const politicas = [
      ...[...SQL.matchAll(/create policy [\s\S]*?;/g)].map((a) => a[0] as string),
      // No SQL gerado, a string termina em `',` — aspas internas aparecem duplicadas (`''`).
      ...[...SQL.matchAll(/'create policy [\s\S]*?',/g)].map((a) => a[0] as string),
    ];
    expect(politicas.length).toBeGreaterThan(8);

    const semIsolamento = politicas.filter(
      (politica) =>
        !politica.includes("auth.uid()") &&
        !politica.includes("escopo = ''catalogo''") &&
        !politica.includes("escopo = 'catalogo'"),
    );
    expect(semIsolamento).toEqual([]);
  });

  it("o conteúdo do catálogo é legível por todos e escrito só pelo curador (§8.1)", () => {
    expect(SQL).toMatch(/normas_do_catalogo_sao_publicas[\s\S]*?for select/);
    expect(SQL).toMatch(/normas_do_catalogo_escrita_do_curador[\s\S]*?curador_id = auth\.uid\(\)/);
  });

  it("a exclusão de conta leva tudo junto, em cascata (LGPD)", () => {
    const referencias = [...SQL.matchAll(/references public\.usuarios \(id\)([^,\n]*)/g)].map(
      (a) => a[1] as string,
    );
    const semTratamento = referencias.filter(
      (trecho) => !trecho.includes("on delete cascade") && !trecho.includes("on delete set null"),
    );
    expect(semTratamento).toEqual([]);
  });

  it("o id é sempre gerado pelo cliente: o servidor não inventa identificador", () => {
    expect(SQL).not.toMatch(/id uuid primary key default/);
  });
});
