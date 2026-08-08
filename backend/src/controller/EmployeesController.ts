import { type Request, type Response } from "express";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { type User, type CheckIn } from '@prisma/client';
import { check, z } from "zod"
import { parseISO, startOfDay, endOfDay } from "date-fns"
import { euclideanDistance } from "../utils/euclideanDistance.js"
import crypto from "node:crypto";
import { decryptFaceDescriptor, hasFaceDescriptor } from "../utils/faceEncryption.js";

interface FaceToken {
    descriptor: Float32Array;
    expiresAt: Date;
}

export class EmployeesController {
    private faceTokens = new Map<string, FaceToken>();

    async getEmployees(req: Request, res: Response) {

        const paramsSchema = z.object({
            date: z.string()
        })

        try {

            const { date } = paramsSchema.parse(req.query)

            const parsedDate = parseISO(date)

            const employees = await extendedPrisma.user.findMany({
                select: { id: true, name: true, email: true, role: true, companyId: true, faceDescriptor: true, workScheduleId: true, createdAt: true, updatedAt: true }
            })

            const employeesData = employees.map((employee) => ({
                ...employee,
                hasFaceDescriptor: hasFaceDescriptor(employee.faceDescriptor as string | null),
                faceDescriptor: undefined,
            }))
            const checkins = await extendedPrisma.checkIn.findMany({
                where: {
                    createdAt: {
                        gte: startOfDay(parsedDate),
                        lte: endOfDay(parsedDate)
                    }
                }
            })

            const data = employeesData.map((employee) => {

                let checkinUser: CheckIn[] = []

                checkins.map((checkin: CheckIn) => {
                    if (checkin.userId === employee.id) checkinUser.push(checkin)
                })

                return {
                    ...employee,
                    checkins: checkinUser
                }
            })

            res.json(data)
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch employees" })
        }
    }

    /**
     * GET /employees/face/token
     * Emite um token de uso único (TTL 30s) para comparação facial segura.
     * O descriptor NÃO é retornado ao client — apenas o token.
     */
    async issueFaceToken(req: Request, res: Response) {
        try {
            const userId = req.user.id;

            const user = await extendedPrisma.user.findUnique({
                where: { id: userId },
                select: { faceDescriptor: true },
            });

            if (!user) {
                return res.status(404).json({ message: "Usuário não encontrado" });
            }

            if (!user.faceDescriptor) {
                return res.status(403).json({
                    code: "FACE_NOT_REGISTERED",
                    message: "Registro facial pendente. Por favor, cadastre sua face antes de bater o ponto.",
                });
            }

            const descriptor = decryptFaceDescriptor(user.faceDescriptor as string);
            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 30_000);

            this.faceTokens.set(token, { descriptor, expiresAt });

            setTimeout(() => this.faceTokens.delete(token), 30_000);

            return res.json({ token, expiresIn: 30 });
        } catch (error) {
            console.error("Erro ao gerar token facial:", error);
            return res.status(500).json({ message: "Erro ao gerar token facial" });
        }
    }

    /**
     * POST /employees/face/verify
     * Valida descriptor facial capturado contra o descriptor salvo.
     * Exige token de uso único (TTL 30s) — descriptor nunca é exposto ao client.
     */
    async verifyFace(req: Request, res: Response) {
        const bodySchema = z.object({
            token: z.string().uuid(),
            descriptor: z.array(z.number()).min(128).max(128),
        });

        try {
            const { token, descriptor } = bodySchema.parse(req.body);

            const stored = this.faceTokens.get(token);
            if (!stored) {
                return res.status(401).json({ message: "Token inválido ou expirado" });
            }

            if (stored.expiresAt < new Date()) {
                this.faceTokens.delete(token);
                return res.status(401).json({ message: "Token expirado" });
            }

            this.faceTokens.delete(token);

            const inputDescriptor = new Float32Array(descriptor);
            const distance = euclideanDistance(inputDescriptor, stored.descriptor);
            const threshold = 0.5;

            if (distance < threshold) {
                return res.json({ success: true, distance });
            }

            return res.status(200).json({
                success: false,
                distance,
                message: "Rosto não reconhecido",
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
            }

            return res.status(500).json({ message: "Erro ao verificar face" });
        }
    }
}
