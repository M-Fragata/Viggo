import { type Request, type Response } from "express";
import { prisma } from "../database/prisma";
import { z } from "zod"
import { parseISO, startOfDay, endOfDay } from "date-fns"

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

            const data = employees.map((employee) => {

                let checkinUser: any = []

                checkins.map((checkin) => {
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
            console.log(user)
            if (!user) return res.status(404).json({ message: "User not found" })
                
            if (!user.faceDescriptor) return res.status(403).json({ message: "Registro facial pendente. Por favor, cadastre sua face antes de bater o ponto." })

            return res.status(200).json(user.faceDescriptor)

        } catch (error) {

            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
            }

            return res.status(500).json({ message: "Erro ao buscar funcionário" });
        }
    }
}