import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
        status: "ativo",
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

    return { ok: true, solicitacao_id: sol.id, prestador_id: prest.id };
  });