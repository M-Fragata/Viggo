import { type Request, type Response } from "express";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { type CheckIn, UserRole } from '@prisma/client';
import { z } from "zod";
import { parseISO, startOfDay, endOfDay } from "date-fns";
import { euclideanDistance } from "../utils/euclideanDistance.js";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { decryptFaceDescriptor, hasFaceDescriptor } from "../utils/faceEncryption.js";

interface FaceToken {
    descriptor: Float32Array;
    expiresAt: Date;
}

/**
 * Gera uma senha temporária simples e amigável:
 * Primeiro nome do colaborador limpo + sufixo "@viggo" (garantindo no mínimo 8 caracteres).
 * Exemplo: "Ana Silva" -> "ana@viggo", "Carlos" -> "carlos@viggo", "Li Wu" -> "li@viggo"
 */
export function generateTemporaryPassword(name: string): string {
    const firstWord = name.trim().split(/\s+/)[0] || "usuario";
    const firstName = firstWord
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const base = firstName.length > 0 ? firstName : "usuario";
    const suffix = "@viggo";

    if (base.length + suffix.length < 8) {
        return `${base}123${suffix}`;
    }
    return `${base}${suffix}`;
}

export class EmployeesController {
    private faceTokens = new Map<string, FaceToken>();

    async getEmployees(req: Request, res: Response) {
        const paramsSchema = z.object({
            date: z.string().optional()
        });

        try {
            const { date } = paramsSchema.parse(req.query);
            const companyId = req.user?.companyId;

            const targetDate = date ? parseISO(date) : new Date();

            const employees = await extendedPrisma.user.findMany({
                where: companyId ? { companyId } : {},
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    companyId: true,
                    faceDescriptor: true,
                    workScheduleId: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy: { name: 'asc' }
            });

            const employeesData = employees.map((employee) => ({
                ...employee,
                hasFaceDescriptor: hasFaceDescriptor(employee.faceDescriptor as string | null),
                faceDescriptor: undefined,
            }));

            const checkins = await extendedPrisma.checkIn.findMany({
                where: {
                    createdAt: {
                        gte: startOfDay(targetDate),
                        lte: endOfDay(targetDate)
                    },
                    userId: { in: employees.map((e) => e.id) }
                }
            });

            const data = employeesData.map((employee) => {
                const checkinUser = checkins.filter((c) => c.userId === employee.id);
                return {
                    ...employee,
                    checkins: checkinUser
                };
            });

            res.json(data);
        } catch (error) {
            console.error("Erro ao buscar funcionários:", error);
            res.status(500).json({ error: "Failed to fetch employees" });
        }
    }

    /**
     * POST /employees
     * Cadastro manual individual de funcionário pela empresa.
     */
    async createEmployee(req: Request, res: Response) {
        const bodySchema = z.object({
            name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
            email: z.string().email("E-mail inválido"),
            role: z.enum(["EMPLOYEE", "ENTERPRISE_ADMIN"]).optional().default("EMPLOYEE"),
            workScheduleId: z.string().uuid().optional().nullable(),
            customPassword: z.string().min(8).optional(),
        });

        try {
            const companyId = req.user?.companyId;
            const userRole = req.user?.role;

            if (!companyId || (userRole !== "ENTERPRISE_ADMIN" && userRole !== "MASTER")) {
                return res.status(403).json({ message: "Apenas administradores podem cadastrar colaboradores" });
            }

            const { name, email, role, workScheduleId, customPassword } = bodySchema.parse(req.body);
            const normalizedEmail = email.toLowerCase().trim();

            const existingUser = await extendedPrisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (existingUser) {
                return res.status(400).json({ message: "Este e-mail já está cadastrado no sistema" });
            }

            if (workScheduleId) {
                const schedule = await extendedPrisma.workSchedule.findUnique({
                    where: { id: workScheduleId },
                });
                if (!schedule || schedule.companyId !== companyId) {
                    return res.status(400).json({ message: "Escala de trabalho não encontrada" });
                }
            }

            const rawPassword = customPassword || generateTemporaryPassword(name);
            const hashedPassword = await bcrypt.hash(rawPassword, 10);

            const newUser = await extendedPrisma.user.create({
                data: {
                    name: name.trim(),
                    email: normalizedEmail,
                    password: hashedPassword,
                    role: role as UserRole,
                    companyId,
                    workScheduleId: workScheduleId || null,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    companyId: true,
                    workScheduleId: true,
                    createdAt: true,
                },
            });

            return res.status(201).json({
                user: newUser,
                temporaryPassword: rawPassword,
                message: "Colaborador cadastrado com sucesso!",
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: error.issues[0]?.message || "Dados inválidos", errors: error.issues });
            }
            console.error("Erro ao criar colaborador:", error);
            return res.status(500).json({ message: "Erro ao cadastrar colaborador" });
        }
    }

    /**
     * POST /employees/bulk-import
     * Importação em lote de múltiplos colaboradores via CSV/Planilha.
     */
    async bulkImport(req: Request, res: Response) {
        const bodySchema = z.object({
            employees: z.array(
                z.object({
                    name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
                    email: z.string().email("E-mail inválido"),
                    role: z.enum(["EMPLOYEE", "ENTERPRISE_ADMIN"]).optional().default("EMPLOYEE"),
                    workScheduleId: z.string().optional().nullable(),
                })
            ).min(1, "Envie ao menos um colaborador").max(500, "Limite de 500 colaboradores por importação"),
        });

        try {
            const companyId = req.user?.companyId;
            const userRole = req.user?.role;

            if (!companyId || (userRole !== "ENTERPRISE_ADMIN" && userRole !== "MASTER")) {
                return res.status(403).json({ message: "Apenas administradores podem importar colaboradores" });
            }

            const { employees } = bodySchema.parse(req.body);

            const createdList: Array<{
                id: string;
                name: string;
                email: string;
                role: string;
                temporaryPassword: string;
            }> = [];

            const errorsList: Array<{
                name: string;
                email: string;
                reason: string;
            }> = [];

            // Buscar escalas existentes da empresa para validação rápida
            const companySchedules = await extendedPrisma.workSchedule.findMany({
                where: { companyId },
                select: { id: true, name: true }
            });
            const validScheduleIds = new Set(companySchedules.map(s => s.id));

            for (const emp of employees) {
                const normalizedEmail = emp.email.toLowerCase().trim();

                try {
                    const existingUser = await extendedPrisma.user.findUnique({
                        where: { email: normalizedEmail },
                    });

                    if (existingUser) {
                        errorsList.push({
                            name: emp.name,
                            email: emp.email,
                            reason: "E-mail já cadastrado no sistema"
                        });
                        continue;
                    }

                    let scheduleIdToAssign: string | null = null;
                    if (emp.workScheduleId && validScheduleIds.has(emp.workScheduleId)) {
                        scheduleIdToAssign = emp.workScheduleId;
                    }

                    const rawPassword = generateTemporaryPassword(emp.name);
                    const hashedPassword = await bcrypt.hash(rawPassword, 10);

                    const created = await extendedPrisma.user.create({
                        data: {
                            name: emp.name.trim(),
                            email: normalizedEmail,
                            password: hashedPassword,
                            role: emp.role as UserRole,
                            companyId,
                            workScheduleId: scheduleIdToAssign,
                        },
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        }
                    });

                    createdList.push({
                        ...created,
                        temporaryPassword: rawPassword,
                    });
                } catch (err) {
                    errorsList.push({
                        name: emp.name,
                        email: emp.email,
                        reason: err instanceof Error ? err.message : "Erro desconhecido ao salvar"
                    });
                }
            }

            return res.status(200).json({
                totalProcessed: employees.length,
                createdCount: createdList.length,
                errorCount: errorsList.length,
                createdEmployees: createdList,
                errors: errorsList,
                message: `Importação finalizada: ${createdList.length} criados, ${errorsList.length} falhas.`
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: error.issues[0]?.message || "Dados inválidos", errors: error.issues });
            }
            console.error("Erro na importação em lote:", error);
            return res.status(500).json({ message: "Erro ao processar importação em lote" });
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
