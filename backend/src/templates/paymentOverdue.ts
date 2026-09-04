import { baseLayout } from "./layout.js";
import { Env } from "../utils/environment.js";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function renderPaymentOverdue(props: {
  companyName: string;
  amount: number;
  dueDate: Date;
}): { subject: string; html: string; text: string } {
  const subject = `Pagamento em atraso — regularize sua assinatura Ponto Fragata`;
  const preheader = `Sua empresa ${props.companyName} está com pagamento em atraso de ${formatBRL(props.amount)}.`;
  const frontendUrl = Env.FRONTEND_URL || "https://viggo.fragata.me";

  const html = baseLayout({
    preheader,
    title: "Pagamento em atraso ⚠️",
    subtitle: `O pagamento da ${props.companyName} venceu em ${formatDate(props.dueDate)}.`,
    ctaUrl: `${frontendUrl}/plano`,
    ctaLabel: "Regularizar agora",
    children: `
      <div style="display:inline-block; padding:6px 12px; background:#fdecea; border:1px solid #d45656; color:#d45656; border-radius:9999px; font-size:12px; font-weight:700; margin-bottom:12px;">
        ● Em atraso
      </div>
      <p style="margin:0 0 12px 0; color:#1c1c1e; font-size:14px; line-height:22px;">
        Sua empresa foi <strong>suspensa</strong> por falta de pagamento. Regularize para retomar o acesso da equipe sem perder dados.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #e5e5e5; border-radius:8px;">
        <tr><td style="padding:12px 16px; font-size:13px; color:#5a5a5c; border-bottom:1px solid #f0f0f0;"><strong style="color:#0a0a0a;">Empresa:</strong> ${props.companyName}</td></tr>
        <tr><td style="padding:12px 16px; font-size:13px; color:#5a5a5c; border-bottom:1px solid #f0f0f0;"><strong style="color:#0a0a0a;">Valor:</strong> ${formatBRL(props.amount)}</td></tr>
        <tr><td style="padding:12px 16px; font-size:13px; color:#5a5a5c;"><strong style="color:#0a0a0a;">Vencimento:</strong> ${formatDate(props.dueDate)}</td></tr>
      </table>
      <p style="margin:16px 0 0 0; color:#5a5a5c; font-size:13px; line-height:20px;">
        Após a confirmação do pagamento, o acesso é liberado automaticamente. Em caso de dúvidas, fale com <a href="mailto:matheus@fragata.me" style="color:#00b48a;">matheus@fragata.me</a>.
      </p>
    `,
  });

  const text = `Pagamento em atraso

Empresa: ${props.companyName}
Valor: ${formatBRL(props.amount)}
Vencimento: ${formatDate(props.dueDate)}

Sua empresa foi suspensa. Regularize em: ${frontendUrl}/plano
 
Em caso de dúvidas, entre em contato com matheus@fragata.me.`;

  return { subject, html, text };
}
