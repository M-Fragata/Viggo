import { baseLayout } from "./layout.js";
import { Env } from "../utils/environment.js";

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const tipoLabel: Record<string, string> = {
  ABONO: "Abono",
  FALTA: "Falta",
  ATESTADO: "Atestado",
  JUSTIFICATIVA_GERAL: "Justificativa geral",
};

export function renderJustificativaDecided(props: {
  employeeName: string;
  tipo: string;
  aprovado: boolean;
  dataInicio: Date;
}): { subject: string; html: string; text: string } {
  const label = tipoLabel[props.tipo] || props.tipo;
  const subject = props.aprovado
    ? `Justificativa aprovada — ${label}`
    : `Justificativa não aprovada — ${label}`;
  const preheader = props.aprovado
    ? `Sua justificativa do tipo ${label} foi aprovada.`
    : `Sua justificativa do tipo ${label} não foi aprovada.`;
  const frontendUrl = Env.FRONTEND_URL;

  const badge = props.aprovado
    ? `<div style="display:inline-block; padding:6px 12px; background:#e6f9f3; border:1px solid #00d4a4; color:#1ba673; border-radius:9999px; font-size:12px; font-weight:700; margin-bottom:12px;">✓ Aprovada</div>`
    : `<div style="display:inline-block; padding:6px 12px; background:#fdecea; border:1px solid #d45656; color:#d45656; border-radius:9999px; font-size:12px; font-weight:700; margin-bottom:12px;">✕ Não aprovada</div>`;

  const html = baseLayout({
    preheader,
    title: props.aprovado ? "Justificativa aprovada ✅" : "Justificativa não aprovada",
    subtitle: `Olá, ${props.employeeName}. Sua justificativa de ${label} foi avaliada.`,
    ctaUrl: `${frontendUrl}/justificativas`,
    ctaLabel: "Ver minhas justificativas",
    children: `
      ${badge}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #e5e5e5; border-radius:8px;">
        <tr><td style="padding:10px 16px; font-size:13px; color:#5a5a5c; border-bottom:1px solid #f0f0f0;"><strong style="color:#0a0a0a;">Tipo:</strong> ${label}</td></tr>
        <tr><td style="padding:10px 16px; font-size:13px; color:#5a5a5c; border-bottom:1px solid #f0f0f0;"><strong style="color:#0a0a0a;">Data:</strong> ${formatDate(props.dataInicio)}</td></tr>
        <tr><td style="padding:10px 16px; font-size:13px; color:#5a5a5c;"><strong style="color:#0a0a0a;">Resultado:</strong> ${props.aprovado ? "Aprovada" : "Não aprovada"}</td></tr>
      </table>
      <p style="margin:12px 0 0 0; color:#5a5a5c; font-size:13px; line-height:20px;">
        ${props.aprovado ? "Sua justificativa foi aceita e registrada." : "Entre em contato com seu gestor para mais detalhes."}
      </p>
    `,
  });

  const text = `${subject}

Olá, ${props.employeeName}.
Tipo: ${label}
Data: ${formatDate(props.dataInicio)}
Resultado: ${props.aprovado ? "Aprovada" : "Não aprovada"}

Ver: ${frontendUrl}/justificativas
 
Em caso de dúvidas, entre em contato com matheus@fragata.me.`;

  return { subject, html, text };
}
