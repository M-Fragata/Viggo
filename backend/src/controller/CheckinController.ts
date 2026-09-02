import { type Request, type Response } from "express";
import { z } from "zod"
import { extendedPrisma } from "../database/prisma-extensions.js";
import { getNextNSR, currentYear, NsrLimitExceededError } from "../utils/nsrGenerator.js";
import { decryptCpf, formatCpfDigits } from "../utils/cpfEncryption.js"
import { gerarComprovante } from "../utils/comprovanteGenerator.js";
import { gerarRelatorioMensal, gerarRelatorioMensalPdf } from "../services/relatorioMensalService.js";
import { signContent } from "../utils/afSignature.js";

import { parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { avaliarLocalizacaoCheckin } from "../services/geofenceService.js";


export class CheckinController {
    async createCheckin(req: Request, res: Response) {
        const bodySchema = z.object({
            type: z.enum(["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"]),
            latitude: z.number().finite().min(-90).max(90).nullable().optional(),
            longitude: z.number().finite().min(-180).max(180).nullable().optional(),
            accuracy: z.number().finite().min(0).max(100000).nullable().optional(),
            geolocationDenied: z.boolean().optional().default(false),
            geolocationConsent: z.boolean().nullable().optional(),
            address: z.string().max(500).nullable().optional(),
        }).superRefine((data, ctx) => {
            if (!data.geolocationDenied && (data.latitude == null || data.longitude == null)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "latitude/longitude obrigatórios quando GPS permitido", path: ["latitude"] });
            }
        })

        try {

            const userId = req.user.id

            const user = await extendedPrisma.user.findUnique({
                where: {
                    id: userId
                }
            })

            if (!user) return res.status(404).json({ message: "Usuário não encontrado" })

            const { type, latitude, longitude, accuracy, geolocationDenied, geolocationConsent, address } = bodySchema.parse(req.body);

            const today = new Date()
            const checkinsHoje = await extendedPrisma.checkIn.findMany({
                where: {
                    userId,
                    createdAt: {
                        gte: startOfDay(today),
                        lte: endOfDay(today)
                    }
                },
                select: { type: true }
            });

            const tiposHoje = new Set(checkinsHoje.map(c => c.type));

            if (tiposHoje.has(type as any)) {
                return res.status(400).json({ message: `Ponto de ${type} já registrado hoje.` })
            }

            // Máquina de estados — A4: EXIT só exige ENTRY (flexível com almoço)
            if (type === "LUNCH_START" && !tiposHoje.has("ENTRY")) {
                return res.status(409).json({ message: "É necessário bater ENTRY antes de LUNCH_START.", code: "INVALID_SEQUENCE", expected: ["ENTRY"] });
            }
            if (type === "LUNCH_END" && !tiposHoje.has("LUNCH_START")) {
                return res.status(409).json({ message: "É necessário bater LUNCH_START antes de LUNCH_END.", code: "INVALID_SEQUENCE", expected: ["LUNCH_START"] });
            }
            if (type === "EXIT" && !tiposHoje.has("ENTRY")) {
                return res.status(409).json({ message: "É necessário bater ENTRY antes de EXIT.", code: "INVALID_SEQUENCE", expected: ["ENTRY"] });
            }

            // B3 — Escala Seg-Dom: conta ENTRY na semana; se excede limite → justificativa (não bloqueia, CLT 74)
            let foraDaEscala = false;
            let escalaMotivo: string | null = null;
            if (user.workScheduleId) {
                const schedule = await extendedPrisma.workSchedule.findUnique({
                    where: { id: user.workScheduleId },
                    select: { jornadaTipo: true, name: true },
                });
                if (schedule?.jornadaTipo && type === "ENTRY") {
                    const inicioSemana = startOfWeek(today, { weekStartsOn: 1 });
                    const fimSemana = endOfWeek(today, { weekStartsOn: 1 });
                    const entriesSemana = await extendedPrisma.checkIn.count({
                        where: {
                            userId,
                            type: "ENTRY",
                            createdAt: { gte: inicioSemana, lte: fimSemana },
                        },
                    });
                    const limites: Record<string, number> = { "5x2": 5, "6x1": 6, "12x36": 4 };
                    const limite = limites[schedule.jornadaTipo] ?? 6;
                    if (entriesSemana >= limite) {
                        foraDaEscala = true;
                        escalaMotivo = `Escala ${schedule.jornadaTipo} (${schedule.name}): ${entriesSemana + 1}º ENTRY na semana Seg-Dom (limite ${limite}). Encaminhado para justificativa.`;
                    }
                }
            }

            const companyId = user.companyId;
            const ano = currentYear();

            // F18: Snapshot do CNPJ do empregador no momento da batida.
            // Garante identificacao historica correta em caso de troca de CNPJ
            // (incorporacao/cisao) - Portaria 671 Art. 78 §5o-A II.
            const company = await extendedPrisma.company.findUnique({
                where: { id: companyId },
                select: { cnpj: true, name: true },
            });

            if (!company) {
                return res.status(404).json({ message: "Empresa não encontrada" });
            }

            // A2 mínimo: preservar horário cru (inviolabilidade Port.671 Art.80).
            // Tolerância CLT Art.58 §1º (5 min/batida, 10 min/dia) é aplicada
            // apenas no cálculo do relatório (relatorioMensalService), não na gravação.
            const rawCreatedAt = new Date();

            // Gerar NSR e criar CheckIn em transacao para garantir atomicidade.
            // Usamos extendedPrisma.$transaction para que o `tx` herde a extensao
            // multi-tenant (injecao automatica de companyId via AsyncLocalStorage).
            // Em race condition rara, a constraint unique [companyId, nsr, ano]
            // falha e o erro e lancado para retratativa pelo chamador.
            const finalLatitude = geolocationDenied ? null : (latitude ?? null);
            const finalLongitude = geolocationDenied ? null : (longitude ?? null);
            const finalAccuracy = geolocationDenied ? null : (accuracy ?? null);
            // address ignorado por enquanto — reverse-geocode pendente (ver PENDENCIAS-CONFORMIDADE.md A4)
            const finalAddress = address ?? null;

            // Auditoria Geográfica (Item 3.8 / Portaria 671 MTE):
            // Calcula a menor distância em relação a todos os polos ativos da empresa.
            // O ponto é sempre aceito; se fora do raio, audita sem bloquear.
            const auditoriaGeofence = await avaliarLocalizacaoCheckin(companyId, finalLatitude, finalLongitude);

            const checkin = await extendedPrisma.$transaction(async (tx) => {
                const nsr = await getNextNSR(tx as unknown as Parameters<typeof getNextNSR>[0], companyId, ano);

                const created = await tx.checkIn.create({
                    data: {
                        type,
                        latitude: finalLatitude,
                        longitude: finalLongitude,
                        geolocationAccuracy: finalAccuracy,
                        geolocationDenied: !!geolocationDenied,
                        geolocationConsent: geolocationConsent ?? !geolocationDenied,
                        address: finalAddress,
                        workLocationId: auditoriaGeofence.poloMaisProximo?.id ?? null,
                        distanciaMetros: auditoriaGeofence.distanciaMetros,
                        dentroDoRaio: auditoriaGeofence.dentroDoRaio,
                        nsr,
                        ano,
                        userId,
                        companyId,
                        employerCnpj: company.cnpj,
                        createdAt: rawCreatedAt,
                    }
                });

                // A4: se GPS negado, gera justificativa pendente automaticamente para admin aprovar
                if (geolocationDenied) {
                    await tx.justificativa.create({
                        data: {
                            tipo: "JUSTIFICATIVA_GERAL",
                            descricao: `Ponto ${type} sem localização — GPS negado pelo colaborador. CheckIn ${created.id} em ${rawCreatedAt.toISOString()}. Pendente de análise.`,
                            dataInicio: rawCreatedAt,
                            userId,
                            companyId,
                            checkinId: created.id,
                            aprovado: null,
                        }
                    });
                }

                // Item 3.8: se a empresa possui polos e o colaborador bateu fora do raio estipulado,
                // registra justificativa de auditoria para visualização clara do RH (sem bloquear o ponto)
                if (auditoriaGeofence.possuiPolosCadastrados && !auditoriaGeofence.dentroDoRaio) {
                    await tx.justificativa.create({
                        data: {
                            tipo: "JUSTIFICATIVA_GERAL",
                            descricao: auditoriaGeofence.mensagemAuditoria,
                            dataInicio: rawCreatedAt,
                            userId,
                            companyId,
                            checkinId: created.id,
                            aprovado: null,
                        }
                    });
                }

                // B3: escala Seg-Dom excedida → justificativa para admin aprovar (não bloqueia, CLT 74)
                if (foraDaEscala && escalaMotivo) {
                    await tx.justificativa.create({
                        data: {
                            tipo: "JUSTIFICATIVA_GERAL",
                            descricao: `${escalaMotivo} CheckIn ${created.id} em ${rawCreatedAt.toISOString()}.`,
                            dataInicio: rawCreatedAt,
                            userId,
                            companyId,
                            checkinId: created.id,
                            aprovado: null,
                        }
                    });
                }

                return created;
            });

            const comprovante = gerarComprovante({
                nsr: checkin.nsr,
                companyName: company.name,
                companyCnpj: company.cnpj,
                employeeName: user.name,
                employeeCpf: formatCpfDigits(decryptCpf(user.cpf ?? "")),
                checkinType: type,
                checkinDate: checkin.createdAt,
                latitude: checkin.latitude ?? null,
                longitude: checkin.longitude ?? null,
            });

            // Assinatura plug-and-play do comprovante (Anexo III) — sem cert → só hash, com cert → PKCS#7
            const sig = signContent(comprovante.texto);

            // Headers para clientes que validam via header (espelha AEJ/AFD)
            res.setHeader("X-Hash-SHA256", sig.hash);
            if (sig.assinado && sig.assinatura) res.setHeader("X-Signature", sig.assinatura);
            if (sig.erro) res.setHeader("X-Signature-Error", sig.erro);

            if (foraDaEscala && escalaMotivo) {
                res.setHeader("X-Fora-Da-Escala", "true");
            }

            return res.status(201).json({
                checkin: { checkin },
                comprovante: comprovante.texto,
                hashVerificacao: comprovante.hashVerificacao,
                assinatura: sig.assinado ? sig.assinatura : undefined,
                assinado: sig.assinado,
                ...(sig.erro ? { assinaturaErro: sig.erro } : {}),
                ...(foraDaEscala ? { foraDaEscala: true, escalaMotivo } : {}),
            })

        } catch (error) {

            if (error instanceof NsrLimitExceededError) {
                return res.status(503).json({
                    message:
                        "Limite de 999.999 registros de ponto no ano corrente atingido. " +
                        "Contate o suporte."
                });
            }

            console.error("Erro ao registrar ponto:", error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados inválidos", errors: error.issues })
            }
            return res.status(500).json({ message: "Erro interno ao registrar o ponto. Tente novamente." })
        }

    }

    async index(req: Request, res: Response) {

        const paramsSchema = z.object({
            date: z.string().optional()
        })

        try {
            const { date } = paramsSchema.parse(req.query);

            const userId = req.user.id

            const user = await extendedPrisma.user.findUnique({
                where: {
                    id: userId
                }
            })

            if (!user) return res.status(404).json({ message: "Usuário não encontrado" })

            const hoje = date || new Date().toISOString()

            const parsedDate = parseISO(hoje)

            const checkins = await extendedPrisma.checkIn.findMany({
                where: {
                    userId,
                    createdAt: {
                        gte: startOfDay(parsedDate),
                        lte: endOfDay(parsedDate)
                    }
                },
                include: {
                    workLocation: {
                        select: { id: true, nome: true, raioMetros: true }
                    }
                },
                orderBy: { createdAt: "asc" }
            })

            return res.status(200).json(checkins)

        } catch (error) {
            console.error("Erro ao buscar pontos:", error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Parâmetros inválidos", errors: error.issues })
            }
            return res.status(500).json({ message: "Erro interno ao buscar os pontos. Tente novamente." })
        }

    }

    async listByCompany(req: Request, res: Response) {

        const paramsSchema = z.object({
            date: z.string().optional()
        })

        try {
            const { date } = paramsSchema.parse(req.query);

            const companyId = req.user.companyId;
            if (!companyId) {
                return res.status(403).json({ message: "Acesso negado" });
            }

            const hoje = date || new Date().toISOString()
            const parsedDate = parseISO(hoje)

            const employees = await extendedPrisma.user.findMany({
                where: { companyId },
                select: { id: true, name: true },
            });

            const checkins = await extendedPrisma.checkIn.findMany({
                where: {
                    companyId,
                    createdAt: {
                        gte: startOfDay(parsedDate),
                        lte: endOfDay(parsedDate),
                    },
                },
                include: {
                    workLocation: {
                        select: { id: true, nome: true, raioMetros: true }
                    }
                },
                orderBy: { createdAt: "asc" },
            });

            const result = employees
                .map((emp) => ({
                    employeeId: emp.id,
                    employeeName: emp.name,
                    checkins: checkins
                        .filter((c) => c.userId === emp.id)
                        .map((c) => ({
                            id: c.id,
                            createdAt: c.createdAt.toISOString(),
                            type: c.type,
                            latitude: c.latitude,
                            longitude: c.longitude,
                            distanciaMetros: c.distanciaMetros,
                            dentroDoRaio: c.dentroDoRaio,
                            workLocation: c.workLocation,
                        })),
                }))
                .filter((emp) => emp.checkins.length > 0);

            return res.status(200).json(result);

        } catch (error) {
            console.error("Erro ao buscar pontos da empresa:", error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Parâmetros inválidos", errors: error.issues });
            }
            return res.status(500).json({ message: "Erro interno ao buscar os pontos. Tente novamente." });
        }

    }

    async listMonthly(req: Request, res: Response) {

        const paramsSchema = z.object({
            year: z.coerce.number().min(2020).max(2100),
            month: z.coerce.number().min(1).max(12),
        })

        try {
            const { year, month } = paramsSchema.parse(req.query);

            const companyId = req.user.companyId;
            if (!companyId) {
                return res.status(403).json({ message: "Acesso negado" });
            }

            const monthStart = startOfMonth(new Date(year, month - 1));
            const monthEnd = endOfMonth(new Date(year, month - 1));

            const employees = await extendedPrisma.user.findMany({
                where: { companyId },
                select: { id: true, name: true },
            });

            const checkins = await extendedPrisma.checkIn.findMany({
                where: {
                    companyId,
                    createdAt: {
                        gte: monthStart,
                        lte: monthEnd,
                    },
                },
                orderBy: { createdAt: "asc" },
            });

            const result = employees.map((emp) => ({
                employeeId: emp.id,
                employeeName: emp.name,
                checkins: checkins
                    .filter((c) => c.userId === emp.id)
                    .map((c) => ({
                        id: c.id,
                        createdAt: c.createdAt.toISOString(),
                        type: c.type,
                    })),
            }));

            return res.status(200).json(result);

        } catch (error) {
            console.error("Erro ao buscar folha mensal:", error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Parâmetros inválidos", errors: error.issues });
            }
            return res.status(500).json({ message: "Erro interno ao buscar folha mensal. Tente novamente." });
        }

    }

    async exportRelatorioMensal(req: Request, res: Response) {
        const paramsSchema = z.object({
            year: z.coerce.number().min(2020).max(2100),
            month: z.coerce.number().min(1).max(12),
            format: z.enum(["csv", "pdf"]).default("csv"),
        });

        try {
            const { year, month, format } = paramsSchema.parse(req.query);

            const companyId = req.user.companyId;
            if (!companyId) {
                return res.status(403).json({ message: "Acesso negado" });
            }

            if (format === "pdf") {
                const { pdf, filename, hash } = await gerarRelatorioMensalPdf(companyId, year, month);
                const sig = signContent(hash); // assina o hash do relatório

                res.setHeader("Content-Type", "application/pdf");
                res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
                res.setHeader("X-Hash-SHA256", hash);
                if (sig.assinado && sig.assinatura) res.setHeader("X-Signature", sig.assinatura);
                if (sig.erro) res.setHeader("X-Signature-Error", sig.erro);
                return res.send(pdf);
            }

            const { csv, filename, hash } = await gerarRelatorioMensal(companyId, year, month);
            const sig = signContent(hash);

            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            res.setHeader("X-Hash-SHA256", hash);
            if (sig.assinado && sig.assinatura) res.setHeader("X-Signature", sig.assinatura);
            if (sig.erro) res.setHeader("X-Signature-Error", sig.erro);
            return res.send(csv);

        } catch (error) {
            console.error("Erro ao gerar relatório mensal:", error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Parâmetros inválidos", errors: error.issues });
            }
            return res.status(500).json({ message: "Erro ao gerar relatório mensal" });
        }
    }

    /**
     * POST /checkins/sync-offline
     * Sincroniza em lote marcações gravadas em contingência offline (IndexedDB).
     * Atribui NSR consecutivo oficial e gera comprovante fiscal para cada ponto.
     */
    async syncOfflineCheckins(req: Request, res: Response) {
        const bodySchema = z.object({
            items: z.array(
                z.object({
                    id: z.string().uuid(),
                    type: z.enum(["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"]),
                    timestamp: z.string().datetime(),
                    latitude: z.number().nullable().optional(),
                    longitude: z.number().nullable().optional(),
                    accuracy: z.number().nullable().optional(),
                    hash: z.string().optional(),
                })
            ).min(1).max(50),
        });

        try {
            const userId = req.user.id;
            const user = await extendedPrisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

            const { items } = bodySchema.parse(req.body);
            const companyId = user.companyId;
            const ano = currentYear();

            const company = await extendedPrisma.company.findUnique({
                where: { id: companyId },
                select: { cnpj: true, name: true },
            });
            if (!company) return res.status(404).json({ message: "Empresa não encontrada" });

            const syncedResults = [];

            for (const item of items) {
                const itemDate = new Date(item.timestamp);

                // Verifica duplicidade no mesmo dia para aquele tipo
                const existing = await extendedPrisma.checkIn.findFirst({
                    where: {
                        userId,
                        type: item.type,
                        createdAt: {
                            gte: startOfDay(itemDate),
                            lte: endOfDay(itemDate),
                        },
                    },
                });

                if (existing) {
                    syncedResults.push({
                        id: item.id,
                        status: "ALREADY_EXISTS",
                        checkinId: existing.id,
                        nsr: existing.nsr,
                    });
                    continue;
                }

                const checkin = await extendedPrisma.$transaction(async (tx) => {
                    const nsr = await getNextNSR(tx as unknown as Parameters<typeof getNextNSR>[0], companyId, ano);
                    return tx.checkIn.create({
                        data: {
                            type: item.type,
                            latitude: item.latitude ?? null,
                            longitude: item.longitude ?? null,
                            geolocationAccuracy: item.accuracy ?? null,
                            geolocationDenied: item.latitude == null,
                            geolocationConsent: item.latitude != null,
                            nsr,
                            ano,
                            userId,
                            companyId,
                            employerCnpj: company.cnpj,
                            createdAt: itemDate,
                        },
                    });
                });

                const comprovante = gerarComprovante({
                    nsr: checkin.nsr,
                    companyName: company.name,
                    companyCnpj: company.cnpj,
                    employeeName: user.name,
                    employeeCpf: formatCpfDigits(decryptCpf(user.cpf ?? "")),
                    checkinType: item.type,
                    checkinDate: checkin.createdAt,
                    latitude: item.latitude ?? 0,
                    longitude: item.longitude ?? 0,
                });

                syncedResults.push({
                    id: item.id,
                    status: "SYNCED",
                    checkinId: checkin.id,
                    nsr: checkin.nsr,
                    comprovante: comprovante.texto,
                });
            }

            return res.status(200).json({
                message: "Sincronização offline concluída com sucesso",
                synced: syncedResults,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados de sincronização inválidos", errors: error.issues });
            }
            console.error("Erro na sincronização offline:", error);
            return res.status(500).json({ message: "Erro ao sincronizar pontos offline" });
        }
    }
}