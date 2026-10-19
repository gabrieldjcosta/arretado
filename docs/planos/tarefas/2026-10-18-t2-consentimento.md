# Tarefa: T2 Consentimento gravado no login e exigido na cópia na nuvem
Atividade: F4-A, A7 código (lacunas da revisão do #184) · Nível de risco: **B**, escalado (privacidade/LGPD: o construtor pergunta antes de qualquer escolha fora deste contrato) · Construtor: Claude Sonnet 5.5 médio (conta `claude`) · Revisor: `cline`
Branch: `claude/f4a-t2-consentimento` · Base: `integracao` **depois** da T1 parte 1 mesclada (confira que `src/core/preferencias/consentimento.ts` existe na base)

## Objetivo
Fechar as duas lacunas achadas pelo Cline no #184:
1. **Login:** o aceite `v3:login` só é gravado em `Usuario.consentimentos` quando a pessoa abre Conta. Passar a gravar assim que o banco da conta abre.
2. **Cópia na nuvem:** "Guardar cópia na nuvem" não exige nem grava `v3:backup-nuvem`. Passar a exigir o aceite (texto pronto em `docs/politica/consentimento-login-backup.md`) antes do primeiro envio e gravá-lo.
3. (baixo) Se o navegador não deixar guardar a marca do aceite (`localStorage` lança), mostrar aviso próprio ("Não foi possível guardar o seu aceite neste navegador.") em vez de "Sem aceitar não dá para entrar".

## Escopo
Arquivos permitidos:
- `src/apresentacao/dados/ProvedorRepositorio.tsx` (chamar `registrarAceitePendente` depois de `abrirRepositorioAtivo`, só com `contasHabilitadas()`; idempotente, não bloqueia a abertura se falhar);
- `src/apresentacao/conta/entrar/{aceite.ts,Entrar.tsx,RegistrarAceite.tsx}` e testes ao lado;
- `src/apresentacao/conta/dados/NuvemBackup.tsx` e um teste **novo** `NuvemBackupConsentimento.test.tsx` (o `NuvemBackup.test.tsx` é da T3);
- `src/core/preferencias/consentimento.ts` só se faltar uma função pura; testes ao lado;
- `docs/politica/consentimento-login-backup.md` (ajustar a frase "O aceite é registrado…" ao que o código faz: Aparelho sempre; servidor só os termos de teste, até a D2), `docs/glossario.md` e `docs/solucao-de-problemas.md` por acréscimo.
Não alterar: `supabase/`, `src/integracoes/conta/` (inclusive `backup-nuvem.ts`, que é da T3), `registrarConsentimentoNoServidor` (segue porta nula; D2 é do Gabriel), `servico.aceitarTermos('teste-1')` no Entrar (mantém), `estilos.css`, `package.json`, esquema.

## Regras
- A lógica de "precisa pedir o aceite?" fica numa função pura testável (`temConsentimento`/`exigirConsentimento`); o componente só mostra.
- Bloco de consentimento com marcação semântica (`fieldset`/`legend` ou `role="group"` com rótulo; caixa de marcar sem pré-marcação; botão "Guardar cópia na nuvem" desabilitado até marcar), classes já existentes ou de `estilos-conta.css`. **Visual: AGUARDA THREAD DE UI** (fase P6 do Ponto de luz); não invente estilo novo.
- Aceito uma vez (versão v3), não pede de novo. Versão diferente pede.
- Com `VITE_CONTA=0`, nada muda (o componente segue `null`).

## Critérios de aceite
- [ ] Entrar e não abrir Conta: `Usuario.consentimentos` tem `v3:login` (teste com `ServicoDeContaFalso` e o provedor do repositório).
- [ ] Guardar cópia na nuvem sem aceite: nada é enviado (o falso não recebe `enviarCopia`); com aceite: envia e `v3:backup-nuvem` fica gravado; segunda cópia não pede de novo.
- [ ] Falha do `localStorage` mostra o aviso próprio.
- [ ] Testes existentes do #184 e do A6 seguem verdes; vocabulário obrigatório; nenhum rótulo clínico.

## Verificação
`npm run check` (saída para arquivo, procurar falhas). Evidência: contagem de testes, nomes dos testes novos e uma mutação que derruba cada critério (ex.: remover a chamada no provedor; enviar sem `exigirConsentimento`).

## Pare e pergunte se
- precisar gravar o aceite no servidor ou mudar `aceitar_termos`/`supabase/`;
- precisar de campo novo no esquema (o `Usuario.consentimentos` da v8 deve bastar);
- precisar mexer em `backup-nuvem.ts` ou no `NuvemBackup.test.tsx` (dono: T3);
- a mesma falha repetir duas vezes.

## Relatório final
resumo · arquivos · comandos e resultado · riscos · SHA · link do PR
