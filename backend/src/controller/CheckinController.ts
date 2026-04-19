import { type Request, type Response } from "express";
import { z } from "zod"
import { prisma } from "../database/prisma";

import { parseISO, startOfDay, endOfDay } from "date-fns"


export class CheckinController {
    async createCheckin(req: Request, res: Response) {
        const bodySchema = z.object({
            type: z.enum(["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"]),
            latitude: z.number(),
            longitude: z.number()
        })

        try {

            const { type, latitude, longitude } = bodySchema.parse(req.body);

            const userId = req.user.id

            const user = await prisma.user.findUnique({
                where: {
                    id: userId
                }
            })

            if (!user) return res.status(404).json({ message: "User not found" })

            const checkin = await prisma.checkIn.create({
                data: {
                    type,
                    latitude,
                    longitude,
                    userId,
                    companyId: user.companyId
                }
            })

            return res.status(201).json(checkin)

        } catch (error) {

            console.error("ERRO COMPLETO DO PRISMA:", error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid request body", errors: error.issues })
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

            const user = await prisma.user.findUnique({
                where: {
                    id: userId
                }
            })

            if (!user) return res.status(404).json({ message: "User not found" })

            if (!date) return res.status(400).json({ message: "Date query parameter is required" })

            const parsedDate = parseISO(date)

            const checkins = await prisma.checkIn.findMany({
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
            console.error("ERRO COMPLETO DO PRISMA:", error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid request body", errors: error.issues })
            }
            return res.status(500).json({ message: "Erro interno ao buscar os pontos. Tente novamente." })
        }

    }
}