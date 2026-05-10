import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, FileText, PenLine, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/serget/PageHeader";
import { StatusBadge } from "@/components/serget/StatusBadge";
import { STATUS_CONTRATO } from "@/lib/controladoria/constants";
import { formatDateBR } from "@/lib/controladoria/format";
import { logHistorico } from "@/lib/controladoria/historico";
import { gerarContratoIA } from "@/lib/controladoria/ai-contract.functions";

export const Route = createFileRoute("/_authenticated/controladoria/contratos/$id")({
  component: ContratoPage,
});

type Contrato = {
  id: string;
  solicitacao_id: string;
  prestador_id: string;
  tipo_contrato: "A" | "B";
  modelo_utilizado: string;
  conteudo_contrato: string;
  versao: number;
  status: string;
  assinado_tatiane_em: string | null;
  assinado_testemunha1_em: string | null;
  assinado_testemunha2_em: string | null;
  assinado_dani_em: string | null;
};

const ETAPAS = [
  { key: "tatiane", label: "Tatiane (gestora)", roles: ["controladoria", "admin"] as const, status: "assinado_tatiane" },
  { key: "testemunha1", label: "Tatiane (testemunha)", roles: ["controladoria", "admin"] as const, status: "assinado_testemunhas" },
  { key: "testemunha2", label: "Resp. contratação", roles: ["controladoria", "admin", "diretoria", "operador", "gestor"] as const, status: "assinado_testemunhas" },
  { key: "dani", label: "Dani (CEO)", roles: ["diretoria", "admin"] as const, status: "assinado_dani" },
];

function ContratoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const gerar = useServerFn(gerarContratoIA);

  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [conteudoEdit, setConteudoEdit] = useState("");
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [cndVencida, setCndVencida] = useState(false);
  const [solicitacaoId, setSolicitacaoId] = useState<string | null>(null);

  // O ID da rota pode ser o ID do contrato OU o ID da solicitação (quando ainda não há contrato)
  useEffect(() => {
    (async () => {
      // tenta como contrato existente
      const { data: c } = await supabase
        .from("contratos_pj")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (c) {
        setContrato(c as Contrato);
        setConteudoEdit((c as Contrato).conteudo_contrato);
        setSolicitacaoId((c as Contrato).solicitacao_id);
        await checarCnd((c as Contrato).prestador_id);
        setLoading(false);
        return;
      }
      // tenta como solicitação (rota usada para criar contrato novo)
      const { data: s } = await supabase
        .from("solicitacoes_pj")
        .select("id, prestador_id, status")
        .eq("id", id)
        .maybeSingle();
      if (s) {
        setSolicitacaoId(s.id);
        if (s.prestador_id) await checarCnd(s.prestador_id);
      }
      setLoading(false);
    })();
  }, [id]);

  const checarCnd = async (prestadorId: string) => {
    const { data } = await supabase
      .from("documentos_pj")
      .select("validade_em, tipo_documento, status")
      .eq("prestador_id", prestadorId)
      .eq("tipo_documento", "cnd");
    const hoje = new Date();
    const vencida = (data ?? []).some((d) => {
      if (d.status === "vencido") return true;
      if (!d.validade_em) return false;
      return new Date(d.validade_em) < hoje;
    });
    setCndVencida(vencida);
  };

  const handleGerar = async () => {
    if (!solicitacaoId) return;
    if (cndVencida) {
      toast.error("Há CND vencida. Atualize os documentos antes de gerar o contrato.");
      return;
    }
    setGerando(true);
    try {
      const res = await gerar({ data: { solicitacao_id: solicitacaoId } });
      const { data: novo, error } = await supabase
        .from("contratos_pj")
        .insert({
          solicitacao_id: solicitacaoId,
          prestador_id: res.prestador_id,
          tipo_contrato: res.tipo_contrato,
          modelo_utilizado: res.modelo,
          conteudo_contrato: res.conteudo,
          status: "em_revisao",
        })
        .select("*")
        .single();
      if (error || !novo) throw new Error("Falha ao salvar contrato.");
      setContrato(novo as Contrato);
      setConteudoEdit(res.conteudo);
      await logHistorico("contrato_pj", novo.id, "gerado_ia", { modelo: res.modelo });
      toast.success("Contrato gerado. Revise antes de enviar para assinatura.");
      navigate({ to: "/controladoria/contratos/$id", params: { id: novo.id }, replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o contrato.");
    } finally {
      setGerando(false);
    }
  };

  const salvarConteudo = async () => {
    if (!contrato) return;
    setSalvando(true);
    const { error } = await supabase
      .from("contratos_pj")
      .update({ conteudo_contrato: conteudoEdit })
      .eq("id", contrato.id);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    await logHistorico("contrato_pj", contrato.id, "editado");
    toast.success("Rascunho salvo.");
    setContrato({ ...contrato, conteudo_contrato: conteudoEdit });
  };

  const proximaEtapa = (): typeof ETAPAS[number] | null => {
    if (!contrato) return null;
    if (!contrato.assinado_tatiane_em) return ETAPAS[0];
    if (!contrato.assinado_testemunha1_em) return ETAPAS[1];
    if (!contrato.assinado_testemunha2_em) return ETAPAS[2];
    if (!contrato.assinado_dani_em) return ETAPAS[3];
    return null;
  };

  const podeAssinarEtapa = (etapa: typeof ETAPAS[number]) => {
    return etapa.roles.some((r) => hasRole(r));
  };

  const assinar = async () => {
    if (!contrato || !user) return;
    const etapa = proximaEtapa();
    if (!etapa) return;
    if (!podeAssinarEtapa(etapa)) {
      toast.error(`Apenas ${etapa.label} pode assinar nesta etapa.`);
      return;
    }
    const now = new Date().toISOString();
    const update: Record<string, unknown> = {};
    if (etapa.key === "tatiane") {
      update.assinado_tatiane_em = now;
      update.assinado_tatiane_por = user.id;
      update.status = "assinado_tatiane";
    } else if (etapa.key === "testemunha1") {
      update.assinado_testemunha1_em = now;
      update.assinado_testemunha1_por = user.id;
    } else if (etapa.key === "testemunha2") {
      update.assinado_testemunha2_em = now;
      update.assinado_testemunha2_por = user.id;
      update.status = "assinado_testemunhas";
    } else if (etapa.key === "dani") {
      update.assinado_dani_em = now;
      update.assinado_dani_por = user.id;
      update.status = "assinado_dani";
    }

    const { data: upd, error } = await supabase
      .from("contratos_pj")
      .update(update)
      .eq("id", contrato.id)
      .select("*")
      .single();
    if (error || !upd) {
      toast.error("Não foi possível registrar a assinatura.");
      return;
    }

    await logHistorico("contrato_pj", contrato.id, `assinado_${etapa.key}`);

    // Se foi a assinatura do Dani -> arquivar no GED
    if (etapa.key === "dani") {
      await supabase.from("documentos_pj").insert({
        prestador_id: contrato.prestador_id,
        contrato_id: contrato.id,
        tipo_documento: "contrato",
        nome_arquivo: `Contrato v${contrato.versao} - Tipo ${contrato.tipo_contrato}.txt`,
        storage_path: `contratos-internos/${contrato.id}.txt`,
        criado_por: user.id,
        status: "vigente",
      });
      await logHistorico("contrato_pj", contrato.id, "arquivado_ged");
      toast.success("Contrato assinado por Dani e arquivado no GED. Pronto para envio ao prestador.");
    } else {
      toast.success(`Assinatura registrada. Próximo: ${ETAPAS[ETAPAS.findIndex((e) => e.key === etapa.key) + 1]?.label ?? "—"}.`);
    }

    setContrato(upd as Contrato);
  };

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;

  // Sem contrato ainda — tela de geração
  if (!contrato) {
    return (
      <div>
        <PageHeader
          title="Gerar contrato"
          description="A IA vai redigir um rascunho com base na solicitação e na ficha cadastral."
          actions={
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/controladoria/prestadores"><ArrowLeft className="h-4 w-4" />Voltar</Link>
            </Button>
          }
        />
        <div className="px-6 py-8">
          <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 text-center">
            {cndVencida && (
              <div className="mb-4 flex items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                CND vencida no GED. Atualize antes de gerar o contrato.
              </div>
            )}
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 text-base font-medium">Pronto para gerar o contrato</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              O modelo (Tipo A ou Tipo B) será escolhido automaticamente com base na solicitação.
            </p>
            <Button onClick={handleGerar} disabled={gerando || cndVencida} className="mt-6 gap-2">
              <Sparkles className="h-4 w-4" />
              {gerando ? "Gerando contrato…" : "Gerar contrato com IA"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const etapa = proximaEtapa();
  const stCfg = STATUS_CONTRATO[contrato.status] ?? { label: contrato.status, className: "" };
  const totalEtapas = 4;
  const concluidas =
    [contrato.assinado_tatiane_em, contrato.assinado_testemunha1_em, contrato.assinado_testemunha2_em, contrato.assinado_dani_em]
      .filter(Boolean).length;
  const progresso = Math.round((concluidas / totalEtapas) * 100);

  return (
    <div>
      <PageHeader
        title={`Contrato · Tipo ${contrato.tipo_contrato} · v${contrato.versao}`}
        description={contrato.modelo_utilizado}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge label={stCfg.label} className={stCfg.className} />
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/controladoria/prestadores/$id" params={{ id: contrato.prestador_id }}>
                <ArrowLeft className="h-4 w-4" />Prestador
              </Link>
            </Button>
          </div>
        }
      />

      <div className="px-6 py-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <Textarea
              value={conteudoEdit}
              onChange={(e) => setConteudoEdit(e.target.value)}
              rows={28}
              className="font-mono text-sm leading-relaxed"
            />
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={salvarConteudo} disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar rascunho"}
              </Button>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-sm font-medium">Progresso das assinaturas</h4>
              <Progress value={progresso} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">{concluidas} de {totalEtapas} etapas concluídas</p>
              <ul className="mt-4 space-y-3 text-sm">
                {ETAPAS.map((e, i) => {
                  const carimbos = [
                    contrato.assinado_tatiane_em,
                    contrato.assinado_testemunha1_em,
                    contrato.assinado_testemunha2_em,
                    contrato.assinado_dani_em,
                  ];
                  const concluida = !!carimbos[i];
                  const atual = etapa?.key === e.key;
                  return (
                    <li key={e.key} className="flex items-start gap-3">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        concluida ? "bg-emerald-500" : atual ? "bg-amber-500" : "bg-muted"
                      }`} />
                      <div className="flex-1">
                        <div className={`text-sm ${concluida ? "text-muted-foreground line-through" : "text-card-foreground"}`}>
                          {e.label}
                        </div>
                        {concluida && (
                          <p className="text-[11px] text-muted-foreground">Em {formatDateBR(carimbos[i])}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {etapa ? (
                <Button onClick={assinar} className="mt-4 w-full gap-2" disabled={!podeAssinarEtapa(etapa)}>
                  <PenLine className="h-4 w-4" />
                  Assinar como {etapa.label}
                </Button>
              ) : (
                <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  Todas as assinaturas internas foram concluídas. Contrato arquivado no GED — pronto para envio ao prestador (Sprint 2).
                </div>
              )}
              {etapa && !podeAssinarEtapa(etapa) && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Aguardando assinatura de {etapa.label}.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
