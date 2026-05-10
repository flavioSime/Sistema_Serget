import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/serget/PageHeader";
import { logHistorico } from "@/lib/controladoria/historico";

export const Route = createFileRoute("/_authenticated/controladoria/prestadores/novo")({
  component: NovaSolicitacao,
});

const schema = z.object({
  tipo_pj: z.enum(["A", "B"]),
  area_solicitante: z.string().trim().min(2, "Informe a área").max(100),
  servico_descricao: z.string().trim().min(10, "Descreva o serviço").max(1000),
  valor_estimado: z.number().positive("Informe um valor válido"),
  centro_custo: z.string().trim().min(2, "Informe o centro de custo").max(50),
  responsavel_contratacao_id: z.string().uuid("Selecione o responsável"),
  observacoes: z.string().max(500).optional(),
});

type Usuario = { id: string; nome: string; email: string };

function NovaSolicitacao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tipo, setTipo] = useState<"A" | "B">("A");
  const [responsavel, setResponsavel] = useState("");
  const [valor, setValor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, nome, email")
      .order("nome")
      .then(({ data }) => setUsuarios((data ?? []) as Usuario[]));
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      tipo_pj: tipo,
      area_solicitante: String(fd.get("area_solicitante") ?? ""),
      servico_descricao: String(fd.get("servico_descricao") ?? ""),
      valor_estimado: Number(valor.replace(/\./g, "").replace(",", ".")),
      centro_custo: String(fd.get("centro_custo") ?? ""),
      responsavel_contratacao_id: responsavel,
      observacoes: String(fd.get("observacoes") ?? "") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("solicitacoes_pj")
      .insert({
        ...parsed.data,
        solicitante_id: user.id,
        status: "aguardando_aprovacao",
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast.error("Não foi possível salvar. Tente novamente em instantes.");
      return;
    }
    await logHistorico("solicitacao_pj", data.id, "criada", { tipo_pj: parsed.data.tipo_pj });
    toast.success("Solicitação enviada para aprovação.");
    navigate({ to: "/controladoria/prestadores" });
  };

  return (
    <div>
      <PageHeader
        title="Nova solicitação PJ"
        description="Preencha os dados da contratação para enviar à aprovação."
        actions={
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/controladoria/prestadores"><ArrowLeft className="h-4 w-4" />Voltar</Link>
          </Button>
        }
      />

      <form onSubmit={onSubmit} className="px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-6 rounded-lg border border-border bg-card p-6">
          <div className="space-y-3">
            <Label>Tipo de PJ</Label>
            <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as "A" | "B")} className="grid gap-3 sm:grid-cols-2">
              <label className="cursor-pointer rounded-lg border border-border p-4 hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="A" id="tipo-a" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Tipo A — PJ Individual</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">Prestador autônomo, sem colaboradores vinculados.</p>
                  </div>
                </div>
              </label>
              <label className="cursor-pointer rounded-lg border border-border p-4 hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="B" id="tipo-b" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Tipo B — PJ com equipe</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">Prestador com colaboradores vinculados ao serviço.</p>
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="area">Área solicitante</Label>
              <Input id="area" name="area_solicitante" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc">Centro de custo</Label>
              <Input id="cc" name="centro_custo" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição do serviço</Label>
            <Textarea id="desc" name="servico_descricao" rows={4} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor estimado (R$)</Label>
              <Input id="valor" inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Responsável pela contratação</Label>
              <Select value={responsavel} onValueChange={setResponsavel}>
                <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome} · {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs">Observações (opcional)</Label>
            <Textarea id="obs" name="observacoes" rows={3} />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enviando…" : "Enviar para aprovação"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
