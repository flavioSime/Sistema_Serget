import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Stub de notificações por email do fluxo PJ.
 *
 * Os disparos reais usarão Lovable Emails assim que o domínio estiver
 * verificado em Lovable Cloud → Emails. Por enquanto, esta função grava
 * a intenção em `historico` para auditoria/diagnóstico, sem enviar.
 *
 * Tipos suportados:
 *  - "ficha_recebida"       -> controladoria
 *  - "reenvio_documento"    -> fornecedor
 *  - "ficha_aprovada"       -> fornecedor
 *  - "contrato_pronto"      -> fornecedor
 */
type NotifyTipo =
  | "ficha_recebida"
  | "reenvio_documento"
  | "ficha_aprovada"
  | "contrato_pronto";

export const notificarEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as { tipo?: NotifyTipo; entidade_id?: string; payload?: Record<string, unknown> };
    if (!d?.tipo || !d?.entidade_id) throw new Error("tipo e entidade_id obrigatórios.");
    return {
      tipo: d.tipo,
      entidade_id: d.entidade_id,
      payload: d.payload ?? {},
    };
  })
  .handler(async ({ data, context }) => {
    // TODO Lovable Emails: enviar email real assim que o domínio estiver
    // configurado. Por agora, registra em histórico para rastreabilidade.
    console.info("[notify]", data.tipo, data.entidade_id, data.payload);
    await supabaseAdmin.from("historico").insert({
      entidade: "email",
      entidade_id: data.entidade_id,
      acao: `email_${data.tipo}`,
      user_id: context.userId,
      payload: data.payload as never,
    });
    return { ok: true, enviado: false, motivo: "domínio de email pendente" };
  });