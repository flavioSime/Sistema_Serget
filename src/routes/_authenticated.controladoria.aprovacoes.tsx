import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/serget/PageHeader";
import { formatCurrencyBRL, formatDateBR } from "@/lib/controladoria/format";
import { logHistorico } from "@/lib/controladoria/historico";

export const Route = createFileRoute("/_authenticated/controladoria/aprovacoes")({
  component: AprovacoesPage,
});

type Solicitacao = {
  id: string;
  tipo_pj: "A" | "B";
  area_solicitante: string;
  servico_descricao: string;
  valor_estimado: number | string;
  centro_custo: string;
  observacoes: string | null;
  criado_em: string;
  solicitante_id: string;
  responsavel_contratacao_id: string;
  status: string;
};

function AprovacoesPage() {
  const { hasRole } = useAuth();
  const isAprovador = hasRole(["admin", "diretoria"]);
  const [items, setItems] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState<Record<string, string>>({});
  const [showDevolver, setShowDevolver] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("solicitacoes_pj")
      .select("*")
      .eq("status", "aguardando_aprovacao")
      .order("criado_em", { ascending: true });
    setItems((data ?? []) as Solicitacao[]);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  if (!isAprovador) {
    return (
      <div className="px-6 py-10 text-center text-sm text-muted-foreground">
        Você não tem permissão para aprovar solicitações.
      </div>
    );
  }

  const aprovar = async (s: Solicitacao) => {
    const { error } = await supabase
      .from("solicitacoes_pj")
      .update({ status: "aprovado", comentario_devolucao: null })
      .eq("id", s.id);
    if (error) {
      toast.error("Não foi possível aprovar. Tente novamente.");
      return;
    }
    await logHistorico("solicitacao_pj", s.id, "aprovada");
    toast.success("Solicitação aprovada. Próximo passo: ficha cadastral.");
    carregar();
  };

  const devolver = async (s: Solicitacao) => {
    const texto = (comentario[s.id] ?? "").trim();
    if (texto.length < 5) {
      toast.error("O comentário de devolução é obrigatório.");
      return;
    }
    const { error } = await supabase
      .from("solicitacoes_pj")
      .update({ status: "devolvido", comentario_devolucao: texto })
      .eq("id", s.id);
    if (error) {
      toast.error("Não foi possível devolver. Tente novamente.");
      return;
    }
    await logHistorico("solicitacao_pj", s.id, "devolvida", { comentario: texto });
    toast.success("Solicitação devolvida ao solicitante.");
    setShowDevolver(null);
    setComentario((c) => ({ ...c, [s.id]: "" }));
    carregar();
  };

  return (
    <div>
      <PageHeader
        title="Aprovações pendentes"
        description="Solicitações de contratação PJ aguardando sua decisão."
      />
      <div className="px-6 py-6 space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!loading && items.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma solicitação aguardando aprovação no momento.
          </div>
        )}
        {items.map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Solicitada em {formatDateBR(s.criado_em)}</span>
                  <span>·</span>
                  <span>Tipo {s.tipo_pj}</span>
                </div>
                <h3 className="mt-1 text-base font-medium text-card-foreground">
                  {s.area_solicitante} · {s.centro_custo}
                </h3>
                <p className="mt-2 max-w-3xl whitespace-pre-line text-sm text-muted-foreground">
                  {s.servico_descricao}
                </p>
                {s.observacoes && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <strong>Observações:</strong> {s.observacoes}
                  </p>
                )}
                <div className="mt-3 text-sm font-medium text-card-foreground">
                  Valor estimado: {formatCurrencyBRL(s.valor_estimado)}
                </div>
              </div>
            </div>

            {showDevolver === s.id ? (
              <div className="mt-4 space-y-2">
                <Textarea
                  value={comentario[s.id] ?? ""}
                  onChange={(e) => setComentario((c) => ({ ...c, [s.id]: e.target.value }))}
                  rows={3}
                  placeholder="Explique ao solicitante o que precisa ser ajustado…"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowDevolver(null)}>Cancelar</Button>
                  <Button variant="default" size="sm" onClick={() => devolver(s)}>Confirmar devolução</Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowDevolver(s.id)}>
                  <RotateCcw className="h-4 w-4" />
                  Devolver
                </Button>
                <Button size="sm" className="gap-2" onClick={() => aprovar(s)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Aprovar
                </Button>
              </div>
            )}
          </div>
        ))}

        <div className="pt-2 text-xs text-muted-foreground">
          Aprovou? Continue em{" "}
          <Link to="/controladoria/prestadores" className="underline">Prestadores PJ</Link>{" "}
          para iniciar a ficha cadastral.
        </div>
      </div>
    </div>
  );
}
