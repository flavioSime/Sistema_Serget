import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listarDocumentacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documentacao_projeto")
      .select("*")
      .order("tipo", { ascending: true });
    if (error) throw new Error("Sem permissão para ver a documentação.");
    return { docs: data ?? [] };
  });

export const salvarDocumentacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as { id?: string; conteudo?: string };
    if (!d?.id || typeof d?.conteudo !== "string") throw new Error("Dados inválidos.");
    return { id: d.id, conteudo: d.conteudo };
  })
  .handler(async ({ data, context }) => {
    const { data: atual } = await context.supabase
      .from("documentacao_projeto")
      .select("versao")
      .eq("id", data.id)
      .maybeSingle();
    const novaVersao = (atual?.versao ?? 1) + 1;

    const { error } = await context.supabase
      .from("documentacao_projeto")
      .update({
        conteudo: data.conteudo,
        versao: novaVersao,
        atualizado_em: new Date().toISOString(),
        atualizado_por: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error("Não foi possível salvar.");
    return { ok: true, versao: novaVersao };
  });