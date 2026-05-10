export function formatCurrencyBRL(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatCnpjCpf(prestador: { cnpj?: string | null; cpf?: string | null }): string {
  return prestador.cnpj || prestador.cpf || "—";
}

export function formatDateBR(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}
