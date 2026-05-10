import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, AlertTriangle, FileText, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/serget/PageHeader";
import { StatusBadge } from "@/components/serget/StatusBadge";
import { STATUS_PRESTADOR, STATUS_CONTRATO, TIPO_DOCUMENTO_LABEL } from "@/lib/controladoria/constants";
import { formatCnpjCpf, formatDateBR } from "@/lib/controladoria/format";

export const Route = createFileRoute("/_authenticated/controladoria/prestadores/$id")({
  component: PrestadorDetalhe,
});

function PrestadorDetalhe() {
  const { id } = Route.useParams();
  const [prest, setPrest] = useState<any>(null);
  const [contratos, setContratos] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [colabs, setColabs] = useState<any[]>([]);
  const [hist, setHist] = useState<any[]>([]);
  const [solicitAprovada, setSolicitAprovada] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: c }, { data: d }, { data: cb }, { data: h }, { data: sa }] = await Promise.all([
        supabase.from("prestadores").select("*").eq("id", id).maybeSingle(),
        supabase.from("contratos_pj").select("*").eq("prestador_id", id).order("criado_em", { ascending: false }),
        supabase.from("documentos_pj").select("*").eq("prestador_id", id).order("criado_em", { ascending: false }),
        supabase.from("prestador_colaboradores").select("*").eq("prestador_id", id),
        supabase.from("historico").select("*").eq("entidade_id", id).order("criado_em", { ascending: false }).limit(50),
        supabase.from("solicitacoes_pj").select("*").eq("prestador_id", id).eq("status", "aprovado").maybeSingle(),
      ]);
      setPrest(p); setContratos(c ?? []); setDocs(d ?? []); setColabs(cb ?? []); setHist(h ?? []); setSolicitAprovada(sa);
    })();
  }, [id]);

  if (!prest) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;

  const st = STATUS_PRESTADOR[prest.status as keyof typeof STATUS_PRESTADOR];
  const hoje = new Date();
  const cndAlerta = docs.some((d) => d.tipo_documento === "cnd" && d.validade_em && new Date(d.validade_em) < new Date(hoje.getTime() + 30 * 86400000));
  const contratoAlerta = contratos.some((c) => c.status === "vigente");

  return (
    <div>
      <PageHeader
        title={prest.razao_social}
        description={`${formatCnpjCpf(prest)} · Tipo ${prest.tipo}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge label={st.label} className={st.className} />
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/controladoria/prestadores"><ArrowLeft className="h-4 w-4" />Voltar</Link>
            </Button>
          </div>
        }
      />

      <div className="px-6 py-6 space-y-4">
        {(cndAlerta || contratoAlerta) && (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Atenção a documentos próximos do vencimento.
          </div>
        )}

        {solicitAprovada && contratos.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
            <div className="text-sm">
              Solicitação aprovada aguardando geração de contrato.
            </div>
            <Button asChild size="sm" className="gap-2">
              <Link to="/controladoria/contratos/$id" params={{ id: solicitAprovada.id }}>
                <Sparkles className="h-4 w-4" />Gerar contrato
              </Link>
            </Button>
          </div>
        )}

        <Tabs defaultValue="cadastrais">
          <TabsList>
            <TabsTrigger value="cadastrais">Dados cadastrais</TabsTrigger>
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
            <TabsTrigger value="documentos">Documentos (GED)</TabsTrigger>
            {prest.tipo === "B" && <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>}
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="cadastrais" className="rounded-lg border border-border bg-card p-5 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Info label="E-mail">{prest.email_contato}</Info>
              <Info label="Telefone">{prest.telefone ?? "—"}</Info>
              <Info label="Responsável">{prest.responsavel_nome ?? "—"}</Info>
              <Info label="CPF responsável">{prest.responsavel_cpf ?? "—"}</Info>
              <Info label="Endereço">{prest.endereco ? `${prest.endereco.logradouro ?? ""}, ${prest.endereco.numero ?? ""} — ${prest.endereco.cidade ?? ""}/${prest.endereco.uf ?? ""}` : "—"}</Info>
              <Info label="Banco">{prest.dados_bancarios?.banco ?? "—"} {prest.dados_bancarios?.agencia ? `· Ag ${prest.dados_bancarios.agencia}` : ""} {prest.dados_bancarios?.conta ? `· CC ${prest.dados_bancarios.conta}` : ""}</Info>
            </dl>
          </TabsContent>

          <TabsContent value="contratos" className="rounded-lg border border-border bg-card p-2">
            {contratos.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum contrato registrado.</p>
            ) : contratos.map((c) => {
              const stc = STATUS_CONTRATO[c.status] ?? { label: c.status, className: "" };
              return (
                <Link key={c.id} to="/controladoria/contratos/$id" params={{ id: c.id }} className="flex items-center justify-between border-b border-border p-3 last:border-0 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Tipo {c.tipo_contrato} · v{c.versao}</div>
                      <p className="text-xs text-muted-foreground">{c.modelo_utilizado}</p>
                    </div>
                  </div>
                  <StatusBadge label={stc.label} className={stc.className} />
                </Link>
              );
            })}
          </TabsContent>

          <TabsContent value="documentos" className="rounded-lg border border-border bg-card">
            {docs.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum documento arquivado.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Arquivo</th><th className="px-4 py-2">Validade</th><th className="px-4 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">{TIPO_DOCUMENTO_LABEL[d.tipo_documento] ?? d.tipo_documento}</td>
                      <td className="px-4 py-2">{d.nome_arquivo}</td>
                      <td className="px-4 py-2">{formatDateBR(d.validade_em)}</td>
                      <td className="px-4 py-2 capitalize">{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabsContent>

          {prest.tipo === "B" && (
            <TabsContent value="colaboradores" className="rounded-lg border border-border bg-card p-2">
              {colabs.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nenhum colaborador vinculado.</p>
              ) : colabs.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b border-border p-3 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{c.nome}</div>
                    <p className="text-xs text-muted-foreground">{c.cpf ?? "—"} · {c.funcao ?? "—"}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
          )}

          <TabsContent value="historico" className="rounded-lg border border-border bg-card p-2">
            {hist.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Sem registros.</p>
            ) : hist.map((h) => (
              <div key={h.id} className="border-b border-border p-3 text-sm last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{h.acao.replace(/_/g, " ")}</span>
                  <span className="text-xs text-muted-foreground">{formatDateBR(h.criado_em)}</span>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
