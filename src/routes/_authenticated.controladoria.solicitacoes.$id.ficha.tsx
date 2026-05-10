import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/serget/PageHeader";
import { logHistorico } from "@/lib/controladoria/historico";

export const Route = createFileRoute(
  "/_authenticated/controladoria/solicitacoes/ficha",
)({
  component: FichaCadastralPage,
});

type Solicitacao = {
  id: string;
  tipo_pj: "A" | "B";
  prestador_id: string | null;
  status: string;
};

type Colaborador = { nome: string; cpf: string; funcao: string };

function FichaCadastralPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [solicit, setSolicit] = useState<Solicitacao | null>(null);
  const [carregando, setCarregando] = useState(true);

  // dados do prestador
  const [razao, setRazao] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cpf, setCpf] = useState("");
  const [emailContato, setEmailContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [respNome, setRespNome] = useState("");
  const [respCpf, setRespCpf] = useState("");
  const [endereco, setEndereco] = useState({ logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "" });
  const [bancarios, setBancarios] = useState({ banco: "", agencia: "", conta: "", tipo: "" });
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [docs, setDocs] = useState<Record<string, File | null>>({
    contrato_social: null,
    cnd_federal: null,
    cnd_estadual: null,
    cnd_municipal: null,
    lista_colaboradores: null,
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase
      .from("solicitacoes_pj")
      .select("id, tipo_pj, prestador_id, status")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setSolicit(data as Solicitacao | null);
        setCarregando(false);
      });
  }, [id]);

  if (carregando) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;
  if (!solicit) return <p className="p-6 text-sm text-muted-foreground">Solicitação não encontrada.</p>;
  if (solicit.status !== "aprovado") {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Esta solicitação ainda não foi aprovada. A ficha cadastral só pode ser preenchida após aprovação.
        </p>
      </div>
    );
  }

  const tipo = solicit.tipo_pj;

  const addColab = () => setColaboradores((c) => [...c, { nome: "", cpf: "", funcao: "" }]);
  const updColab = (i: number, k: keyof Colaborador, v: string) =>
    setColaboradores((arr) => arr.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));
  const rmColab = (i: number) => setColaboradores((arr) => arr.filter((_, idx) => idx !== i));

  const handleSalvar = async () => {
    if (!user) return;
    if (!razao.trim() || !emailContato.trim()) {
      toast.error("Razão social e e-mail são obrigatórios.");
      return;
    }
    if (!cnpj.trim() && !cpf.trim()) {
      toast.error("Informe CNPJ ou CPF.");
      return;
    }
    setSalvando(true);

    // 1) cria/atualiza prestador
    let prestadorId = solicit.prestador_id;
    if (!prestadorId) {
      const { data, error } = await supabase
        .from("prestadores")
        .insert({
          tipo,
          razao_social: razao,
          cnpj: cnpj || null,
          cpf: cpf || null,
          email_contato: emailContato,
          telefone: telefone || null,
          responsavel_nome: respNome || null,
          responsavel_cpf: respCpf || null,
          endereco,
          dados_bancarios: bancarios,
          status: "ativo",
          criado_por: user.id,
        })
        .select("id")
        .single();
      if (error || !data) {
        setSalvando(false);
        toast.error("Não foi possível salvar o prestador.");
        return;
      }
      prestadorId = data.id;
      await supabase.from("solicitacoes_pj").update({ prestador_id: prestadorId }).eq("id", solicit.id);
    } else {
      await supabase
        .from("prestadores")
        .update({
          razao_social: razao,
          cnpj: cnpj || null,
          cpf: cpf || null,
          email_contato: emailContato,
          telefone: telefone || null,
          responsavel_nome: respNome || null,
          responsavel_cpf: respCpf || null,
          endereco,
          dados_bancarios: bancarios,
        })
        .eq("id", prestadorId);
    }

    // 2) colaboradores (Tipo B)
    if (tipo === "B" && colaboradores.length > 0) {
      const validos = colaboradores.filter((c) => c.nome.trim());
      if (validos.length > 0) {
        await supabase.from("prestador_colaboradores").insert(
          validos.map((c) => ({ prestador_id: prestadorId!, nome: c.nome, cpf: c.cpf || null, funcao: c.funcao || null })),
        );
      }
    }

    // 3) uploads
    for (const [chave, file] of Object.entries(docs)) {
      if (!file) continue;
      const tipoDoc =
        chave === "contrato_social" ? "ficha_cadastral" :
        chave === "lista_colaboradores" ? "documento_colaborador" :
        "cnd";
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${prestadorId}/${chave}-${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("documentos-pj").upload(path, file, { upsert: false });
      if (upErr) {
        toast.error(`Falha ao enviar ${file.name}.`);
        continue;
      }
      await supabase.from("documentos_pj").insert({
        prestador_id: prestadorId!,
        tipo_documento: tipoDoc,
        nome_arquivo: file.name,
        storage_path: path,
        criado_por: user.id,
      });
    }

    await logHistorico("solicitacao_pj", solicit.id, "ficha_preenchida", { prestador_id: prestadorId });
    setSalvando(false);
    toast.success("Ficha salva. Pronto para gerar o contrato.");
    navigate({ to: "/controladoria/prestadores/$id", params: { id: prestadorId! } });
  };

  return (
    <div>
      <PageHeader
        title={`Ficha cadastral · Tipo ${tipo}`}
        description="Dados do prestador e documentos para arquivamento no GED."
        actions={
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/controladoria/prestadores"><ArrowLeft className="h-4 w-4" />Voltar</Link>
          </Button>
        }
      />

      <div className="px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Section title="Dados do prestador">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Razão social / Nome"><Input value={razao} onChange={(e) => setRazao(e.target.value)} /></Field>
              <Field label="E-mail de contato"><Input type="email" value={emailContato} onChange={(e) => setEmailContato(e.target.value)} /></Field>
              <Field label="CNPJ"><Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} /></Field>
              <Field label="CPF"><Input value={cpf} onChange={(e) => setCpf(e.target.value)} /></Field>
              <Field label="Telefone"><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} /></Field>
              <Field label="Responsável"><Input value={respNome} onChange={(e) => setRespNome(e.target.value)} /></Field>
              <Field label="CPF do responsável"><Input value={respCpf} onChange={(e) => setRespCpf(e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Endereço">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Logradouro"><Input value={endereco.logradouro} onChange={(e) => setEndereco((s) => ({ ...s, logradouro: e.target.value }))} /></Field>
              <Field label="Número"><Input value={endereco.numero} onChange={(e) => setEndereco((s) => ({ ...s, numero: e.target.value }))} /></Field>
              <Field label="Complemento"><Input value={endereco.complemento} onChange={(e) => setEndereco((s) => ({ ...s, complemento: e.target.value }))} /></Field>
              <Field label="Bairro"><Input value={endereco.bairro} onChange={(e) => setEndereco((s) => ({ ...s, bairro: e.target.value }))} /></Field>
              <Field label="Cidade"><Input value={endereco.cidade} onChange={(e) => setEndereco((s) => ({ ...s, cidade: e.target.value }))} /></Field>
              <Field label="UF"><Input value={endereco.uf} onChange={(e) => setEndereco((s) => ({ ...s, uf: e.target.value }))} maxLength={2} /></Field>
              <Field label="CEP"><Input value={endereco.cep} onChange={(e) => setEndereco((s) => ({ ...s, cep: e.target.value }))} /></Field>
            </div>
          </Section>

          <Section title="Dados bancários">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Banco"><Input value={bancarios.banco} onChange={(e) => setBancarios((s) => ({ ...s, banco: e.target.value }))} /></Field>
              <Field label="Agência"><Input value={bancarios.agencia} onChange={(e) => setBancarios((s) => ({ ...s, agencia: e.target.value }))} /></Field>
              <Field label="Conta"><Input value={bancarios.conta} onChange={(e) => setBancarios((s) => ({ ...s, conta: e.target.value }))} /></Field>
              <Field label="Tipo (corrente/poupança)"><Input value={bancarios.tipo} onChange={(e) => setBancarios((s) => ({ ...s, tipo: e.target.value }))} /></Field>
            </div>
          </Section>

          <Section title="Documentos">
            <div className="grid gap-3">
              <FileField label="Contrato social ou MEI" onChange={(f) => setDocs((d) => ({ ...d, contrato_social: f }))} />
              <FileField label="CND Federal" onChange={(f) => setDocs((d) => ({ ...d, cnd_federal: f }))} />
              <FileField label="CND Estadual" onChange={(f) => setDocs((d) => ({ ...d, cnd_estadual: f }))} />
              <FileField label="CND Municipal" onChange={(f) => setDocs((d) => ({ ...d, cnd_municipal: f }))} />
            </div>
          </Section>

          {tipo === "B" && (
            <Section title="Colaboradores vinculados">
              <div className="space-y-3">
                {colaboradores.map((c, i) => (
                  <div key={i} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_140px_1fr_auto]">
                    <Input placeholder="Nome" value={c.nome} onChange={(e) => updColab(i, "nome", e.target.value)} />
                    <Input placeholder="CPF" value={c.cpf} onChange={(e) => updColab(i, "cpf", e.target.value)} />
                    <Input placeholder="Função" value={c.funcao} onChange={(e) => updColab(i, "funcao", e.target.value)} />
                    <Button type="button" variant="ghost" size="sm" onClick={() => rmColab(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addColab}>
                  <Plus className="h-4 w-4" />Adicionar colaborador
                </Button>
                <div className="pt-2">
                  <FileField
                    label="Ou anexar documento com lista de colaboradores"
                    onChange={(f) => setDocs((d) => ({ ...d, lista_colaboradores: f }))}
                  />
                </div>
              </div>
            </Section>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSalvar} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar ficha cadastral"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-medium text-card-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function FileField({ label, onChange }: { label: string; onChange: (f: File | null) => void }) {
  const [name, setName] = useState<string>("");
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-border bg-background px-3 py-2 text-sm hover:bg-muted/40">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Upload className="h-4 w-4" />
        <span>{name || label}</span>
      </span>
      <span className="text-xs text-primary">Selecionar</span>
      <input
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setName(f?.name ?? "");
          onChange(f);
        }}
      />
    </label>
  );
}
