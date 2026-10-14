-- Reversão da F4-A (A2). Antes: esvaziar o bucket `backups` pela API ou pelo painel do Storage
-- (apagar objetos por SQL deixa os arquivos órfãos) e desligar o gancho em Auth › Hooks.
-- Os dados de `perfis` e `convites` somem junto; exportar antes se importar.
drop policy if exists backups_ler_proprios on storage.objects;
drop policy if exists backups_gravar_proprios on storage.objects;
drop policy if exists backups_apagar_proprios on storage.objects;
delete from storage.buckets where id = 'backups';
drop trigger if exists criar_perfil_ao_criar_conta on auth.users;
drop function if exists arretado.criar_perfil();
drop function if exists arretado.aceitar_termos(text);
drop function if exists arretado.hook_antes_de_criar_usuario(jsonb);
drop table if exists arretado.exclusoes;
drop table if exists arretado.perfis;
drop table if exists arretado.convites;
