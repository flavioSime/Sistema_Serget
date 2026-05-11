// Server-only — não importar do cliente.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { Resend } from "resend";

export type NotifyTipo =
  | "ficha_recebida"
  | "reenvio_documento"
  | "ficha_aprovada"
  | "contrato_pronto";

const FROM = "SERGET <noreply@sistemaserget.com.br>";
const APP_URL = process.env.VITE_APP_URL ?? "https://sistemaserget.com.br";

const wrap = (titulo: string, corpoHtml: string) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
    <h2 style="color:#0f172a;font-size:18px;margin:0 0 16px;">${titulo}</h2>
    ${corpoHtml}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="font-size:12px;color:#6b7280;margin:0;">SERGET · Sistema Integrado</p>
  </div>
`;

const btn = (href: string, label: string) =>
  `<p style="margin:20px 0;"><a href="${href}" style="display:inline-block;background:#E8590C;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">${label}</a></p>`;

export async function enviarNotificacao(args: {
  tipo: NotifyTipo;
  entidade_id: string;
  payload?: Record<string, unknown>;
  userId?: string | null;
}): Promise<{ ok: true; enviado: boolean }> {
  const { tipo, entidade_id, userId } = args;
  const payload = args.payload ?? {};
  let enviado = false;
  const apiKey = process.env.RESEND_API_KEY;

  try {
    if (!apiKey) {
      console.warn("[notify] RESEND_API_KEY ausente — pulando envio.");
    } else {
      const resend = new Resend(apiKey);

      if (tipo === "ficha_recebida") {
        const razaoSocial = String(payload?.razao_social ?? "Prestador");
        const prestadorId = String(payload?.prestador_id ?? entidade_id);

        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "controladoria");

        const userIds = (roles ?? []).map((r) => r.user_id);
        if (userIds.length > 0) {
          const { data: users } = await supabaseAdmin.auth.admin.listUsers();
          const emails = (users?.users ?? [])
            .filter((u) => userIds.includes(u.id) && u.email)
            .map((u) => u.email as string);

          if (emails.length > 0) {
            const link = `${APP_URL}/controladoria/prestadores/${prestadorId}`;
            await resend.emails.send({
              from: FROM,
              to: emails,
              subject: `Nova ficha cadastral recebida — ${razaoSocial}`,
              html: wrap(
                "Nova ficha cadastral recebida",
                `<p>A ficha cadastral do prestador <strong>${razaoSocial}</strong> foi preenchida e está aguardando validação.</p>${btn(link, "Acessar o processo")}`,
              ),
            });
            enviado = true;
          }
        }
      }

      if (tipo === "reenvio_documento") {
        const emailFornecedor = String(payload?.email_fornecedor ?? "");
        const nomeArquivo = String(payload?.nome_arquivo ?? "documento");
        const obs = String(payload?.obs ?? "");

        if (emailFornecedor) {
          const link = `${APP_URL}/fornecedor`;
          await resend.emails.send({
            from: FROM,
            to: [emailFornecedor],
            subject: "Documento pendente de reenvio — SERGET",
            html: wrap(
              "Documento pendente de reenvio",
              `<p>Há um documento que precisa ser reenviado no seu processo de cadastro.</p>
               <p><strong>Documento:</strong> ${nomeArquivo}<br><strong>Motivo:</strong> ${obs}</p>${btn(link, "Acessar o portal")}`,
            ),
          });
          enviado = true;
        }
      }

      if (tipo === "ficha_aprovada") {
        const emailFornecedor = String(payload?.email_fornecedor ?? "");
        const razaoSocial = String(payload?.razao_social ?? "");

        if (emailFornecedor) {
          const link = `${APP_URL}/fornecedor`;
          await resend.emails.send({
            from: FROM,
            to: [emailFornecedor],
            subject: "Sua ficha foi aprovada — SERGET",
            html: wrap(
              `Olá${razaoSocial ? `, ${razaoSocial}` : ""}!`,
              `<p>Sua ficha cadastral foi validada pela equipe SERGET.</p>
               <p>Em breve você receberá o contrato para assinatura. Fique de olho no seu portal.</p>${btn(link, "Acessar o portal")}`,
            ),
          });
          enviado = true;
        }
      }

      if (tipo === "contrato_pronto") {
        const emailFornecedor = String(payload?.email_fornecedor ?? "");
        const contratoId = String(payload?.contrato_id ?? "");

        if (emailFornecedor) {
          const link = `${APP_URL}/fornecedor/contrato/${contratoId}`;
          await resend.emails.send({
            from: FROM,
            to: [emailFornecedor],
            subject: "Seu contrato está pronto para assinatura — SERGET",
            html: wrap(
              "Seu contrato está pronto",
              `<p>O contrato está pronto. Leia com atenção e registre sua assinatura pelo portal.</p>${btn(link, "Assinar contrato")}<p style="font-size:12px;color:#6b7280;">Assinatura registrada eletronicamente.</p>`,
            ),
          });
          enviado = true;
        }
      }
    }
  } catch (emailErr) {
    console.error("[notify] falha ao enviar email:", emailErr);
  }

  await supabaseAdmin.from("historico").insert({
    entidade: "email",
    entidade_id,
    acao: `email_${tipo}`,
    user_id: userId ?? null,
    payload: { ...payload, enviado } as never,
  });

  return { ok: true, enviado };
}
