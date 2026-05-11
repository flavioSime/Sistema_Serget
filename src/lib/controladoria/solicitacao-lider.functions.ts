import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { Resend } from "resend";

/** Cria solicitação de contratação a partir do líder, junto com o registro
 *  base do prestador. Usa admin client para contornar a RLS de prestadores
 *  (que só permite controladoria inserir). */
export const criarSolicitacaoLider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as Record<string, unknown>;
    const required = [
      "tipo_pj",
      "razao_social",
      "email_contato",
      "servico_descricao",
      "area_solicitante",
      "centro_custo",
      "responsavel_contratacao_id",
    ];
    for (const k of required) {
      if (!d?.[k]) throw new Error(`Campo obrigatório ausente: ${k}`);
    }
    const valor = Number(d.valor_estimado);
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error("Valor estimado inválido.");
    }
    return {
      tipo_pj: String(d.tipo_pj) as "A" | "B",
      razao_social: String(d.razao_social),
      email_contato: String(d.email_contato).trim().toLowerCase(),
      servico_descricao: String(d.servico_descricao),
      area_solicitante: String(d.area_solicitante),
      centro_custo: String(d.centro_custo),
      valor_estimado: valor,
      responsavel_contratacao_id: String(d.responsavel_contratacao_id),
      observacoes: d.observacoes ? String(d.observacoes) : null,
    };
  })
  .handler(async ({ data, context }) => {
    // 1. Cria prestador base
    const { data: prest, error: e1 } = await supabaseAdmin
      .from("prestadores")
      .insert({
        razao_social: data.razao_social,
        email_contato: data.email_contato,
        tipo: data.tipo_pj,
        status: "aguardando_aprovacao",
        criado_por: context.userId,
      })
      .select("id")
      .single();
    if (e1 || !prest) {
      console.error("[solicitacao-lider] prestador", e1);
      throw new Error("Não foi possível registrar o prestador.");
    }

    // 2. Cria solicitação
    const { data: sol, error: e2 } = await supabaseAdmin
      .from("solicitacoes_pj")
      .insert({
        tipo_pj: data.tipo_pj,
        area_solicitante: data.area_solicitante,
        servico_descricao: data.servico_descricao,
        valor_estimado: data.valor_estimado,
        centro_custo: data.centro_custo,
        responsavel_contratacao_id: data.responsavel_contratacao_id,
        observacoes: data.observacoes,
        solicitante_id: context.userId,
        lider_user_id: context.userId,
        prestador_id: prest.id,
        status: "aguardando_aprovacao",
      })
      .select("id")
      .single();
    if (e2 || !sol) {
      console.error("[solicitacao-lider] solicitacao", e2);
      throw new Error("Não foi possível registrar a solicitação.");
    }

    await supabaseAdmin.from("historico").insert({
      entidade: "solicitacao_pj",
      entidade_id: sol.id,
      acao: "criada_pelo_lider",
      user_id: context.userId,
      payload: { tipo_pj: data.tipo_pj, prestador_id: prest.id } as never,
    });

    // Notifica diretoria sobre nova solicitação (não bloqueia o fluxo)
    try {
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "diretoria");

      const userIds = (roles ?? []).map((r) => r.user_id);
      if (userIds.length > 0) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const emails = (users?.users ?? [])
          .filter((u) => userIds.includes(u.id) && u.email)
          .map((u) => u.email as string);

        const apiKey = process.env.RESEND_API_KEY;
        if (emails.length > 0 && apiKey) {
          const resend = new Resend(apiKey);
          const FROM = "SERGET <noreply@sistemaserget.com.br>";
          const APP_URL = process.env.VITE_APP_URL ?? "https://sistemaserget.com.br";
          const valorFmt = data.valor_estimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

          await resend.emails.send({
            from: FROM,
            to: emails,
            subject: `Nova solicitação de contratação PJ — ${data.razao_social}`,
            html: `
              <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
                <h2 style="color:#0f172a;font-size:18px;margin:0 0 16px;">Nova solicitação aguarda aprovação</h2>
                <p style="font-size:14px;">Uma nova solicitação de contratação PJ aguarda sua aprovação.</p>
                <ul style="font-size:14px;line-height:1.7;padding-left:18px;">
                  <li><strong>Prestador:</strong> ${data.razao_social}</li>
                  <li><strong>Serviço:</strong> ${data.servico_descricao}</li>
                  <li><strong>Área:</strong> ${data.area_solicitante}</li>
                  <li><strong>Valor estimado:</strong> R$ ${valorFmt}</li>
                </ul>
                <p style="margin:20px 0;"><a href="${APP_URL}/controladoria/aprovacoes" style="display:inline-block;background:#E8590C;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">Ver aprovações pendentes →</a></p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
                <p style="font-size:12px;color:#6b7280;margin:0;">SERGET · Sistema Integrado</p>
              </div>
            `,
          });
        }
      }
    } catch (emailErr) {
      console.error("[solicitacao-lider] email diretoria:", emailErr);
    }

    return { ok: true, solicitacao_id: sol.id, prestador_id: prest.id };
  });