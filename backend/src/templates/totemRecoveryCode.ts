import { baseLayout } from "./layout.js";

export function renderTotemRecoveryCode(props: {
  code: string;
  companyName: string;
  adminName?: string | undefined;
}): { subject: string; html: string; text: string } {
  const subject = `Código de Desbloqueio do Totem - ${props.companyName} | Ponto Fragata`;
  const preheader = `Seu código de desbloqueio do Totem é ${props.code}. Expira em 10 minutos.`;
  const saudacao = props.adminName ? `Olá, <strong>${props.adminName}</strong>!` : "Olá!";

  const html = baseLayout({
    preheader,
    title: "Desbloqueio do Totem 📱🔒",
    subtitle: `Solicitação de encerramento de sessão do terminal da empresa ${props.companyName}.`,
    children: `
      <p style="margin:0 0 16px 0; color:#1c1c1e; font-size:14px; line-height:22px;">
        ${saudacao} Foi solicitada a saída do modo Totem em um terminal físico. Para confirmar e encerrar a sessão com segurança, digite o código de 6 dígitos abaixo na tela do aparelho:
      </p>
      <div style="background:#ffffff; border:1px solid #e5e5e5; border-radius:12px; padding:20px; text-align:center; margin:16px 0;">
        <span style="font-size:34px; font-weight:800; letter-spacing:8px; color:#10b981; font-family:ui-monospace, SFMono-Regular, Menlo, monospace;">${props.code}</span>
      </div>
      <p style="margin:0; color:#c37d0d; background:#fef3e2; border:1px solid #f5d6a0; border-radius:8px; padding:10px 12px; font-size:12px; line-height:18px;">
        ⏱️ Este código expira em <strong>10 minutos</strong> e só pode ser utilizado para este terminal.
      </p>
      <p style="margin:12px 0 0 0; color:#888; font-size:12px; line-height:18px;">
        Se você ou sua equipe não solicitaram este desbloqueio no terminal da empresa, verifique imediatamente o dispositivo físico.
      </p>
    `,
  });

  const text = `Código de desbloqueio do Totem: ${props.code}\nEmpresa: ${props.companyName}\nExpira em 10 minutos. Se não foi você, verifique o terminal físico.\n\nEm caso de dúvidas, entre em contato com matheus@fragata.me.`;
  return { subject, html, text };
}
