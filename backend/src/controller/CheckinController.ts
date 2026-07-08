import { type Request, type Response } from "express";
import { z } from "zod"
import { extendedPrisma } from "../database/prisma-extensions.js";

import { parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns"


export class CheckinController {
    async createCheckin(req: Request, res: Response) {
        const bodySchema = z.object({
            type: z.enum(["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"]),
            latitude: z.number(),
            longitude: z.number()
        })

        try {

            const userId = req.user.id

            const user = await extendedPrisma.user.findUnique({
                where: {
                    id: userId
                }
            })

            if (!user) return res.status(404).json({ message: "Usuário não encontrado" })

            const { type, latitude, longitude } = bodySchema.parse(req.body);

            const today = new Date()
            const checkinExists = await extendedPrisma.checkIn.findFirst({
                where: {
                    userId,
                    type,
                    createdAt: {
                        gte: startOfDay(today),
                        lte: endOfDay(today)
                    }
                }
            })
            if (checkinExists) {
                return res.status(400).json({ message: `Ponto de ${type} já registrado hoje.` })
            }

            const checkin = await extendedPrisma.checkIn.create({
                data: {
                    type,
                    latitude,
                    longitude,
                    userId,
                    companyId: user.companyId,
                }
            })

            const data = {
                checkin: { checkin },
                faceDescriptor: user.faceDescriptor
            }

            return res.status(201).json(data)

        } catch (error) {

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
                }
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
}