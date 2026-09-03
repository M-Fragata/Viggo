import { baseLayout } from "./layout.js";
import { Env } from "../utils/environment.js";

export function renderBiometricPurged(props: {
  userName: string;
}): { subject: string; html: string; text: string } {
  const subject = `Sua biometria foi removida — revalidação necessária`;
  const preheader = `Sua biometria expirou e foi removida por segurança (LGPD).`;
  const frontendUrl = Env.FRONTEND_URL || "https://viggo.fragata.me";
  const html = baseLayout({
    preheader,
    title: "Biometria removida 🔒",
    subtitle: `Olá, ${props.userName}. Sua biometria facial foi removida por segurança.`,
    ctaUrl: `${frontendUrl}/register`,
    ctaLabel: "Cadastrar biometria novamente",
    children: `
      <p style="margin:0 0 12px 0; color:#1c1c1e; font-size:14px; line-height:22px;">
        Conforme a LGPD (Art. 15) e nossa política de retenção de 24 meses, dados biométricos expirados são removidos automaticamente.
      </p>
      <div style="background:#fdecea; border:1px solid #d45656; color:#a33; border-radius:8px; padding:12px 16px; font-size:13px; line-height:20px;">
        Seu acesso por reconhecimento facial está <strong>desativado</strong> até que você cadastre novamente.
      </div>
      <p style="margin:12px 0 0 0; color:#5a5a5c; font-size:13px; line-height:20px;">
        O processo leva menos de 1 minuto. Faça login e siga as instruções de cadastro facial.
      </p>
    `,
  });
  const text = `Olá, ${props.userName}. Sua biometria foi removida por expirar (24 meses, LGPD). Cadastre novamente em: ${frontendUrl}/register`;
  return { subject, html, text };
}
