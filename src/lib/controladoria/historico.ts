import { supabase } from "@/integrations/supabase/client";

export async function logHistorico(
  entidade: string,
  entidade_id: string,
  acao: string,
  payload?: Record<string, unknown>,
) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("historico").insert({
    entidade,
    entidade_id,
    acao,
    payload: payload ?? null,
    user_id: user?.id ?? null,
  });
}
