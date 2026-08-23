import { baseLayout } from "./layout.js";
import { Env } from "../utils/environment.js";

export function renderEmployeeWelcome(props: {
  employeeName: string;
  companyName: string;
}): { subject: string; html: string; text: string } {
  const subject = `Bem-vindo à ${props.companyName} — seu acesso Viggo está pronto`;
  const preheader = `Seu acesso à ${props.companyName} na Viggo foi criado.`;
  const frontendUrl = Env.FRONTEND_URL || "https://viggo.com.br";
  const html = baseLayout({
    preheader,
    title: `Bem-vindo, ${props.employeeName}! 👋`,
    subtitle: `Você agora faz parte da ${props.companyName} na Viggo.`,
    ctaUrl: `${frontendUrl}/`,
    ctaLabel: "Acessar Viggo",
    children: `
      <p style="margin:0 0 12px 0; color:#1c1c1e; font-size:14px; line-height:22px;">
        Seu cadastro foi concluído. Você já pode bater ponto com reconhecimento facial e acompanhar seus registros.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #e5e5e5; border-radius:8px;">
        <tr><td style="padding:10px 16px; font-size:13px; color:#5a5a5c;"><strong style="color:#0a0a0a;">Empresa:</strong> ${props.companyName}</td></tr>
        <tr><td style="padding:10px 16px; font-size:13px; color:#5a5a5c; border-top:1px solid #f0f0f0;"><strong style="color:#0a0a0a;">Próximo passo:</strong> cadastre sua biometria facial no primeiro acesso.</td></tr>
      </table>
      <p style="margin:12px 0 0 0; color:#5a5a5c; font-size:13px; line-height:20px;">
        Dica: use o mesmo e-mail deste convite para fazer login.
      </p>
    `,
  });
  const text = `Bem-vindo, ${props.employeeName}! Você faz parte da ${props.companyName} na Viggo. Acesse: ${frontendUrl}/`;
  return { subject, html, text };
}
