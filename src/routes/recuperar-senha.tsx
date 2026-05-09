import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SergetLogo } from "@/components/serget/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/recuperar-senha")({
  component: RecuperarSenhaPage,
});

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nova-senha`,
    });
    setEnviando(false);
    setEnviado(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <SergetLogo className="mb-2" />
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Sistema Integrado de Gestão
        </p>

        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <h1 className="mb-2 text-lg font-medium text-card-foreground">Recuperar senha</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Informe seu e-mail cadastrado para receber o link de redefinição.
          </p>

          {enviado ? (
            <div className="space-y-4">
              <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
                Se este e-mail estiver cadastrado, você receberá um link em instantes.
              </p>
              <Link
                to="/login"
                className="block text-center text-sm text-primary underline-offset-4 hover:underline"
              >
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={enviando}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {enviando ? "Enviando..." : "Enviar link"}
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Voltar para o login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}