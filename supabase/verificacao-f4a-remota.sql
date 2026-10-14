-- Arretado — conferência da F4-A (A2) no projeto Supabase real. Não é migração.
-- Rodar DEPOIS de aplicar 20261014020000_f4a_contas.sql e ligar o gancho (plano §12). Tudo numa
-- transação desfeita; o último SELECT devolve a tabela. Esperado: 01 → 1, 02 → 0, 03–07 → recusado.
begin;
insert into auth.users (id, email) values
  ('0199a6c4-0000-7000-8000-00000000000a', 'verificacao-a@invalido.test'),
  ('0199a6c4-0000-7000-8000-00000000000b', 'verificacao-b@invalido.test');
create temp table resultado (teste text primary key, obtido text) on commit drop;
grant select, insert on resultado to authenticated, anon;

set local role authenticated;
set local request.jwt.claim.sub = '0199a6c4-0000-7000-8000-00000000000a';
insert into resultado select '01 A lê o próprio perfil', count(*)::text from arretado.perfis;
insert into resultado select '02 A lê o perfil de B', count(*)::text
  from arretado.perfis where usuario_id = '0199a6c4-0000-7000-8000-00000000000b';

do $$ begin
  begin update arretado.perfis set direito_ia = true;
    insert into resultado values ('03 A altera direito_ia', 'aceitou');
  exception when others then insert into resultado values ('03 A altera direito_ia', 'recusado ' || sqlstate); end;
  begin perform count(*) from arretado.convites;
    insert into resultado values ('04 A lê convites', 'aceitou');
  exception when others then insert into resultado values ('04 A lê convites', 'recusado ' || sqlstate); end;
  begin perform arretado.hook_antes_de_criar_usuario('{}'::jsonb);
    insert into resultado values ('05 A executa o gancho', 'aceitou');
  exception when others then insert into resultado values ('05 A executa o gancho', 'recusado ' || sqlstate); end;
  begin insert into storage.objects (bucket_id, name) values ('backups', '0199a6c4-0000-7000-8000-00000000000b/x');
    insert into resultado values ('06 A grava na pasta de B', 'aceitou');
  exception when others then insert into resultado values ('06 A grava na pasta de B', 'recusado ' || sqlstate); end;
end $$;

set local role anon;
do $$ begin
  begin perform count(*) from arretado.perfis;
    insert into resultado values ('07 anônimo lê perfis', 'aceitou');
  exception when others then insert into resultado values ('07 anônimo lê perfis', 'recusado ' || sqlstate); end;
end $$;

reset role;
select * from resultado order by teste;
rollback;
