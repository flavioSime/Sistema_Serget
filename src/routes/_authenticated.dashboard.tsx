import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const nome = profile?.nome || user?.email?.split("@")[0] || "usuário";

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="h-2.5 w-2.5 rounded-sm bg-sidebar-primary" aria-hidden />
          <span className="text-sm font-semibold tracking-wide">SERGET</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          <a
            href="#"
            className="flex items-center gap-3 rounded-md bg-sidebar-accent px-3 py-2 text-sm text-sidebar-accent-foreground"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </a>
        </nav>
        <div className="border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/70">
          Módulo 0 · Autenticação
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-medium text-card-foreground">
              Olá, {nome}
            </h1>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </header>

        <main className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-lg border border-border bg-card p-8">
              <h2 className="text-lg font-medium text-card-foreground">
                Bem-vindo ao Sistema Integrado SERGET
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Os módulos operacionais aparecerão no menu lateral conforme forem
                ativados. Você está autenticado e pronto para começar.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}