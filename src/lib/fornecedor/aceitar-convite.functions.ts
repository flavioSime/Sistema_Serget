import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Cria o usuário fornecedor a partir de um token de convite válido.
 * Endpoint público (sem auth) — só funciona com token válido e não usado.
 */
export const aceitarConviteFornecedor = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = data as { token?: string; senha?: string };
    if (!d?.token || !d?.senha) throw new Error("Token e senha são obrigatórios.");
    if (d.senha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
    return { token: d.token, senha: d.senha };
  })
  .handler(async ({ data }) => {
    const { data: convite, error } = await supabaseAdmin
      .from("convites_fornecedor")
      .select("id, prestador_id, email, expira_em, usado_em")
      .eq("token", data.token)
      .maybeSingle();

    if (error || !convite) throw new Error("Convite inválido.");
    if (convite.usado_em) throw new Error("Este convite já foi utilizado.");
    if (new Date(convite.expira_em) < new Date()) {
      throw new Error("Este convite expirou. Solicite um novo à controladoria.");
    }

    // Cria (ou atualiza) o usuário com a senha definida
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: convite.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: {
        role: "fornecedor",
        prestador_id: convite.prestador_id,
      },
    });

    let userId = created?.user?.id;

    if (createErr || !userId) {
      // Pode já existir; tenta buscar
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email === convite.email);
      if (!existing) {
        console.error("[convite] createUser", createErr);
        throw new Error("Não foi possível criar o acesso. Contate a controladoria.");
      }
      userId = existing.id;
      // Atualiza senha
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: data.senha });
    }

    // Garante papel "fornecedor" na tabela user_roles
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "fornecedor" }, { onConflict: "user_id,role" });

    // Marca convite como usado
    await supabaseAdmin
      .from("convites_fornecedor")
      .update({ usado_em: new Date().toISOString(), user_id: userId })
      .eq("id", convite.id);

    return { ok: true, email: convite.email, prestador_id: convite.prestador_id };
  });