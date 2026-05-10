import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const gerarContratoIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as { solicitacao_id: string };
    if (!d?.solicitacao_id) throw new Error("solicitacao_id é obrigatório");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: sol, error: solErr } = await supabase
      .from("solicitacoes_pj")
      .select("*")
      .eq("id", data.solicitacao_id)
      .single();
    if (solErr || !sol) throw new Error("Solicitação não encontrada");
    if (!sol.prestador_id) throw new Error("Ficha cadastral incompleta");

    const { data: prest } = await supabase
      .from("prestadores")
      .select("*")
      .eq("id", sol.prestador_id)
      .single();
    const { data: colabs } = await supabase
      .from("prestador_colaboradores")
      .select("*")
      .eq("prestador_id", sol.prestador_id);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const tipo = sol.tipo_pj;
    const colaboradoresTexto = (colabs ?? [])
      .map((c) => `- ${c.nome}${c.cpf ? ` (CPF ${c.cpf})` : ""}${c.funcao ? ` — ${c.funcao}` : ""}`)
      .join("\n");

    const prompt = `Gere um contrato de prestação de serviços PJ em português do Brasil, formatado em texto puro com cláusulas numeradas (CLÁUSULA PRIMEIRA, etc.). Tom jurídico e direto.

CONTRATANTE: SERGET Mobilidade Viária Ltda, sediada em São Paulo/SP.

PRESTADOR (${tipo === "A" ? "PJ Individual" : "PJ com equipe"}):
- Razão social: ${prest?.razao_social}
- CNPJ: ${prest?.cnpj ?? "—"} | CPF: ${prest?.cpf ?? "—"}
- E-mail: ${prest?.email_contato}
- Telefone: ${prest?.telefone ?? "—"}
- Responsável: ${prest?.responsavel_nome ?? "—"}

OBJETO: ${sol.servico_descricao}
ÁREA SOLICITANTE: ${sol.area_solicitante}
CENTRO DE CUSTO: ${sol.centro_custo}
VALOR ESTIMADO: R$ ${Number(sol.valor_estimado).toFixed(2)}

${tipo === "B" && colaboradoresTexto ? `COLABORADORES VINCULADOS:\n${colaboradoresTexto}\n` : ""}

Inclua: objeto, prazo, valor e forma de pagamento, obrigações das partes${tipo === "B" ? ", responsabilidade pelos colaboradores e regime de subordinação" : ""}, sigilo e LGPD, rescisão, foro de São Paulo. Não inclua assinaturas — elas serão coletadas eletronicamente pelo sistema.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um redator jurídico brasileiro especializado em contratos PJ." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      if (resp.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
      if (resp.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos no workspace.");
      throw new Error(`Falha na IA: ${text.slice(0, 200)}`);
    }

    const json = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const conteudo = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!conteudo) throw new Error("A IA retornou conteúdo vazio.");

    return {
      conteudo,
      modelo: tipo === "A" ? "Modelo PJ Tipo A — Individual" : "Modelo PJ Tipo B — Com equipe",
      tipo_contrato: tipo,
      prestador_id: sol.prestador_id,
    };
  });
