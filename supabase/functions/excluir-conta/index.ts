// Edge Function `excluir-conta` (Deno). Deploy é passo do Gabriel/da Fila, com sim explícito:
//   supabase functions deploy excluir-conta   (o JWT é validado aqui dentro, em `usuarioDoToken`)
// Segredos: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem no ambiente das funções.
// Não é compilado pelo tsc do repositório (tipos do Deno); a lógica testada está em handler.ts.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { excluirConta } from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function listarObjetos(uid: string): Promise<string[]> {
  const caminhos: string[] = [];
  for (let desvio = 0; ; desvio += 100) {
    const { data, error } = await admin.storage
      .from('backups')
      .list(uid, { limit: 100, offset: desvio });
    if (error) throw error;
    if (data.length === 0) break;
    caminhos.push(...data.map((o) => `${uid}/${o.name}`));
    if (data.length < 100) break;
  }
  return caminhos;
}

Deno.serve(async (req) => {
  const r = await excluirConta(
    {
      metodo: req.method,
      origem: req.headers.get('origin'),
      autorizacao: req.headers.get('authorization'),
    },
    {
      usuarioDoToken: async (token) => {
        const { data, error } = await admin.auth.getUser(token);
        return error || !data.user ? null : { id: data.user.id };
      },
      listarObjetos,
      apagarObjetos: async (caminhos) => {
        const { error } = await admin.storage.from('backups').remove(caminhos);
        if (error) throw error;
      },
      registrarExclusao: async (tinhaCopia) => {
        const { error } = await admin
          .schema('arretado')
          .from('exclusoes')
          .insert({ tinha_copia: tinhaCopia });
        if (error) throw error;
      },
      apagarUsuario: async (uid) => {
        const { error } = await admin.auth.admin.deleteUser(uid);
        if (error) throw error;
      },
    },
  );
  return new Response(r.corpo ? JSON.stringify(r.corpo) : null, {
    status: r.status,
    headers: { ...r.cabecalhos, 'Content-Type': 'application/json' },
  });
});
