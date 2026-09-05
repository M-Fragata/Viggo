import { Env } from "../utils/environment.js";

export interface BaseLayoutProps {
  preheader: string;
  title: string;
  subtitle?: string;
  children: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function baseLayout(props: BaseLayoutProps): string {
  const frontendUrl = Env.FRONTEND_URL;
  const ctaBlock = props.ctaUrl && props.ctaLabel
    ? `
      <tr>
        <td align="center" style="padding: 8px 32px 32px 32px;">
          <a href="${esc(props.ctaUrl)}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block; padding:14px 32px; background-color:#00d4a4; color:#0a0a0a; text-decoration:none; border-radius:9999px; font-weight:700; font-size:15px; font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;">
            ${esc(props.ctaLabel)}
          </a>
        </td>
      </tr>`
    : "";

  const subtitleBlock = props.subtitle
    ? `<p style="margin:8px 0 0 0; color:#888888; font-size:14px; line-height:20px; font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;">${esc(props.subtitle)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(props.title)}</title>
</head>
<body style="margin:0; padding:0; background-color:#f7f7f7; font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;">
  <!-- Preheader -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">
    ${esc(props.preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f7f7; padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e5e5e5;">
          <!-- Header -->
          <tr>
            <td bgcolor="#0a0a0a" style="padding:24px 32px; text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.5px; font-family:Inter, system-ui, sans-serif;">
                    <span style="color:#00d4a4;">●</span> Ponto Fragata
                  </td>
                  <td align="right" style="font-size:11px; color:#888888; letter-spacing:0.8px; text-transform:uppercase; font-family:Inter, system-ui, sans-serif;">
                    Ponto Inteligente
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:32px 32px 0 32px;">
              <h1 style="margin:0; font-size:22px; font-weight:700; color:#0a0a0a; line-height:28px; font-family:Inter, system-ui, sans-serif;">${esc(props.title)}</h1>
              ${subtitleBlock}
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="padding:24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f7f7; border:1px solid #e5e5e5; border-radius:12px;">
                <tr>
                  <td style="padding:24px; color:#0a0a0a; font-size:14px; line-height:22px; font-family:Inter, system-ui, sans-serif;">
                    ${props.children}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${ctaBlock}

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none; border-top:1px solid #e5e5e5; margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 24px 32px; text-align:center;">
              <p style="margin:0; color:#888888; font-size:12px; line-height:18px; font-family:Inter, system-ui, sans-serif;">
                Ponto Fragata — Ponto eletrônico com reconhecimento facial<br/>
                <a href="${esc(frontendUrl)}/termos-de-uso" style="color:#00b48a; text-decoration:none;">Termos</a>
                &nbsp;•&nbsp;
                <a href="${esc(frontendUrl)}/politica-privacidade" style="color:#00b48a; text-decoration:none;">Privacidade</a>
                &nbsp;•&nbsp;
                <a href="${esc(frontendUrl)}/contrato-tratamento-dados" style="color:#00b48a; text-decoration:none;">DPA</a>
              </p>
              <p style="margin:8px 0 0 0; color:#a8a8aa; font-size:11px; line-height:16px; font-family:Inter, system-ui, sans-serif;">
                Em caso de dúvidas, entre em contato: <a href="mailto:matheus@fragata.me" style="color:#888888; text-decoration:underline;">matheus@fragata.me</a>
              </p>
              <p style="margin:8px 0 0 0; color:#a8a8aa; font-size:11px; line-height:16px; font-family:Inter, system-ui, sans-serif;">
                Este é um e-mail automático, por favor não responda diretamente.
              </p>
            </td>
          </tr>
        </table>

        <!-- Extra footer outside card -->
        <p style="margin:16px 0 0 0; color:#a8a8aa; font-size:11px; font-family:Inter, system-ui, sans-serif;">
          © ${new Date().getFullYear()} Ponto Fragata. Todos os direitos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
