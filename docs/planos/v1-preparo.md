# V1 — preparo e roteiro de segurança

Roteiro do que conferir antes de convidar alguém para a V1 (plano-mestre §6; plano da F4-A, §11 e §12). A V1 são 3 a 5 pessoas conhecidas, sem ajuda ao vivo. A política v3, os termos de teste e o texto de consentimento estão em [`../politica/`](../politica/).

## 1. Decisões do Gabriel antes de convidar

- [ ] Controlador: pessoa física ou empresa — [A DEFINIR PELO GABRIEL: …] (dito na política v3).
- [ ] Contato do encarregado — [A DEFINIR PELO GABRIEL: …] (dito na política v3 e nos termos de teste).
- [ ] Canal direto para a V1, além do botão "!" — [A DEFINIR PELO GABRIEL: …, se houver.]
- [ ] Revisão da política por pessoa habilitada: recomendada antes de convidar quem não seja conhecido. Sem revisão, só conhecidos, com o aviso de versão de teste.

## 2. Passos no painel (plano da F4-A §12)

- [ ] Supabase › Settings › API: expor o esquema `arretado`.
- [ ] Supabase › Auth › URL Configuration: Site URL e as duas URLs de retorno.
- [ ] Google Cloud: tela de consentimento publicada em produção (escopos e-mail e perfil); cliente OAuth tipo Web com a URL de retorno do Supabase; ID e segredo em Supabase › Auth › Providers › Google. Tela em modo "teste" expira o consentimento em 7 dias: publicar antes da V1.
- [ ] Supabase › Auth › Hooks: ligar o Before User Created na função do pacote A2.
- [ ] Supabase › Auth › Providers › Email: confirmação ligada, login só por código.
- [ ] Deploy da Edge Function `excluir-conta` (só com o sim do Gabriel).
- [ ] Rodar `supabase/verificacao-rls-remota.sql` no projeto real depois de tudo.

## 3. Fumaça antes de convidar (contas de teste do Gabriel)

- [ ] Convidar as contas de teste (comando abaixo).
- [ ] Entrar com Google e com código por e-mail; e-mail fora da lista não entra.
- [ ] "Usar sem conta" segue funcionando.
- [ ] Cópia cifrada na nuvem: guardar, listar, restaurar com prévia; frase errada não abre.
- [ ] Excluir conta: estados visíveis, nada sobra consultável, banco local apagado se escolhido.
- [ ] Conferir por consulta: nenhum conteúdo de estudo no servidor.
- [ ] Entrar A, sair, entrar B: sem mistura de dados.

## 4. Comando de convite (pronto; trocar os e-mails)

Rode no SQL Editor do Supabase. E-mail em minúsculas — a lista só aceita assim. Nada de dado real de ninguém além dos e-mails das pessoas convidadas.

```sql
-- Convidar quem testa a V1
insert into arretado.convites (email, observacao) values
  ('convidado-1@exemplo.com', 'V1 — trocar pelo e-mail real'),
  ('convidado-2@exemplo.com', 'V1 — trocar pelo e-mail real')
on conflict (email) do nothing;

-- Conferir a lista
select email, criado_em, usado_em from arretado.convites order by criado_em;

-- Tirar quem ainda não entrou
-- delete from arretado.convites
--   where email = 'convidado-1@exemplo.com' and usado_em is null;
```

## 5. O que ainda é código (antes da V1)

- "Apagar tudo e recomeçar": exclui o banco local e os objetos da nuvem, mantém a conta (o ambiente reiniciável do plano-mestre §6).
- Registro do consentimento: no servidor (`aceitar_termos`) e no Aparelho (`Usuario.consentimentos`), com o texto de [`../politica/consentimento-login-backup.md`](../politica/consentimento-login-backup.md).
- Tela Conta › Privacidade passando a mostrar a política v3 (o texto já está pronto em [`../politica/`](../politica/)).
- E2E de Entrar com `VITE_CONTA=1` e axe nos dois temas (pendência da A3).
- Consulta leve diária (GitHub Actions) que mantém o projeto Supabase ativo no plano gratuito.
