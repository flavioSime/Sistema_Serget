import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const criarConviteFornecedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as { prestador_id?: string; email?: string; nome?: string };
    if (!d?.prestador_id || !d?.email) {
      throw new Error("prestador_id e email são obrigatórios.");
    }
    return {
      prestador_id: d.prestador_id,
      email: d.email.trim().toLowerCase(),
      nome: d.nome ?? "",
    };
  })
  .handler(async ({ data, context }) => {
    const origin =
      process.env.VITE_APP_URL ??
      process.env.APP_URL ??
      "https://id-preview--dbf1b01a-5fc3-42ac-8258-cff81db34d3e.lovable.app";

    // Cria registro de convite usando admin client (a RLS exige controladoria)
    const { data: convite, error: insertErr } = await supabaseAdmin
      .from("convites_fornecedor")
      .insert({
        prestador_id: data.prestador_id,
        email: data.email,
        criado_por: context.userId,
      })
      .select("token")
      .single();

    if (insertErr || !convite) {
      console.error("[convite] insert", insertErr);
      throw new Error("Não foi possível registrar o convite.");
    }

    await supabaseAdmin
      .from("prestadores")
      .update({ status: "em_processo" })
      .eq("id", data.prestador_id);

    const linkAcesso = `${origin}/fornecedor/convite/${convite.token}`;

    const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        redirectTo: linkAcesso,
        data: {
          role: "fornecedor",
          prestador_id: data.prestador_id,
          nome: data.nome,
        },
      },
    );

    if (emailError) {
      console.error("[convite] email", emailError);
      // Não bloqueia: o convite existe e o link pode ser repassado manualmente
      return {
        ok: true,
        email: data.email,
        link: linkAcesso,
        emailEnviado: false,
        aviso: emailError.message,
      };
    }

    return {
      ok: true,
      email: data.email,
      link: linkAcesso,
      emailEnviado: true,
    };
  });