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

export function renderJustificativaCreated(props: {
  employeeName: string;
  tipo: string;
  descricao: string;
  dataInicio: Date;
  dataFim?: Date | null;
}): { subject: string; html: string; text: string } {
  const label = tipoLabel[props.tipo] || props.tipo;
  const subject = `Nova justificativa: ${label} — ${props.employeeName}`;
  const preheader = `${props.employeeName} enviou uma justificativa do tipo ${label}.`;
  const frontendUrl = Env.FRONTEND_URL || "https://viggo.fragata.me";
  const periodo = props.dataFim
    ? `${formatDate(props.dataInicio)} até ${formatDate(props.dataFim)}`
    : formatDate(props.dataInicio);
  const desc = props.descricao.length > 200 ? props.descricao.slice(0, 200) + "…" : props.descricao;

  const html = baseLayout({
    preheader,
    title: "Nova justificativa para avaliar 📋",
    subtitle: `${props.employeeName} enviou uma justificativa do tipo ${label}.`,
    ctaUrl: `${frontendUrl}/justificativas`,
    ctaLabel: "Avaliar justificativa",
    children: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #e5e5e5; border-radius:8px;">
        <tr><td style="padding:10px 16px; font-size:13px; color:#5a5a5c; border-bottom:1px solid #f0f0f0;"><strong style="color:#0a0a0a;">Colaborador:</strong> ${props.employeeName}</td></tr>
        <tr><td style="padding:10px 16px; font-size:13px; color:#5a5a5c; border-bottom:1px solid #f0f0f0;"><strong style="color:#0a0a0a;">Tipo:</strong> ${label}</td></tr>
        <tr><td style="padding:10px 16px; font-size:13px; color:#5a5a5c; border-bottom:1px solid #f0f0f0;"><strong style="color:#0a0a0a;">Período:</strong> ${periodo}</td></tr>
        <tr><td style="padding:12px 16px; font-size:13px; color:#1c1c1e; line-height:20px;"><strong style="color:#0a0a0a;">Descrição:</strong><br/>${desc}</td></tr>
      </table>
      <p style="margin:12px 0 0 0; color:#888; font-size:12px;">Acesse o painel para aprovar ou reprovar.</p>
    `,
  });

  const text = `Nova justificativa

Colaborador: ${props.employeeName}
Tipo: ${label}
Período: ${periodo}
Descrição: ${props.descricao}

Avaliar: ${frontendUrl}/justificativas`;

  return { subject, html, text };
}
