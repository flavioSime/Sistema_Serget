import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SergetLogo } from "@/components/serget/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/nova-senha")({
  component: NovaSenhaPage,
});

function NovaSenhaPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) {
      setErro("Não foi possível salvar. Tente abrir o link de recuperação novamente.");
      return;
    }
    setSucesso(true);
    await supabase.auth.signOut();
    setTimeout(() => navigate({ to: "/login", replace: true }), 1800);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <SergetLogo className="mb-2" />
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Sistema Integrado de Gestão
        </p>

        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <h1 className="mb-6 text-lg font-medium text-card-foreground">Definir nova senha</h1>

          {sucesso ? (
            <div className="space-y-4">
              <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
                Senha atualizada. Você já pode entrar.
              </p>
              <Link
                to="/login"
                className="block text-center text-sm text-primary underline-offset-4 hover:underline"
              >
                Ir para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="senha">Nova senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmar">Confirmar nova senha</Label>
                <Input
                  id="confirmar"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={enviando}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {enviando ? "Salvando..." : "Salvar nova senha"}
              </Button>

              {erro && (
                <p role="alert" className="text-sm text-destructive">
                  {erro}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}