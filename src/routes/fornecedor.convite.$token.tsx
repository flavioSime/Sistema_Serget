import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aceitarConviteFornecedor } from "@/lib/fornecedor/aceitar-convite.functions";

export const Route = createFileRoute("/fornecedor/convite/$token")({
  component: AceitarConvitePage,
});

function AceitarConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const aceitar = useServerFn(aceitarConviteFornecedor);

  const [estado, setEstado] = useState<"validando" | "ok" | "invalido" | "expirado" | "usado">(
    "validando",
  );
  const [email, setEmail] = useState<string>("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("validar_convite_token", { _token: token });
      const convite = Array.isArray(data) ? data[0] : data;
      if (error || !convite) {
        setEstado("invalido");
        return;
      }
      if (convite.usado_em) {
        setEstado("usado");
        return;
      }
      if (new Date(convite.expira_em) < new Date()) {
        setEstado("expirado");
        return;
      }
      setEmail(convite.email);
      setEstado("ok");
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) return toast.error("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirmar) return toast.error("As senhas não conferem.");
    setEnviando(true);
    try {
      await aceitar({ data: { token, senha } });
      // Faz login automático
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        toast.success("Acesso criado. Faça login para entrar.");
        navigate({ to: "/login", replace: true });
      } else {
        toast.success("Acesso criado. Bem-vindo(a)!");
        navigate({ to: "/fornecedor", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o acesso.");
    } finally {
      setEnviando(false);
    }
  };

  if (estado === "validando") {
    return <p className="text-sm text-muted-foreground">Validando convite…</p>;
  }
  if (estado === "invalido") {
    return (
      <Aviso titulo="Convite inválido">
        Não conseguimos validar este link. Confira com a controladoria da SERGET.
      </Aviso>
    );
  }
  if (estado === "expirado") {
    return (
      <Aviso titulo="Convite expirado">
        Este convite passou da validade. Solicite um novo à controladoria.
      </Aviso>
    );
  }
  if (estado === "usado") {
    return (
      <Aviso titulo="Convite já utilizado">
        Este convite já foi utilizado. Acesse pelo login normal.
      </Aviso>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6">
      <h1 className="text-lg font-semibold">Bem-vindo à SERGET</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Crie sua senha de acesso ao portal do fornecedor.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <Label>E-mail</Label>
          <Input value={email} disabled />
        </div>
        <div>
          <Label htmlFor="senha">Nova senha</Label>
          <Input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div>
          <Label htmlFor="confirmar">Confirmar senha</Label>
          <Input
            id="confirmar"
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? "Criando acesso…" : "Criar acesso"}
        </Button>
      </form>
    </div>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6 text-sm">
      <h1 className="text-base font-semibold">{titulo}</h1>
      <p className="mt-2 text-muted-foreground">{children}</p>
    </div>
  );
}