import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, LayoutDashboard, ChevronDown, Briefcase, Users, ClipboardList } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, user, signOut, isControladoria } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openCtrl, setOpenCtrl] = useState(pathname.startsWith("/controladoria"));

  const nome = profile?.nome || user?.email?.split("@")[0] || "usuário";

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  const isActive = (p: string) => pathname === p;
  const startsWith = (p: string) => pathname.startsWith(p);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="h-2.5 w-2.5 rounded-sm bg-sidebar-primary" aria-hidden />
          <span className="text-sm font-semibold tracking-wide">SERGET</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4 text-sm">
          <Link
            to="/dashboard"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 hover:bg-sidebar-accent",
              isActive("/dashboard") && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          {isControladoria && (
            <div>
              <button
                type="button"
                onClick={() => setOpenCtrl((v) => !v)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 hover:bg-sidebar-accent",
                  startsWith("/controladoria") && "text-sidebar-accent-foreground",
                )}
              >
                <span className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4" />
                  Controladoria
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", openCtrl && "rotate-180")} />
              </button>
              {openCtrl && (
                <div className="mt-1 space-y-1 pl-9">
                  <Link
                    to="/controladoria/prestadores"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] hover:bg-sidebar-accent",
                      startsWith("/controladoria/prestadores") &&
                        "bg-sidebar-accent text-sidebar-accent-foreground",
                    )}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Prestadores PJ
                  </Link>
                  <Link
                    to="/controladoria/aprovacoes"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] hover:bg-sidebar-accent",
                      startsWith("/controladoria/aprovacoes") &&
                        "bg-sidebar-accent text-sidebar-accent-foreground",
                    )}
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Aprovações
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>
        <div className="border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/70">
          SERGET · Sistema Integrado
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-medium text-card-foreground">Olá, {nome}</h1>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}