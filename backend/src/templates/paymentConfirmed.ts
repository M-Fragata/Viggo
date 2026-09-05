import { baseLayout } from "./layout.js";
import { Env } from "../utils/environment.js";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function billingLabel(type: string): string {
  if (type === "PIX") return "PIX";
  if (type === "CREDIT_CARD") return "Cartão de crédito";
  if (type === "BOLETO") return "Boleto";
  return type;
}

export function renderPaymentConfirmed(props: {
  companyName: string;
  amount: number;
  billingType: string;
  paidAt: Date;
  nfseUrl?: string | null;
}): { subject: string; html: string; text: string } {
  const subject = `Pagamento confirmado — Ponto Fragata ${formatBRL(props.amount)}`;
  const preheader = `Recebemos seu pagamento de ${formatBRL(props.amount)}. Sua assinatura está ativa.`;
  const frontendUrl = Env.FRONTEND_URL;

  const nfseBlock = props.nfseUrl
    ? `<p style="margin:12px 0 0 0; font-size:13px;"><a href="${props.nfseUrl}" target="_blank" style="color:#00b48a; text-decoration:underline;">Baixar NFSe</a></p>`
    : `<p style="margin:12px 0 0 0; font-size:12px; color:#888;">NFSe será emitida em até 48h.</p>`;

  const html = baseLayout({
    preheader,
    title: "Pagamento confirmado! ✅",
    subtitle: `Recebemos ${formatBRL(props.amount)} da ${props.companyName}.`,
    ctaUrl: `${frontendUrl}/plano`,
    ctaLabel: "Ver histórico",
    children: `
      <div style="display:inline-block; padding:6px 12px; background:#e6f9f3; border:1px solid #00d4a4; color:#1ba673; border-radius:9999px; font-size:12px; font-weight:700; margin-bottom:12px;">
        ● Confirmado em ${formatDate(props.paidAt)}
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #e5e5e5; border-radius:8px;">
        <tr><td style="padding:12px 16px; font-size:13px; color:#5a5a5c; border-bottom:1px solid #f0f0f0;"><strong style="color:#0a0a0a;">Empresa:</strong> ${props.companyName}</td></tr>
        <tr><td style="padding:12px 16px; font-size:13px; color:#5a5a5c; border-bottom:1px solid #f0f0f0;"><strong style="color:#0a0a0a;">Valor:</strong> ${formatBRL(props.amount)}</td></tr>
        <tr><td style="padding:12px 16px; font-size:13px; color:#5a5a5c; border-bottom:1px solid #f0f0f0;"><strong style="color:#0a0a0a;">Forma:</strong> ${billingLabel(props.billingType)}</td></tr>
        <tr><td style="padding:12px 16px; font-size:13px; color:#5a5a5c;"><strong style="color:#0a0a0a;">Data:</strong> ${formatDate(props.paidAt)}</td></tr>
      </table>
      ${nfseBlock}
      <p style="margin:16px 0 0 0; color:#5a5a5c; font-size:13px; line-height:20px;">
        Sua assinatura foi renovada por mais 30 dias. Obrigado por confiar no Ponto Fragata!
      </p>
    `,
  });

  const text = `Pagamento confirmado!

Empresa: ${props.companyName}
Valor: ${formatBRL(props.amount)}
Forma: ${billingLabel(props.billingType)}
Data: ${formatDate(props.paidAt)}
${props.nfseUrl ? `NFSe: ${props.nfseUrl}` : ""}

Ver histórico: ${frontendUrl}/plano
 
Em caso de dúvidas, entre em contato com matheus@fragata.me.`;

  return { subject, html, text };
}
