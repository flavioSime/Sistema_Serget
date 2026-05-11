import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/fornecedor")({
  component: FornecedorLayout,
});

function FornecedorLayout() {
  const { session, loading, signOut, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      // Permite a rota pública /fornecedor/convite/:token; demais exigem login.
      const path = window.location.pathname;
      if (!path.startsWith("/fornecedor/convite/")) {
        navigate({ to: "/login", replace: true });
      }
    }
  }, [session, loading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/fornecedor" className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden />
            <span className="text-sm font-semibold tracking-wide">SERGET · Portal do Fornecedor</span>
          </Link>
          {session && (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}