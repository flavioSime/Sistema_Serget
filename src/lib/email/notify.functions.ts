import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enviarNotificacao, type NotifyTipo } from "./notify.server";

export const notificarEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as {
      tipo?: NotifyTipo;
      entidade_id?: string;
      payload?: Record<string, unknown>;
    };
    if (!d?.tipo || !d?.entidade_id) throw new Error("tipo e entidade_id obrigatórios.");
    return { tipo: d.tipo, entidade_id: d.entidade_id, payload: d.payload ?? {} };
  })
  .handler(async ({ data, context }) => {
    return enviarNotificacao({ ...data, userId: context.userId });
  });
