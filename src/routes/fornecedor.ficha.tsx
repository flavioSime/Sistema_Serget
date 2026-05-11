import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMeuPrestador, salvarFichaFornecedor } from "@/lib/fornecedor/portal.functions";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileCheck2 } from "lucide-react";

export const Route = createFileRoute("/fornecedor/ficha")({
  component: FichaFornecedor,
});

const DOCS_OBRIGATORIOS = [
  { tipo: "contrato_social", label: "Contrato Social / MEI" },
  { tipo: "comprovante_end", label: "Comprovante de endereço" },
  { tipo: "cnd_federal", label: "CND Federal" },
  { tipo: "cnd_estadual", label: "CND Estadual / Municipal" },
  { tipo: "certidao_fgts", label: "Certidão FGTS" },
];

type EnderecoForm = {
  logradouro?: string;
  numero?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
};
type BancoForm = {
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo?: string;
};

function FichaFornecedor() {
  const fetchData = useServerFn(getMeuPrestador);
  const salvar = useServerFn(salvarFichaFornecedor);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [docs, setDocs] = useState<Array<{ id: string; tipo_documento: string; nome_arquivo: string; storage_path: string }>>([]);
  const [prestadorId, setPrestadorId] = useState<string | null>(null);
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const [form, setForm] = useState({
    razao_social: "",
    cnpj: "",
    cpf: "",
    telefone: "",
    responsavel_nome: "",
    responsavel_cpf: "",
    endereco: {} as EnderecoForm,
    dados_bancarios: {} as BancoForm,
  });

  useEffect(() => {
    fetchData().then((r) => {
      const d = r as {
        prestador: (typeof form & { id: string }) | null;
        documentos: Array<{ id: string; tipo_documento: string; nome_arquivo: string; storage_path: string }>;
      };
      if (d.prestador) {
        setPrestadorId(d.prestador.id);
        setForm({
          razao_social: d.prestador.razao_social ?? "",
          cnpj: d.prestador.cnpj ?? "",
          cpf: d.prestador.cpf ?? "",
          telefone: d.prestador.telefone ?? "",
          responsavel_nome: d.prestador.responsavel_nome ?? "",
          responsavel_cpf: d.prestador.responsavel_cpf ?? "",
          endereco: d.prestador.endereco ?? {},
          dados_bancarios: d.prestador.dados_bancarios ?? {},
        });
      }
      setDocs(d.documentos ?? []);
      setCarregando(false);
    });
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await salvar({ data: form });
      toast.success("Ficha salva. A controladoria foi notificada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const handleUpload = async (tipo: string, file: File) => {
    if (!prestadorId) {
      toast.error("Salve a ficha antes de enviar documentos.");
      return;
    }
    setUploadingTipo(tipo);
    try {
      const sanitized = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${prestadorId}/docs/${tipo}-${Date.now()}-${sanitized}`;
      const { error: upErr } = await supabase.storage
        .from("documentos-pj")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: { user } } = await supabase.auth.getUser();
      const { data: inserted, error: dbErr } = await supabase
        .from("documentos_pj")
        .insert({
          prestador_id: prestadorId,
          tipo_documento: tipo,
          nome_arquivo: file.name,
          storage_path: path,
          criado_por: user?.id ?? null,
        })
        .select("id, tipo_documento, nome_arquivo, storage_path")
        .single();
      if (dbErr || !inserted) throw dbErr ?? new Error("Falha ao registrar documento.");

      setDocs((prev) => [...prev.filter((d) => d.tipo_documento !== tipo), inserted]);
      toast.success("Documento enviado.");

      // Verifica se todos os obrigatórios foram enviados
      const tiposEnviados = new Set([
        ...docs.filter((d) => d.tipo_documento !== tipo).map((d) => d.tipo_documento),
        tipo,
      ]);
      const todos = DOCS_OBRIGATORIOS.every((d) => tiposEnviados.has(d.tipo));
      if (todos) {
        toast.success("Todos os documentos enviados. A controladoria será notificada.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o arquivo.");
    } finally {
      setUploadingTipo(null);
    }
  };

  const verArquivo = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("documentos-pj")
      .createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Não foi possível abrir o arquivo.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Ficha cadastral</h1>
        <p className="text-sm text-muted-foreground">
          Preencha seus dados. A controladoria valida antes de gerar o contrato.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-border bg-card p-5">
        <Section titulo="Dados gerais">
          <Field label="Razão social" value={form.razao_social} onChange={(v) => setForm({ ...form, razao_social: v })} required />
          <Field label="CNPJ" value={form.cnpj} onChange={(v) => setForm({ ...form, cnpj: v })} />
          <Field label="CPF" value={form.cpf} onChange={(v) => setForm({ ...form, cpf: v })} />
          <Field label="Telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} />
          <Field label="Responsável" value={form.responsavel_nome} onChange={(v) => setForm({ ...form, responsavel_nome: v })} />
          <Field label="CPF do responsável" value={form.responsavel_cpf} onChange={(v) => setForm({ ...form, responsavel_cpf: v })} />
        </Section>

        <Section titulo="Endereço">
          <Field label="Logradouro" value={form.endereco.logradouro ?? ""} onChange={(v) => setForm({ ...form, endereco: { ...form.endereco, logradouro: v } })} />
          <Field label="Número" value={form.endereco.numero ?? ""} onChange={(v) => setForm({ ...form, endereco: { ...form.endereco, numero: v } })} />
          <Field label="Cidade" value={form.endereco.cidade ?? ""} onChange={(v) => setForm({ ...form, endereco: { ...form.endereco, cidade: v } })} />
          <Field label="UF" value={form.endereco.uf ?? ""} onChange={(v) => setForm({ ...form, endereco: { ...form.endereco, uf: v } })} />
          <Field label="CEP" value={form.endereco.cep ?? ""} onChange={(v) => setForm({ ...form, endereco: { ...form.endereco, cep: v } })} />
        </Section>

        <Section titulo="Dados bancários">
          <Field label="Banco" value={form.dados_bancarios.banco ?? ""} onChange={(v) => setForm({ ...form, dados_bancarios: { ...form.dados_bancarios, banco: v } })} />
          <Field label="Agência" value={form.dados_bancarios.agencia ?? ""} onChange={(v) => setForm({ ...form, dados_bancarios: { ...form.dados_bancarios, agencia: v } })} />
          <Field label="Conta" value={form.dados_bancarios.conta ?? ""} onChange={(v) => setForm({ ...form, dados_bancarios: { ...form.dados_bancarios, conta: v } })} />
          <Field label="Tipo (cc/poupança)" value={form.dados_bancarios.tipo ?? ""} onChange={(v) => setForm({ ...form, dados_bancarios: { ...form.dados_bancarios, tipo: v } })} />
        </Section>

        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar ficha"}
        </Button>
      </form>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Documentos obrigatórios</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Envie cada documento abaixo. Aceitamos PDF, JPG ou PNG.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {DOCS_OBRIGATORIOS.map((d) => {
            const doc = docs.find((x) => x.tipo_documento === d.tipo);
            return (
              <li key={d.tipo} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                <div className="min-w-0">
                  <div className="font-medium">{d.label}</div>
                  {doc && (
                    <button
                      type="button"
                      onClick={() => verArquivo(doc.storage_path)}
                      className="text-xs text-emerald-700 underline-offset-2 hover:underline"
                    >
                      {doc.nome_arquivo}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {doc ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <FileCheck2 className="h-3.5 w-3.5" />
                      Enviado
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pendente</span>
                  )}
                  <input
                    ref={(el) => { inputsRef.current[d.tipo] = el; }}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(d.tipo, f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={uploadingTipo === d.tipo || !prestadorId}
                    onClick={() => inputsRef.current[d.tipo]?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingTipo === d.tipo ? "Enviando…" : doc ? "Substituir" : "Enviar arquivo"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">{titulo}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}