import { baseLayout } from "./layout.js";
import { Env } from "../utils/environment.js";

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function renderTrialEnding(props: {
  companyName: string;
  daysRemaining: 3 | 1;
  planExpiresAt: Date;
}): { subject: string; html: string; text: string } {
  const isUrgent = props.daysRemaining === 1;
  const subject = isUrgent
    ? `Último dia do seu trial Ponto Fragata — ative agora e não perca seus dados`
    : `Seu trial Ponto Fragata termina em 3 dias — ative seu plano`;
  const preheader = `Faltam ${props.daysRemaining} ${props.daysRemaining === 1 ? "dia" : "dias"} para o fim do trial da ${props.companyName}.`;
  const frontendUrl = Env.FRONTEND_URL || "https://viggo.fragata.me";
  const badgeColor = isUrgent ? "#d45656" : "#c37d0d";
  const badgeBg = isUrgent ? "#fdecea" : "#fef3e2";

  const html = baseLayout({
    preheader,
    title: isUrgent ? "Último dia do trial ⏰" : "Seu trial está acabando",
    subtitle: `O trial da ${props.companyName} termina em ${formatDate(props.planExpiresAt)}.`,
    ctaUrl: `${frontendUrl}/plano`,
    ctaLabel: "Ativar plano agora",
    children: `
      <div style="display:inline-block; padding:6px 12px; background:${badgeBg}; border:1px solid ${badgeColor}; color:${badgeColor}; border-radius:9999px; font-size:12px; font-weight:700; letter-spacing:0.3px; margin-bottom:12px;">
        Faltam ${props.daysRemaining} ${props.daysRemaining === 1 ? "dia" : "dias"}
      </div>
      <p style="margin:0 0 12px 0; color:#1c1c1e; font-size:14px; line-height:22px;">
        ${isUrgent
          ? `Amanhã o acesso da sua equipe será bloqueado. Ative seu plano hoje para continuar batendo ponto sem interrupção.`
          : `Em 3 dias o acesso da sua equipe será bloqueado. Garanta a continuidade ativando seu plano agora.`}
      </p>
      <p style="margin:0; color:#5a5a5c; font-size:13px; line-height:20px;">
        Seus dados permanecem seguros mesmo após o fim do trial. Basta ativar o plano para retomar o acesso.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px; background:#ffffff; border:1px solid #e5e5e5; border-radius:8px;">
        <tr>
          <td style="padding:12px 16px; font-size:13px; color:#5a5a5c;">
            <strong style="color:#0a0a0a;">Empresa:</strong> ${props.companyName}<br/>
            <strong style="color:#0a0a0a;">Trial até:</strong> ${formatDate(props.planExpiresAt)}
          </td>
        </tr>
      </table>
    `,
  });

  const text = `${subject}

O trial da ${props.companyName} termina em ${formatDate(props.planExpiresAt)} (faltam ${props.daysRemaining} dias).

Ative seu plano em: ${frontendUrl}/plano`;

  return { subject, html, text };
}
