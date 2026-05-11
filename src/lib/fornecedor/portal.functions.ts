import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enviarNotificacao } from "@/lib/email/notify.server";

/** Retorna o prestador vinculado ao fornecedor logado (via convite usado). */
export const getMeuPrestador = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: convite } = await supabaseAdmin
      .from("convites_fornecedor")
      .select("prestador_id")
      .eq("user_id", context.userId)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!convite) return { prestador: null, contratos: [], documentos: [] };

    const [{ data: prestador }, { data: contratos }, { data: documentos }] =
      await Promise.all([
        supabaseAdmin.from("prestadores").select("*").eq("id", convite.prestador_id).maybeSingle(),
        supabaseAdmin.from("contratos_pj").select("*").eq("prestador_id", convite.prestador_id),
        supabaseAdmin.from("documentos_pj").select("*").eq("prestador_id", convite.prestador_id),
      ]);

    return { prestador, contratos: contratos ?? [], documentos: documentos ?? [] };
  });

/** Atualiza dados cadastrais do próprio prestador. */
export const salvarFichaFornecedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as Record<string, unknown>;
    if (!d || typeof d !== "object") throw new Error("Dados inválidos.");
    return d as {
      razao_social?: string;
      cnpj?: string;
      cpf?: string;
      telefone?: string;
      responsavel_nome?: string;
      responsavel_cpf?: string;
      endereco?: Record<string, unknown>;
      dados_bancarios?: Record<string, unknown>;
    };
  })
  .handler(async ({ data, context }) => {
    const { data: convite } = await supabaseAdmin
      .from("convites_fornecedor")
      .select("prestador_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!convite) throw new Error("Acesso não vinculado a um prestador.");

    const { error } = await supabaseAdmin
      .from("prestadores")
      .update({
        razao_social: data.razao_social,
        cnpj: data.cnpj,
        cpf: data.cpf,
        telefone: data.telefone,
        responsavel_nome: data.responsavel_nome,
        responsavel_cpf: data.responsavel_cpf,
        endereco: (data.endereco ?? null) as never,
        dados_bancarios: (data.dados_bancarios ?? null) as never,
      })
      .eq("id", convite.prestador_id);

    if (error) {
      console.error("[fornecedor] salvarFicha", error);
      throw new Error("Não foi possível salvar a ficha.");
    }

    await supabaseAdmin.from("historico").insert({
      entidade: "prestador",
      entidade_id: convite.prestador_id,
      acao: "ficha_atualizada_fornecedor",
      user_id: context.userId,
    });

    // Notifica controladoria por email (não bloqueia em caso de falha)
    const { data: prestDados } = await supabaseAdmin
      .from("prestadores")
      .select("razao_social")
      .eq("id", convite.prestador_id)
      .maybeSingle();
    try {
      await enviarNotificacao({
        tipo: "ficha_recebida",
        entidade_id: convite.prestador_id,
        payload: {
          razao_social: prestDados?.razao_social ?? "",
          prestador_id: convite.prestador_id,
        },
        userId: context.userId,
      });
    } catch (_) {
      /* não bloqueia */
    }

    return { ok: true };
  });

/** Registra o aceite do contrato pelo fornecedor. */
export const assinarContratoFornecedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as { contrato_id?: string };
    if (!d?.contrato_id) throw new Error("contrato_id é obrigatório.");
    return { contrato_id: d.contrato_id };
  })
  .handler(async ({ data, context }) => {
    const { data: convite } = await supabaseAdmin
      .from("convites_fornecedor")
      .select("prestador_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!convite) throw new Error("Acesso não vinculado a um prestador.");

    const { data: contrato } = await supabaseAdmin
      .from("contratos_pj")
      .select("id, prestador_id, status")
      .eq("id", data.contrato_id)
      .maybeSingle();
    if (!contrato || contrato.prestador_id !== convite.prestador_id) {
      throw new Error("Contrato não encontrado.");
    }

    const { error } = await supabaseAdmin
      .from("contratos_pj")
      .update({
        enviado_prestador_em: new Date().toISOString(),
        status: "assinado_fornecedor",
      })
      .eq("id", data.contrato_id);
    if (error) throw new Error("Não foi possível registrar a assinatura.");

    await supabaseAdmin.from("historico").insert({
      entidade: "contrato_pj",
      entidade_id: data.contrato_id,
      acao: "assinado_fornecedor",
      user_id: context.userId,
    });

    return { ok: true };
  });