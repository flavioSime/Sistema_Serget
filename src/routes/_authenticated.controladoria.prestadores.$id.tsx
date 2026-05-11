import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, AlertTriangle, FileText, Sparkles, Send, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/serget/PageHeader";
import { StatusBadge } from "@/components/serget/StatusBadge";
import { STATUS_PRESTADOR, STATUS_CONTRATO, TIPO_DOCUMENTO_LABEL } from "@/lib/controladoria/constants";
import { formatCnpjCpf, formatDateBR } from "@/lib/controladoria/format";
import { criarConviteFornecedor } from "@/lib/controladoria/convite-fornecedor.functions";
import { logHistorico } from "@/lib/controladoria/historico";
import { notificarEmail } from "@/lib/email/notify.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/controladoria/prestadores/$id")({
  component: PrestadorDetalhe,
});

function PrestadorDetalhe() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [prest, setPrest] = useState<any>(null);
  const [contratos, setContratos] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [colabs, setColabs] = useState<any[]>([]);
  const [hist, setHist] = useState<any[]>([]);
  const [solicitAprovada, setSolicitAprovada] = useState<any | null>(null);
  const [convite, setConvite] = useState<any | null>(null);
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const enviarConvite = useServerFn(criarConviteFornecedor);
  const notificarEmailFn = useServerFn(notificarEmail);
  const [reenvioOpen, setReenvioOpen] = useState<string | null>(null);
  const [reenvioObs, setReenvioObs] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: c }, { data: d }, { data: cb }, { data: h }, { data: sa }, { data: cv }] = await Promise.all([
        supabase.from("prestadores").select("*").eq("id", id).maybeSingle(),
        supabase.from("contratos_pj").select("*").eq("prestador_id", id).order("criado_em", { ascending: false }),
        supabase.from("documentos_pj").select("*").eq("prestador_id", id).order("criado_em", { ascending: false }),
        supabase.from("prestador_colaboradores").select("*").eq("prestador_id", id),
        supabase.from("historico").select("*").eq("entidade_id", id).order("criado_em", { ascending: false }).limit(50),
        supabase.from("solicitacoes_pj").select("*").eq("prestador_id", id).eq("status", "aprovado").maybeSingle(),
        supabase.from("convites_fornecedor").select("*").eq("prestador_id", id).order("criado_em", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setPrest(p); setContratos(c ?? []); setDocs(d ?? []); setColabs(cb ?? []); setHist(h ?? []); setSolicitAprovada(sa); setConvite(cv ?? null);
    })();
  }, [id]);

  if (!prest) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;

  const recarregarDocs = async () => {
    const { data } = await supabase
      .from("documentos_pj")
      .select("*")
      .eq("prestador_id", id)
      .order("criado_em", { ascending: false });
    setDocs(data ?? []);
  };

  const aprovarDoc = async (doc: any) => {
    if (!user) return;
    const { error } = await supabase
      .from("documentos_pj")
      .update({ validado_em: new Date().toISOString(), validado_por: user.id, status: "vigente" })
      .eq("id", doc.id);
    if (error) {
      toast.error("Não foi possível aprovar.");
      return;
    }
    await logHistorico("documento_pj", doc.id, "aprovado");
    toast.success("Documento aprovado.");
    await recarregarDocs();

    // Verifica se todos os obrigatórios foram aprovados → notifica fornecedor
    const TIPOS_OBRIGATORIOS = [
      "contrato_social", "comprovante_end", "cnd_federal",
      "cnd_estadual", "certidao_fgts",
    ];
    const { data: docsAtuais } = await supabase
      .from("documentos_pj")
      .select("tipo_documento, validado_em")
      .eq("prestador_id", id);
    const todosAprovados = TIPOS_OBRIGATORIOS.every((tipo) =>
      (docsAtuais ?? []).some((d) => d.tipo_documento === tipo && d.validado_em),
    );
    if (todosAprovados) {
      const { data: prestDados } = await supabase
        .from("prestadores")
        .select("email_contato, razao_social")
        .eq("id", id)
        .maybeSingle();
      try {
        await notificarEmailFn({
          data: {
            tipo: "ficha_aprovada",
            entidade_id: id,
            payload: {
              email_fornecedor: prestDados?.email_contato ?? "",
              razao_social: prestDados?.razao_social ?? "",
            },
          },
        });
        toast.success("Ficha totalmente aprovada. Fornecedor notificado.");
      } catch (_) { /* não bloqueia */ }
    }
  };

  const confirmarReenvio = async () => {
    if (!user || !reenvioOpen) return;
    if (reenvioObs.trim().length < 10) {
      toast.error("Descreva o motivo do reenvio (mínimo 10 caracteres).");
      return;
    }
    const { error } = await supabase
      .from("documentos_pj")
      .update({ status: "substituido", obs_reenvio: reenvioObs.trim() })
      .eq("id", reenvioOpen);
    if (error) {
      toast.error("Não foi possível solicitar reenvio.");
      return;
    }
    await logHistorico("documento_pj", reenvioOpen, "reenvio_solicitado", { obs: reenvioObs.trim() });

    // Envia email de reenvio ao fornecedor
    const { data: prestDados } = await supabase
      .from("prestadores")
      .select("email_contato")
      .eq("id", id)
      .maybeSingle();
    const { data: docDados } = await supabase
      .from("documentos_pj")
      .select("nome_arquivo")
      .eq("id", reenvioOpen)
      .maybeSingle();
    try {
      await notificarEmailFn({
        data: {
          tipo: "reenvio_documento",
          entidade_id: reenvioOpen,
          payload: {
            email_fornecedor: prestDados?.email_contato ?? "",
            nome_arquivo: docDados?.nome_arquivo ?? "",
            obs: reenvioObs.trim(),
          },
        },
      });
    } catch (_) { /* não bloqueia */ }
    toast.success("Reenvio solicitado. O fornecedor foi notificado.");
    setReenvioOpen(null);
    setReenvioObs("");
    recarregarDocs();
  };

  const conviteAtivo = convite && !convite.usado_em && new Date(convite.expira_em) > new Date();
  const conviteUsado = convite && !!convite.usado_em;

  const handleEnviarConvite = async () => {
    setEnviandoConvite(true);
    try {
      const r: any = await enviarConvite({
        data: {
          prestador_id: prest.id,
          email: prest.email_contato,
          nome: prest.responsavel_nome ?? prest.razao_social,
        },
      });
      if (r?.emailEnviado === false) {
        toast.success(`Convite criado para ${r.email}. Encaminhe o link manualmente.`);
      } else {
        toast.success(`Convite enviado para ${r.email}.`);
      }
      const { data: cv } = await supabase
        .from("convites_fornecedor")
        .select("*")
        .eq("prestador_id", prest.id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      setConvite(cv ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o convite.");
    } finally {
      setEnviandoConvite(false);
    }
  };

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
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Acesso do fornecedor</div>
                <div className="mt-1 text-sm">
                  {conviteUsado
                    ? "Acesso ativo — fornecedor pode preencher a ficha."
                    : conviteAtivo
                      ? `Convite enviado para ${convite.email} (aguardando aceite).`
                      : "Nenhum convite ativo."}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={handleEnviarConvite} disabled={enviandoConvite} className="gap-2">
                <Send className="h-4 w-4" />
                {enviandoConvite ? "Enviando…" : conviteAtivo || conviteUsado ? "Reenviar convite" : "Enviar convite de acesso"}
              </Button>
            </div>
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
                  <tr>
                    <th className="px-4 py-2">Tipo</th>
                    <th className="px-4 py-2">Arquivo</th>
                    <th className="px-4 py-2">Validade</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">{TIPO_DOCUMENTO_LABEL[d.tipo_documento] ?? d.tipo_documento}</td>
                      <td className="px-4 py-2">{d.nome_arquivo}</td>
                      <td className="px-4 py-2">{formatDateBR(d.validade_em)}</td>
                      <td className="px-4 py-2">
                        {d.validado_em ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                            Aprovado
                          </span>
                        ) : d.status === "substituido" ? (
                          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-800">
                            Reenvio solicitado
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                            Aguardando validação
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-2">
                          {!d.validado_em && (
                            <>
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => aprovarDoc(d)}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Aprovar
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => { setReenvioOpen(d.id); setReenvioObs(""); }}>
                                <RotateCcw className="h-3.5 w-3.5" />
                                Solicitar reenvio
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <Dialog open={!!reenvioOpen} onOpenChange={(o) => { if (!o) setReenvioOpen(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Solicitar reenvio</DialogTitle>
                  <DialogDescription>
                    Explique ao fornecedor o motivo. Essa observação é incluída no e-mail.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={reenvioObs}
                  onChange={(e) => setReenvioObs(e.target.value)}
                  rows={4}
                  placeholder="Ex.: Documento ilegível, validade vencida..."
                />
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setReenvioOpen(null)}>Cancelar</Button>
                  <Button onClick={confirmarReenvio}>Confirmar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
