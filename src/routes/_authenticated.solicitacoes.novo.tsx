import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/serget/PageHeader";
import { criarSolicitacaoLider } from "@/lib/controladoria/solicitacao-lider.functions";

export const Route = createFileRoute("/_authenticated/solicitacoes/novo")({
  validateSearch: (s: Record<string, unknown>) => ({
    sucesso: s.sucesso === "1" || s.sucesso === 1 ? true : false,
  }),
  component: NovaSolicitacaoLider,
});

const schema = z.object({
  tipo_pj: z.enum(["A", "B"]),
  razao_social: z.string().trim().min(2).max(150),
  email_contato: z.string().trim().email().max(150),
  servico_descricao: z.string().trim().min(10).max(1500),
  area_solicitante: z.string().trim().min(2).max(100),
  centro_custo: z.string().trim().min(1).max(50),
  valor_estimado: z.number().positive(),
  observacoes: z.string().max(1500).optional(),
  responsavel_contratacao_id: z.string().uuid("Selecione o responsável."),
});

type Usuario = { id: string; nome: string; email: string };

function NovaSolicitacaoLider() {
  const { sucesso } = Route.useSearch();
  const navigate = useNavigate();
  const enviar = useServerFn(criarSolicitacaoLider);

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
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      tipo_pj: tipo,
      razao_social: String(fd.get("razao_social") ?? ""),
      email_contato: String(fd.get("email_contato") ?? ""),
      servico_descricao: String(fd.get("servico_descricao") ?? ""),
      area_solicitante: String(fd.get("area_solicitante") ?? ""),
      centro_custo: String(fd.get("centro_custo") ?? ""),
      valor_estimado: Number(valor.replace(/\./g, "").replace(",", ".")),
      observacoes: String(fd.get("observacoes") ?? "") || undefined,
      responsavel_contratacao_id: responsavel,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }
    setSubmitting(true);
    try {
      await enviar({ data: parsed.data });
      toast.success("Solicitação enviada. A diretoria será notificada para aprovação.");
      navigate({ to: "/solicitacoes/novo", search: { sucesso: true } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sucesso) {
    return (
      <div>
        <PageHeader
          title="Solicitação enviada"
          description="Sua solicitação foi registrada e está aguardando aprovação."
        />
        <div className="px-6 py-10">
          <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h3 className="mt-3 text-base font-medium">Tudo certo!</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              A diretoria foi notificada e fará a análise. Você receberá retorno
              assim que houver decisão.
            </p>
            <Button
              onClick={() => navigate({ to: "/solicitacoes/novo", search: { sucesso: false } })}
              className="mt-6"
            >
              Nova solicitação
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Nova solicitação de contratação PJ"
        description="Preencha as informações para iniciar uma contratação. A controladoria valida e gera o contrato."
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
                    <div className="text-sm font-medium">Tipo A — Individual</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">Prestador autônomo, sem equipe.</p>
                  </div>
                </div>
              </label>
              <label className="cursor-pointer rounded-lg border border-border p-4 hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="B" id="tipo-b" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Tipo B — Com equipe</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">Prestador com colaboradores vinculados.</p>
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="razao">Nome do prestador / fornecedor</Label>
              <Input id="razao" name="razao_social" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail de contato</Label>
              <Input id="email" name="email_contato" type="email" required />
            </div>
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
            <Label htmlFor="desc">Serviço a ser prestado</Label>
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
                <SelectTrigger><SelectValue placeholder="Quem assina como testemunha 2" /></SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome} · {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs">Justificativa / observações</Label>
            <Textarea id="obs" name="observacoes" rows={3} />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enviando…" : "Enviar solicitação"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}