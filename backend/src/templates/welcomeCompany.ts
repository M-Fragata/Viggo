import { baseLayout } from "./layout.js";
import { Env } from "../utils/environment.js";

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function renderWelcomeCompany(props: {
  adminName: string;
  companyName: string;
  trialExpiresAt: Date;
}): { subject: string; html: string; text: string } {
  const subject = `Bem-vindo ao Ponto Fragata, ${props.companyName} — seu trial de 30 dias começou`;
  const preheader = `Sua empresa já está pronta para bater ponto com reconhecimento facial.`;
  const frontendUrl = Env.FRONTEND_URL || "https://viggo.fragata.me";

  const html = baseLayout({
    preheader,
    title: `Olá, ${props.adminName}! 👋`,
    subtitle: `Sua empresa ${props.companyName} foi criada com sucesso. Seu trial vai até ${formatDate(props.trialExpiresAt)}.`,
    ctaUrl: `${frontendUrl}/`,
    ctaLabel: "Acessar painel",
    children: `
      <p style="margin:0 0 12px 0; font-weight:600; color:#0a0a0a;">O que você já pode fazer:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:6px 0; color:#1c1c1e; font-size:14px;">
            <span style="display:inline-block; width:22px; height:22px; line-height:22px; text-align:center; background:#00d4a4; color:#0a0a0a; border-radius:9999px; font-size:12px; font-weight:700; margin-right:8px;">✓</span>
            Ponto por reconhecimento facial e geolocalização
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0; color:#1c1c1e; font-size:14px;">
            <span style="display:inline-block; width:22px; height:22px; line-height:22px; text-align:center; background:#00d4a4; color:#0a0a0a; border-radius:9999px; font-size:12px; font-weight:700; margin-right:8px;">✓</span>
            100% conforme Portaria 671 do MTE
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0; color:#1c1c1e; font-size:14px;">
            <span style="display:inline-block; width:22px; height:22px; line-height:22px; text-align:center; background:#00d4a4; color:#0a0a0a; border-radius:9999px; font-size:12px; font-weight:700; margin-right:8px;">✓</span>
            Gestão de equipe, relatórios e comprovantes
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0 0; color:#5a5a5c; font-size:13px; line-height:20px;">
        Seu trial é <strong style="color:#0a0a0a;">gratuito por 30 dias</strong> e inclui todas as funcionalidades. Quando estiver pronto, ative seu plano em poucos cliques.
      </p>
    `,
  });

  const text = `Olá, ${props.adminName}!

Sua empresa ${props.companyName} foi criada com sucesso. Trial até ${formatDate(props.trialExpiresAt)}.

O que você já pode fazer:
- Ponto por reconhecimento facial e geolocalização
- 100% conforme Portaria 671 do MTE
- Gestão de equipe, relatórios e comprovantes

Acesse: ${frontendUrl}/

Equipe Ponto Fragata`;

  return { subject, html, text };
}
