import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/controladoria")({
  component: ControladoriaLayout,
});

function ControladoriaLayout() {
  const { isControladoria, loading, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Aguarda papéis carregarem antes de bloquear
    if (loading) return;
    if (roles.length === 0) return; // ainda carregando roles
    if (!isControladoria) navigate({ to: "/dashboard", replace: true });
  }, [isControladoria, loading, roles, navigate]);

  if (!isControladoria) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para ver esta informação.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
