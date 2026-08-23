import { baseLayout } from "./layout.js";
import { Env } from "../utils/environment.js";

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function renderBiometricExpiring(props: {
  userName: string;
  expiresAt: Date;
}): { subject: string; html: string; text: string } {
  const subject = `Sua biometria facial expira em 30 dias — revalide seu acesso`;
  const preheader = `Por segurança (LGPD), sua biometria precisa ser revalidada até ${formatDate(props.expiresAt)}.`;
  const frontendUrl = Env.FRONTEND_URL || "https://viggo.com.br";

  const html = baseLayout({
    preheader,
    title: "Sua biometria está vencendo 🔒",
    subtitle: `Olá, ${props.userName}. Por segurança, sua biometria expira em ${formatDate(props.expiresAt)}.`,
    ctaUrl: `${frontendUrl}/register`,
    ctaLabel: "Revalidar biometria",
    children: `
      <p style="margin:0 0 12px 0; color:#1c1c1e; font-size:14px; line-height:22px;">
        Conforme nossa política de retenção (LGPD Art. 15), dados biométricos expiram após <strong>24 meses</strong> e precisam ser revalidados.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #e5e5e5; border-radius:8px; margin-top:12px;">
        <tr><td style="padding:12px 16px; font-size:13px; color:#5a5a5c;"><strong style="color:#0a0a0a;">Expira em:</strong> ${formatDate(props.expiresAt)}</td></tr>
      </table>
      <p style="margin:12px 0 0 0; color:#c37d0d; background:#fef3e2; border:1px solid #f5d6a0; border-radius:8px; padding:10px 12px; font-size:13px; line-height:18px;">
        ⚠️ Se não revalidar, seu acesso por reconhecimento facial será removido e você precisará cadastrar novamente.
      </p>
      <p style="margin:12px 0 0 0; color:#5a5a5c; font-size:13px; line-height:20px;">
        Leva menos de 1 minuto. Basta acessar o painel e seguir as instruções de cadastro facial.
      </p>
    `,
  });

  const text = `Sua biometria está vencendo

Olá, ${props.userName}.
Sua biometria expira em ${formatDate(props.expiresAt)}.

Revalide em: ${frontendUrl}/register

Se não revalidar, seu acesso por reconhecimento facial será removido.`;

  return { subject, html, text };
}
