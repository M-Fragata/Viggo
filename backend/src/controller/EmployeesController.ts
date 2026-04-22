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
                }
            })

            const data = employees.map(employee => {

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
}