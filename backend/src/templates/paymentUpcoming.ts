import { baseLayout } from "./layout.js";
import { Env } from "../utils/environment.js";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function renderPaymentUpcoming(props: {
  companyName: string;
  amount: number;
  dueDate: Date;
  daysRemaining: 3 | 1;
}): { subject: string; html: string; text: string } {
  const isUrgent = props.daysRemaining === 1;
  const subject = isUrgent
    ? `Vencimento amanhã — Ponto Fragata ${formatBRL(props.amount)}`
    : `Lembrete: pagamento Ponto Fragata em 3 dias — ${formatBRL(props.amount)}`;
  const preheader = `Seu pagamento de ${formatBRL(props.amount)} vence em ${formatDate(props.dueDate)}.`;
  const frontendUrl = Env.FRONTEND_URL || "https://viggo.fragata.me";
  const badgeColor = isUrgent ? "#d45656" : "#c37d0d";
  const badgeBg = isUrgent ? "#fdecea" : "#fef3e2";
  const html = baseLayout({
    preheader,
    title: isUrgent ? "Pagamento vence amanhã ⏰" : "Pagamento em 3 dias",
    subtitle: `O pagamento da ${props.companyName} vence em ${formatDate(props.dueDate)}.`,
    ctaUrl: `${frontendUrl}/plano`,
    ctaLabel: "Ver pagamento",
    children: `
      <div style="display:inline-block; padding:6px 12px; background:${badgeBg}; border:1px solid ${badgeColor}; color:${badgeColor}; border-radius:9999px; font-size:12px; font-weight:700; margin-bottom:12px;">
        Vence em ${props.daysRemaining} ${props.daysRemaining === 1 ? "dia" : "dias"}
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #e5e5e5; border-radius:8px;">
        <tr><td style="padding:10px 16px; font-size:13px; color:#5a5a5c; border-bottom:1px solid #f0f0f0;"><strong style="color:#0a0a0a;">Empresa:</strong> ${props.companyName}</td></tr>
        <tr><td style="padding:10px 16px; font-size:13px; color:#5a5a5c; border-bottom:1px solid #f0f0f0;"><strong style="color:#0a0a0a;">Valor:</strong> ${formatBRL(props.amount)}</td></tr>
        <tr><td style="padding:10px 16px; font-size:13px; color:#5a5a5c;"><strong style="color:#0a0a0a;">Vencimento:</strong> ${formatDate(props.dueDate)}</td></tr>
      </table>
      <p style="margin:12px 0 0 0; color:#5a5a5c; font-size:13px; line-height:20px;">
        ${isUrgent ? "Evite suspensão: garanta que o pagamento seja compensado até amanhã." : "Programe o pagamento para evitar suspensão automática."}
      </p>
    `,
  });
  const text = `${subject}\nEmpresa: ${props.companyName}\nValor: ${formatBRL(props.amount)}\nVencimento: ${formatDate(props.dueDate)}\n${frontendUrl}/plano`;
  return { subject, html, text };
}
