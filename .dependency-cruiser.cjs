/** Regras de dependência do §6 da Parte 1 e de T3/T5 (docs/decisoes-tecnicas.md). */
module.exports = {
  forbidden: [
    {
      name: "core-nao-depende-de-nada",
      comment: "Core só importa Core (§6).",
      severity: "error",
      from: { path: "^src/core/" },
      to: { path: "^src/(dominios|integracoes|apresentacao|suporte)/" },
    },
    {
      name: "dominio-so-depende-do-core",
      comment: "Domínios dependem só do Core; referências cruzadas são por ids + eventos (§6).",
      severity: "error",
      from: { path: "^src/dominios/([^/]+)/", pathNot: "^src/dominios/legislacao/" },
      to: { path: "^src/dominios/([^/]+)/", pathNot: "^src/dominios/$1/" },
    },
    {
      name: "legislacao-le-so-catalogo",
      comment: "Legislação é o único domínio que lê outro (Catálogo), nunca escreve (§6).",
      severity: "error",
      from: { path: "^src/dominios/legislacao/" },
      to: { path: "^src/dominios/([^/]+)/", pathNot: "^src/dominios/(legislacao|catalogo)/" },
    },
    {
      name: "dominio-nao-depende-de-cima",
      severity: "error",
      from: { path: "^src/dominios/" },
      to: { path: "^src/(integracoes|apresentacao|suporte)/" },
    },
    {
      name: "integracoes-nao-dependem-da-apresentacao",
      severity: "error",
      from: { path: "^src/integracoes/" },
      to: { path: "^src/(apresentacao|suporte)/" },
    },
    {
      name: "dexie-so-na-persistencia",
      comment:
        "Dexie fica atrás de core/persistencia (T3); troca por SQLite-wasm não toca domínios.",
      severity: "error",
      from: { pathNot: "^src/core/persistencia/" },
      to: { path: "^node_modules/dexie/", dependencyTypesNot: ["type-only"] },
    },
    {
      name: "sem-ciclos",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
