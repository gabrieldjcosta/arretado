-- Arretado — F4-A (contas), pacote A2. Aditiva: nenhuma tabela existente é alterada.
-- Plano: docs/planos/f4a-contas.md §3 e §8. Reversão: supabase/rollback/20261014020000_f4a_contas.down.sql.
--   perfis      — um por conta (direito e acesso vêm do servidor; o cliente só lê)
--   convites    — quem pode criar conta na V1 (o cliente nunca toca)
--   gancho      — função do "Before User Created" do Supabase: recusa e-mail fora de `convites`
--   exclusoes   — contagem anônima de exclusões (preenchida só pela função de exclusão, A5)
--   bucket      — `backups`, privado, uma pasta por conta (A6)
-- A ligação do gancho em Auth › Hooks é passo manual do Gabriel (plano §12.4).

-- ── Convites (RLS ligada, sem política para o cliente; funções security definer leem) ──────────
create table arretado.convites (
  email       text        primary key check (email = lower(email) and email like '%_@_%'),
  criado_em   timestamptz not null default now(),
  usado_em    timestamptz,
  observacao  text
);
alter table arretado.convites enable row level security;
revoke all on arretado.convites from anon, authenticated;

-- ── Perfis ───────────────────────────────────────────────────────────────────────────────────
create table arretado.perfis (
  usuario_id        uuid        primary key references auth.users (id) on delete cascade,
  termos_versao     text        check (termos_versao is null or length(termos_versao) between 1 and 32),
  termos_aceitos_em timestamptz,
  direito_ia        boolean     not null default false,
  beta              boolean     not null default false,
  criado_em         timestamptz not null default now()
);
alter table arretado.perfis enable row level security;
alter table arretado.perfis force row level security;
revoke all on arretado.perfis from anon, authenticated;
grant select on arretado.perfis to authenticated;
create policy perfis_ler_proprio on arretado.perfis
  for select to authenticated
  using (usuario_id = (select auth.uid()));

-- Perfil nasce com a conta; e-mail convidado marca o convite como usado e liga `beta`.
create function arretado.criar_perfil() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  convidado boolean;
begin
  convidado := exists (select 1 from arretado.convites c where c.email = lower(new.email));
  insert into arretado.perfis (usuario_id, beta) values (new.id, convidado)
    on conflict (usuario_id) do nothing;
  if convidado then
    update arretado.convites set usado_em = coalesce(usado_em, now()) where email = lower(new.email);
  end if;
  return new;
end;
$$;
revoke execute on function arretado.criar_perfil() from public, anon, authenticated;
create trigger criar_perfil_ao_criar_conta
  after insert on auth.users
  for each row execute function arretado.criar_perfil();

-- Único jeito de o cliente escrever no perfil: aceitar a versão dos termos (só no próprio).
create function arretado.aceitar_termos(versao text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sem sessão' using errcode = '28000';
  end if;
  if versao is null or length(versao) not between 1 and 32 then
    raise exception 'versão inválida' using errcode = '22023';
  end if;
  update arretado.perfis set termos_versao = versao, termos_aceitos_em = now()
    where usuario_id = auth.uid();
end;
$$;
revoke execute on function arretado.aceitar_termos(text) from public, anon;
grant execute on function arretado.aceitar_termos(text) to authenticated;

-- ── Gancho "Before User Created" (Google e código por e-mail passam por aqui) ──────────────────
create function arretado.hook_antes_de_criar_usuario(event jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  endereco text := lower(coalesce(event->'user'->>'email', ''));
begin
  if endereco <> '' and exists (select 1 from arretado.convites c where c.email = endereco) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'message', 'Este e-mail ainda não foi liberado para o Arretado.',
    'http_code', 403
  ));
end;
$$;
revoke execute on function arretado.hook_antes_de_criar_usuario(jsonb) from public, anon, authenticated;
grant usage on schema arretado to supabase_auth_admin;
grant execute on function arretado.hook_antes_de_criar_usuario(jsonb) to supabase_auth_admin;

-- ── Exclusões: só data e se havia cópia, sem e-mail nem id (preenchida pela função de exclusão) ──
create table arretado.exclusoes (
  id           bigint      generated always as identity primary key,
  em           date        not null default current_date,
  tinha_copia  boolean     not null default false
);
alter table arretado.exclusoes enable row level security;
revoke all on arretado.exclusoes from anon, authenticated;

-- ── Bucket de cópias cifradas (A6): privado, uma pasta por conta ──────────────────────────────
-- Limite provisório de 50 MB por objeto; revisar com a medição do A0 (scripts/medir-banco.mjs).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backups', 'backups', false, 52428800, array['application/octet-stream'])
on conflict (id) do nothing;

create policy backups_ler_proprios on storage.objects
  for select to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy backups_gravar_proprios on storage.objects
  for insert to authenticated
  with check (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy backups_apagar_proprios on storage.objects
  for delete to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text);
