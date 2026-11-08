## D-D-fio-padrao — O Fio é a interface padrão (06/11/2026)

Gabriel abriu o app publicado e não viu a cara nova: o Fio estava pronto, mas atrás do interruptor `arretado:interface` (padrão `atual`). Decisão dele em cartão: o Fio vira o padrão para todo mundo. Sem valor guardado a interface é o Fio; a Conta ("Arretado novo") guarda `atual` para quem quiser voltar à de antes. Nos testes, `src/testes/setup.ts` e o `storageState` do `playwright.config.ts` partem da interface de antes; os specs do Fio abrem `#/fio/ligar`.
