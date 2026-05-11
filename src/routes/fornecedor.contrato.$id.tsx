import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { assinarContratoFornecedor } from "@/lib/fornecedor/portal.functions";

export const Route = createFileRoute("/fornecedor/contrato/$id")({
  component: ContratoFornecedor,
});

function ContratoFornecedor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const assinar = useServerFn(assinarContratoFornecedor);

  const [contrato, setContrato] = useState<{
    id: string;
    conteudo_contrato: string;
    tipo_contrato: string;
    versao: number;
    enviado_prestador_em: string | null;
    status: string;
  } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase
      .from("contratos_pj")
      .select("id, conteudo_contrato, tipo_contrato, versao, enviado_prestador_em, status")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setContrato(data as never));
  }, [id]);

  const handleAssinar = async () => {
    setEnviando(true);
    try {
      await assinar({ data: { contrato_id: id } });
      toast.success("Contrato assinado e arquivado no GED.");
      navigate({ to: "/fornecedor", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a assinatura.");
    } finally {
      setEnviando(false);
    }
  };

  if (!contrato) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const jaAssinado = !!contrato.enviado_prestador_em;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">
          Contrato Tipo {contrato.tipo_contrato} · v{contrato.versao}
        </h1>
        <p className="text-sm text-muted-foreground">
          Leia com atenção. Ao assinar, sua aceitação fica registrada no sistema.
        </p>
      </div>

      <div className="max-h-[500px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-5 text-sm leading-relaxed">
        {contrato.conteudo_contrato}
      </div>

      {jaAssinado ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Contrato assinado em {new Date(contrato.enviado_prestador_em!).toLocaleString("pt-BR")}.
        </div>
      ) : (
        <div className="flex flex-col items-end gap-2">
          <Button onClick={handleAssinar} disabled={enviando}>
            {enviando ? "Registrando…" : "Li e aceito este contrato"}
          </Button>
          <p className="text-xs text-muted-foreground">Assinatura registrada eletronicamente.</p>
        </div>
      )}
    </div>
  );
}