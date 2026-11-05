# Biblioteca visual do Arretado

Fonte única das referências de UX/UI: o que cada uma dá, o que não pegar, licença, custo, se abre na nuvem e onde entra no app.

- `dados.json`: **a única coisa que se edita**. Referências e casos de uso.
- `visual.template.html` (editável: demos vivas) e `referencias.md` + `index.html` (gerados por `node scripts/biblioteca.mjs`; `index.html` é a página publicada, não editar à mão).
- `registro.md`: achados datados do agente semanal e das pessoas (só se acrescenta).
- `agente-semanal.md`: instrução da rotina que procura novidades.

Página publicada: gerada de `index.html` (link no PR).

## Regras
1. O mockup aprovado (`docs/design/fio/mockup-aprovado.html`) manda; a biblioteca só entra onde dá comportamento ou acabamento. Fidelidade e desvios: `docs/design/desvios.md`.
2. Todo PR de UI cita a referência usada (campo `id` de `dados.json`) ou diz que não usou nenhuma.
3. Licença antes de copiar: MIT, ISC e Apache-2.0 podem; React Bits tem Commons Clause; galerias (Godly, Land-book, Mobbin) são só inspiração, sem ativo copiado. Gasto só com aval do Gabriel.
4. Referência nova entra com veredito (`usar`, `avaliar`, `referência`, `adiar`, `evitar`), licença, custo e "pegar / não pegar". Sem isso não entra.
5. Caso de uso novo (tela ou componente previsto) entra em `casos` com a referência que o governa, mesmo antes de existir no app.
6. Ao mudar `dados.json`, rodar o gerador e commitar os três arquivos.

Relacionados: `docs/design/movimento-e-bibliotecas.md` (qual lib por tipo de elemento), `docs/design/desvios.md`, `DESIGN.md`.
