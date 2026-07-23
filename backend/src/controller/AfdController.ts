import { type Request, type Response } from "express";
import { z } from "zod";
import { extendedPrisma } from "../database/prisma-extensions.js";

/**
 * AFD - Arquivo Fonte de Dados
 * Portaria MTE 671/2021, Art. 78, §5o - leiaute definido no Anexo II
 *
 * Formato: arquivo texto com registros separados por pipe (|)
 * Registros:
 *   Tipo 1 - Header (1 por arquivo)
 *   Tipo 2 - Detalhe (1 por batida)
 *   Tipo 9 - Trailer (1 por arquivo)
 */

function formatDateAfd(date: Date): string {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

function mapCheckinTypeToAfdCode(type: string): string {
    const map: Record<string, string> = {
        ENTRY: "1",
        LUNCH_START: "2",
        LUNCH_END: "3",
        EXIT: "4",
    };
    return map[type] ?? "0";
}

export class AfdController {
    /**
     * GET /checkins/export/afd?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
     *
     * Gera o AFD conforme Anexo II da Portaria 671/2021.
     * Formato texto com separador pipe (|).
     *
     * Multi-tenancy: o extendedPrisma injeta automaticamente companyId
     * via AsyncLocalStorage nas queries de Company e CheckIn.
     */
    async exportAfd(req: Request, res: Response) {
        const querySchema = z.object({
            startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate deve estar no formato YYYY-MM-DD"),
            endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate deve estar no formato YYYY-MM-DD"),
        });

        try {
            const { startDate, endDate } = querySchema.parse(req.query);

            const companyId = req.user?.companyId;
            if (!companyId) {
                return res.status(403).json({ message: "Acesso negado" });
            }

            const company = await extendedPrisma.company.findUnique({
                where: { id: companyId },
                select: { cnpj: true, name: true },
            });

            if (!company) {
                return res.status(404).json({ message: "Empresa não encontrada" });
            }

            const cnpjClean = company.cnpj.replace(/\D/g, "");

            const checkins = await extendedPrisma.checkIn.findMany({
                where: {
                    createdAt: {
                        gte: new Date(`${startDate}T00:00:00`),
                        lte: new Date(`${endDate}T23:59:59`),
                    },
                },
                orderBy: [{ ano: "asc" }, { nsr: "asc" }],
                include: {
                    user: { select: { cpf: true, name: true } },
                },
            });

            const lines: string[] = [];

            // --- Header (Registro Tipo 1) ---
            // Formato: tipo|cnpj|ie|razaoSocial|dataIni|dataFim
            const dataIni = formatDateAfd(new Date(`${startDate}T00:00:00`));
            const dataFim = formatDateAfd(new Date(`${endDate}T23:59:59`));

            lines.push(
                [
                    "1",
                    cnpjClean,
                    "",
                    company.name,
                    dataIni,
                    dataFim,
                ].join("|")
            );

            // --- Detalhe (Registros Tipo 2) ---
            // Formato: tipo|cnpjEmpregador|cpfEmpregado|nsr|dataHora|codigo
            for (const checkin of checkins) {
                const cpf = checkin.user?.cpf?.replace(/\D/g, "") ?? "";
                const dataHora = formatDateAfd(checkin.createdAt);
                const codigo = mapCheckinTypeToAfdCode(checkin.type);
                const nsrFmt = String(checkin.nsr).padStart(6, "0");

                // F18: usa o snapshot employerCnpj do checkin (historico)
                const cnpjEmpregador = checkin.employerCnpj.replace(/\D/g, "");

                lines.push(
                    [
                        "2",
                        cnpjEmpregador,
                        cpf,
                        nsrFmt,
                        dataHora,
                        codigo,
                    ].join("|")
                );
            }

            // --- Trailer (Registro Tipo 9) ---
            // Formato: tipo|cnpj|totalRegistros
            lines.push(
                [
                    "9",
                    cnpjClean,
                    String(checkins.length).padStart(6, "0"),
                ].join("|")
            );

            const content = lines.join("\n");
            const filename = `AFD_${cnpjClean}_${startDate}_${endDate}.txt`;

            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${filename}"`
            );
            return res.send(content);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: "Parâmetros inválidos", errors: error.issues });
            }
            console.error("Erro ao gerar AFD:", error);
            return res.status(500).json({ message: "Erro ao gerar AFD" });
        }
    }
}
