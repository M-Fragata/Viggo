import { baseLayout } from "./layout.js";
import { Env } from "../utils/environment.js";

export function renderSubscriptionCancelled(props: {
  companyName: string;
}): { subject: string; html: string; text: string } {
  const subject = `Assinatura cancelada — ${props.companyName}`;
  const preheader = `Sua assinatura Ponto Fragata foi cancelada.`;
  const frontendUrl = Env.FRONTEND_URL;
  const html = baseLayout({
    preheader,
    title: "Assinatura cancelada",
    subtitle: `A assinatura da ${props.companyName} foi cancelada.`,
    ctaUrl: `${frontendUrl}/plano`,
    ctaLabel: "Reativar plano",
    children: `
      <p style="margin:0 0 12px 0; color:#1c1c1e; font-size:14px; line-height:22px;">
        Seu acesso permanece disponível até o fim do período já pago. Após isso, a empresa será bloqueada mas os dados permanecem seguros.
      </p>
      <div style="background:#ffffff; border:1px solid #e5e5e5; border-radius:8px; padding:12px 16px; font-size:13px; color:#5a5a5c;">
        <strong style="color:#0a0a0a;">Empresa:</strong> ${props.companyName}<br/>
        <span style="font-size:12px; color:#888;">Para reativar, escolha novamente PIX ou Cartão em “Plano”.</span>
      </div>
      <p style="margin:12px 0 0 0; color:#5a5a5c; font-size:13px;">
        Em caso de dúvidas, entre em contato com <a href="mailto:matheus@fragata.me" style="color:#00b48a;">matheus@fragata.me</a>
      </p>
    `,
  });
  const text = `Assinatura cancelada — ${props.companyName}\nReative em: ${frontendUrl}/plano\n\nEm caso de dúvidas, entre em contato com matheus@fragata.me.`;
  return { subject, html, text };
}
