import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/serget/PageHeader";
import { StatusBadge } from "@/components/serget/StatusBadge";
import { STATUS_PRESTADOR } from "@/lib/controladoria/constants";
import { formatCnpjCpf } from "@/lib/controladoria/format";

export const Route = createFileRoute("/_authenticated/controladoria/prestadores/")({
  component: PrestadoresList,
});

type Prestador = {
  id: string;
  razao_social: string;
  cnpj: string | null;
  cpf: string | null;
  tipo: "A" | "B";
  status: keyof typeof STATUS_PRESTADOR;
};

function PrestadoresList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Prestador[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let query = supabase
      .from("prestadores")
      .select("id, razao_social, cnpj, cpf, tipo, status")
      .order("criado_em", { ascending: false });
    if (filterTipo !== "todos") query = query.eq("tipo", filterTipo);
    if (filterStatus !== "todos") query = query.eq("status", filterStatus);
    if (search.trim()) {
      query = query.or(`razao_social.ilike.%${search}%,cnpj.ilike.%${search}%,cpf.ilike.%${search}%`);
    }
    setLoading(true);
    query.then(({ data }) => {
      setItems((data ?? []) as Prestador[]);
      setLoading(false);
    });
  }, [filterTipo, filterStatus, search]);

  return (
    <div>
      <PageHeader
        title="Prestadores PJ"
        description="Cadastro, contratos e GED dos prestadores de serviço PJ."
        actions={
          <Button asChild className="gap-2">
            <Link to="/controladoria/prestadores/novo">
              <Plus className="h-4 w-4" />
              Nova solicitação PJ
            </Link>
          </Button>
        }
      />

      <div className="px-6 py-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por razão social, CNPJ ou CPF"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="A">Tipo A — Individual</SelectItem>
              <SelectItem value="B">Tipo B — Com equipe</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Razão social</th>
                <th className="px-4 py-3 font-medium">CNPJ / CPF</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">Carregando…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhum prestador encontrado. Comece por uma nova solicitação PJ.
                </td></tr>
              )}
              {items.map((p) => {
                const st = STATUS_PRESTADOR[p.status];
                return (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    onClick={() => navigate({ to: "/controladoria/prestadores/$id", params: { id: p.id } })}
                  >
                    <td className="px-4 py-3 font-medium text-card-foreground">{p.razao_social}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatCnpjCpf(p)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded border border-border px-2 py-0.5 text-[11px]">
                        Tipo {p.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge label={st.label} className={st.className} /></td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/controladoria/prestadores/$id" params={{ id: p.id }}>Abrir</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
