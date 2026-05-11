import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/serget/PageHeader";
import { listarDocumentacao, salvarDocumentacao } from "@/lib/documentacao/docs.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/documentacao")({
  component: DocumentacaoPage,
});

type Doc = {
  id: string;
  tipo: "sistema" | "gestao";
  titulo: string;
  conteudo: string;
  versao: number;
  atualizado_em: string;
};

function DocumentacaoPage() {
  const { isAdmin } = useAuth();
  const fetchDocs = useServerFn(listarDocumentacao);
  const salvar = useServerFn(salvarDocumentacao);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");

  useEffect(() => {
    fetchDocs()
      .then((r) => setDocs(((r as { docs: Doc[] }).docs ?? []) as Doc[]))
      .catch(() => toast.error("Você não tem permissão para ver a documentação."));
  }, [fetchDocs]);

  const handleEditar = (doc: Doc) => {
    setEditandoId(doc.id);
    setRascunho(doc.conteudo);
  };

  const handleSalvar = async (doc: Doc) => {
    try {
      const r = await salvar({ data: { id: doc.id, conteudo: rascunho } });
      const versao = (r as { versao: number }).versao;
      setDocs((d) => d.map((x) => (x.id === doc.id ? { ...x, conteudo: rascunho, versao } : x)));
      setEditandoId(null);
      toast.success("Documento atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  };

  const sistema = docs.find((d) => d.tipo === "sistema");
  const gestao = docs.find((d) => d.tipo === "gestao");

  return (
    <div>
      <PageHeader
        title="Documentação do projeto"
        description="Documentos vivos do Sistema SERGET — atualizados a cada sprint."
      />
      <div className="px-6 py-6">
        <Tabs defaultValue="sistema">
          <TabsList>
            <TabsTrigger value="sistema">Sistema SERGET</TabsTrigger>
            <TabsTrigger value="gestao">Gestão do Projeto</TabsTrigger>
          </TabsList>

          {[sistema, gestao].map((doc) => {
            if (!doc) return null;
            const editando = editandoId === doc.id;
            return (
              <TabsContent key={doc.id} value={doc.tipo}>
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold">{doc.titulo}</h2>
                      <p className="text-xs text-muted-foreground">
                        Versão {doc.versao} · atualizado em{" "}
                        {new Date(doc.atualizado_em).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    {isAdmin && !editando && (
                      <Button variant="outline" size="sm" onClick={() => handleEditar(doc)}>
                        Editar
                      </Button>
                    )}
                    {editando && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditandoId(null)}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={() => handleSalvar(doc)}>
                          Salvar
                        </Button>
                      </div>
                    )}
                  </div>

                  {editando ? (
                    <Textarea
                      value={rascunho}
                      onChange={(e) => setRascunho(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                    />
                  ) : (
                    <article className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{doc.conteudo}</ReactMarkdown>
                    </article>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}