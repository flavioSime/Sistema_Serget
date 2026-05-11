import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { FileText, ClipboardList } from "lucide-react";
import { getMeuPrestador } from "@/lib/fornecedor/portal.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/fornecedor/")({
  component: FornecedorHome,
});

function FornecedorHome() {
  const { session } = useAuth();
  const fetchData = useServerFn(getMeuPrestador);
  const [data, setData] = useState<{
    prestador: { id: string; razao_social: string } | null;
    contratos: Array<{ id: string; status: string; tipo_contrato: string; versao: number }>;
  } | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchData().then((r) => setData(r as never));
  }, [session, fetchData]);

  if (!session) {
    return <p className="text-sm text-muted-foreground">Faça login para acessar seu processo.</p>;
  }
  if (!data) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  if (!data.prestador) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-sm">
        Não encontramos um processo vinculado ao seu acesso. Contate a controladoria.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{data.prestador.razao_social}</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe abaixo as etapas do seu processo de cadastro e contrato.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/fornecedor/ficha"
          className="rounded-lg border border-border bg-card p-4 hover:bg-muted/30"
        >
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium">Ficha cadastral</div>
              <p className="text-xs text-muted-foreground">Preencha seus dados e documentos.</p>
            </div>
          </div>
        </Link>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div className="text-sm font-medium">Contratos</div>
          </div>
          {data.contratos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum contrato disponível.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {data.contratos.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/fornecedor/contrato/$id"
                    params={{ id: c.id }}
                    className="text-primary hover:underline"
                  >
                    Contrato Tipo {c.tipo_contrato} · v{c.versao} ({c.status})
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}