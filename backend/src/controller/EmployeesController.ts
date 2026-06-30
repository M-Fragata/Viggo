import { type Request, type Response } from "express";
import { prisma } from "../database/prisma.js";
import { type User, type CheckIn } from '@prisma/client';
import { check, z } from "zod"
import { parseISO, startOfDay, endOfDay } from "date-fns"
import { euclideanDistance } from "../utils/euclideanDistance.js"

export class EmployeesController {
    async getEmployees(req: Request, res: Response) {

        const paramsSchema = z.object({
            date: z.string()
        })

        try {

            const { date } = paramsSchema.parse(req.query)

            const parsedDate = parseISO(date)

            const employees = await prisma.user.findMany()
            const checkins = await prisma.checkIn.findMany({
                where: {
                    createdAt: {
                        gte: startOfDay(parsedDate),
                        lte: endOfDay(parsedDate)
                    }
                } as any
            })

            const data = employees.map((employee: User) => {

                let checkinUser: any = []

                checkins.map((checkin: CheckIn) => {
                    if (checkin.userId === employee.id) checkinUser.push(checkin)
                })

                const { password, ...employeeWithoutPassword } = employee

                return {
                    ...employeeWithoutPassword,
                    checkins: checkinUser
                }
            })

            res.json(data)
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch employees" })
        }
    }

    async index(req: Request, res: Response) {

        try {
            const id = req.user.id

            const user = await prisma.user.findUnique({
                where: {
                    id
                }
            })

            if (!user) return res.status(404).json({ message: "User not found" })
                
            if (!user.faceDescriptor) return res.status(403).json({ code: "FACE_NOT_REGISTERED", message: "Registro facial pendente. Por favor, cadastre sua face antes de bater o ponto." })

            return res.status(200).json(user.faceDescriptor)

        } catch (error) {

            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
            }

            return res.status(500).json({ message: "Erro ao buscar funcionário" });
        }
    }

    async verifyFace(req: Request, res: Response) {
        const bodySchema = z.object({
            descriptor: z.array(z.number()).min(128).max(128)
        })

        try {
            const userId = req.user.id
            const { descriptor } = bodySchema.parse(req.body)

            const user = await prisma.user.findUnique({
                where: { id: userId }
            })

            if (!user) return res.status(404).json({ message: "Usuário não encontrado" })

            if (!user.faceDescriptor) {
                return res.status(403).json({
                    code: "FACE_NOT_REGISTERED",
                    message: "Registro facial pendente. Por favor, cadastre sua face antes de bater o ponto."
                })
            }

            const savedDescriptor = new Float32Array(Object.values(user.faceDescriptor as Record<string, number>))
            const inputDescriptor = new Float32Array(descriptor)

            const distance = euclideanDistance(inputDescriptor, savedDescriptor)
            const threshold = 0.5

            if (distance < threshold) {
                return res.json({ success: true, distance })
            }

            return res.status(200).json({
                success: false,
                distance,
                message: "Rosto não reconhecido"
            })
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados inválidos", errors: error.issues })
            }

            return res.status(500).json({ message: "Erro ao verificar face" })
        }
    }
}