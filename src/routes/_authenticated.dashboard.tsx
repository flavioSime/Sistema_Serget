import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { isControladoria } = useAuth();

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-lg border border-border bg-card p-8">
          <h2 className="text-lg font-medium text-card-foreground">
            Bem-vindo ao Sistema Integrado SERGET
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Use o menu lateral para acessar os módulos disponíveis para o seu perfil.
          </p>
        </div>

        {isControladoria && (
          <Link
            to="/controladoria/prestadores"
            className="group flex items-center justify-between rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-card-foreground">Controladoria · Prestadores PJ</h3>
                <p className="text-xs text-muted-foreground">
                  Solicitações, contratos e GED dos prestadores PJ.
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </div>
  );
}
