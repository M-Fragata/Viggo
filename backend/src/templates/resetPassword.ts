import { baseLayout } from "./layout.js";

export function renderResetPassword(props: { code: string }): { subject: string; html: string; text: string } {
  const subject = `Código de redefinição de senha - Viggo`;
  const preheader = `Seu código é ${props.code}. Expira em 10 minutos.`;
  const html = baseLayout({
    preheader,
    title: "Redefinição de senha 🔑",
    subtitle: "Você solicitou a redefinição da sua senha.",
    children: `
      <p style="margin:0 0 16px 0; color:#1c1c1e; font-size:14px; line-height:22px;">
        Utilize o código abaixo para continuar:
      </p>
      <div style="background:#ffffff; border:1px solid #e5e5e5; border-radius:12px; padding:20px; text-align:center; margin:16px 0;">
        <span style="font-size:32px; font-weight:800; letter-spacing:8px; color:#0a0a0a; font-family:ui-monospace, SFMono-Regular, Menlo, monospace;">${props.code}</span>
      </div>
      <p style="margin:0; color:#c37d0d; background:#fef3e2; border:1px solid #f5d6a0; border-radius:8px; padding:10px 12px; font-size:12px; line-height:18px;">
        ⏱️ Este código expira em <strong>10 minutos</strong> e só pode ser usado 5 vezes.
      </p>
      <p style="margin:12px 0 0 0; color:#888; font-size:12px; line-height:18px;">
        Se você não solicitou esta redefinição, ignore este e-mail com segurança.
      </p>
    `,
  });
  const text = `Código de redefinição: ${props.code}\nExpira em 10 minutos. Se não solicitou, ignore.`;
  return { subject, html, text };
}
