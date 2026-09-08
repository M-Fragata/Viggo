import PDFDocument from "pdfkit";
import type { ComprovanteEstruturado } from "../utils/comprovanteGenerator.js";

/**
 * Gera um documento PDF formatado como ticket/recibo oficial do comprovante de registro de ponto
 * conforme Portaria MTE nº 671/2021 (REP-P - Anexo III).
 */
export async function gerarComprovantePdf(dados: ComprovanteEstruturado): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Dimensões estilo ticket voucher (340pt x 530pt)
    const doc = new PDFDocument({
      size: [340, 530],
      margins: { top: 24, bottom: 24, left: 24, right: 24 },
      info: {
        Title: `Comprovante de Ponto - NSR ${dados.nsr}`,
        Author: dados.assinadoPor,
        Subject: "Comprovante do Registro de Ponto do Trabalhador",
        Keywords: "ponto, comprovante, rep-p, portaria 671, mte",
        CreationDate: new Date(),
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const width = 340;
    const height = 530;

    // Fundo branco com borda sutil e cantos arredondados
    doc.rect(0, 0, width, height).fill("#ffffff");
    doc.roundedRect(12, 12, width - 24, height - 24, 8).lineWidth(1).stroke("#e2e8f0");

    // Detalhe gráfico decorativo no canto superior esquerdo (estilo Secullum / Ponto Fragata)
    doc.save();
    doc.lineWidth(2).strokeColor("#059669"); // Emerald accent
    doc.moveTo(24, 28).lineTo(34, 28).stroke();
    doc.moveTo(24, 28).lineTo(24, 38).stroke();
    doc.restore();

    let y = 32;

    // Cabeçalho: Nome do Sistema e Título Oficial
    doc.fillColor("#059669").fontSize(8).font("Helvetica-Bold");
    doc.text(dados.softwareName.toUpperCase(), 28, y);
    y += 14;

    doc.fillColor("#0f172a").fontSize(13).font("Helvetica-Bold");
    doc.text("Comprovante do Registro de Ponto", 28, y);
    y += 24;

    // Bloco 1: NSR, Data e Hora
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#0f172a");
    doc.text("NSR:", 28, y, { continued: true });
    doc.font("Courier-Bold").text(`  ${dados.nsr}`);
    y += 16;

    doc.font("Helvetica-Bold").text("Data:", 28, y, { continued: true });
    doc.font("Helvetica").text(`  ${dados.data}    `, { continued: true });
    doc.font("Helvetica-Bold").text("Hora:", { continued: true });
    doc.font("Helvetica").text(`  ${dados.hora}`);
    y += 22;

    // Bloco 2: Colaborador
    doc.font("Helvetica-Bold").text("Nome:", 28, y, { continued: true });
    doc.font("Helvetica").text(`  ${dados.employeeName}`);
    y += 16;

    doc.font("Helvetica-Bold").text("CPF:", 28, y, { continued: true });
    doc.font("Helvetica").text(`  ${dados.employeeCpf}`);
    y += 22;

    // Bloco 3: Empregador
    doc.font("Helvetica-Bold").fontSize(10.5).text(dados.companyName, 28, y);
    y += 15;

    doc.fontSize(10).font("Helvetica-Bold").text("CNPJ:", 28, y, { continued: true });
    doc.font("Helvetica").text(`  ${dados.companyCnpj}`);
    y += 20;

    // Registro INPI (se houver configurado)
    if (dados.inpi) {
      doc.font("Helvetica-Bold").text("Registro INPI:", 28, y, { continued: true });
      doc.font("Helvetica").text(`  ${dados.inpi}`);
      y += 20;
    }

    // Bloco 4: Hash SHA-256 (Inviolabilidade)
    doc.font("Helvetica-Bold").text("Hash:", 28, y);
    doc.font("Courier-Bold").fontSize(7.5).fillColor("#1e293b");
    doc.text(dados.hashLinha1, 68, y);
    y += 11;
    doc.text(dados.hashLinha2, 68, y);
    y += 18;

    // Bloco 5: Assinatura Digital e Emissão
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#0f172a");
    doc.text("Assinado digitalmente por:", 28, y);
    y += 13;

    doc.font("Helvetica").fontSize(9.5).fillColor("#334155");
    doc.text(dados.assinadoPor, 28, y);
    y += 18;

    doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#0f172a");
    doc.text("Data e Hora da emissão:", 28, y, { continued: true });
    doc.font("Helvetica").text(`  ${dados.dataHoraEmissao}`);
    y += 24;

    // Bloco 6: Selo de Certificação ICP-Brasil / Portaria 671
    const badgeY = y;
    doc.roundedRect(28, badgeY, width - 56, 42, 4).fill("#f8fafc").stroke("#cbd5e1");

    doc.fillColor("#047857").fontSize(7.5).font("Helvetica-Bold");
    doc.text("[✓] ASSINADO DIGITALMENTE", 36, badgeY + 7);

    doc.fillColor("#475569").fontSize(6.5).font("Helvetica");
    doc.text("Padrão ICP-Brasil (PKCS#7) • Portaria MTE nº 671/2021 (REP-P)", 36, badgeY + 18);
    doc.text("A conformidade com a assinatura pode ser verificada em assinador.iti.br", 36, badgeY + 27);

    doc.end();
  });
}
