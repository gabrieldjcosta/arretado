import { EsquemaEntidadeBase } from "@core/persistencia/modelo";
import { z } from "zod";

/**
 * Relato de **Problema** — falha da plataforma, nunca "erro" (D24). Um por usuário por dia (D23);
 * sem remoto, fica em fila local. **Nunca contém dados de estudo** (§5.3, D18).
 */
export const EsquemaRelatoDeProblema = EsquemaEntidadeBase.extend({
  descricao: z.string().min(1),
  tela: z.string(),
  versaoDoApp: z.string(),
  aparelhoId: z.string(),
  status: z.enum(["aguardandoEnvio", "enviado", "respondido"]),
  resposta: z.string().optional(),
});
export type RelatoDeProblema = z.infer<typeof EsquemaRelatoDeProblema>;
