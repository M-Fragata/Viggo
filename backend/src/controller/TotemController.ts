import { type Request, type Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { Env } from "../utils/environment.js";
import { decryptFaceDescriptor, encryptFaceDescriptor } from "../utils/faceEncryption.js";
import { decryptCpf, formatCpfDigits } from "../utils/cpfEncryption.js";
import { gerarComprovante } from "../utils/comprovanteGenerator.js";
import { getNextNSR, currentYear, NsrLimitExceededError } from "../utils/nsrGenerator.js";
import { parseISO, startOfDay, endOfDay } from "date-fns";

interface FaceToken {
    descriptor: Float32Array;
    expiresAt: Date;
    userId: string;
}

const TOTEM_TOKEN_TTL_SECONDS = 8 * 60 * 60;

const faceTokens = new Map<string, FaceToken>();

export class TotemController {

    /**
     * POST /companies/me/totem/activate
     * Admin cadastra PIN e ativa modo totem. Recebe token totem.
     */
    async activate(req: Request, res: Response) {
        const bodySchema = z.object({
            pin: z.string().min(4).max(6).regex(/^\d+$/, "PIN deve conter apenas números"),
        });

        try {
            const { pin } = bodySchema.parse(req.body);

            const companyId = req.user.companyId;
            if (!companyId) {
                return res.status(403).json({ message: "Empresa não encontrada no token" });
            }

            const pinHash = await bcrypt.hash(pin, 10);

            await extendedPrisma.company.update({
                where: { id: companyId },
                data: {
                    totemPinHash: pinHash,
                    totemActive: true,
                },
            });

            const totemToken = jwt.sign(
                { companyId, totem: true },
                Env.JWT_SECRET!,
                { expiresIn: TOTEM_TOKEN_TTL_SECONDS, algorithm: "HS256" }
            );

            return res.json({ totemToken, expiresIn: TOTEM_TOKEN_TTL_SECONDS });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "PIN inválido", errors: error.issues });
            }
            console.error("Erro ao ativar totem:", error);
            return res.status(500).json({ message: "Erro ao ativar modo totem" });
        }
    }

    /**
     * POST /companies/me/totem/deactivate
     * Admin valida PIN e desativa totem.
     */
    async deactivate(req: Request, res: Response) {
        const bodySchema = z.object({
            pin: z.string().min(4).max(6).regex(/^\d+$/, "PIN deve conter apenas números"),
        });

        try {
            const { pin } = bodySchema.parse(req.body);

            const companyId = req.user.companyId;
            if (!companyId) {
                return res.status(403).json({ message: "Empresa não encontrada no token" });
            }

            const company = await extendedPrisma.company.findUnique({
                where: { id: companyId },
                select: { totemPinHash: true, totemActive: true },
            });

            if (!company || !company.totemPinHash) {
                return res.status(400).json({ message: "Modo totem não está configurado" });
            }

            const valid = await bcrypt.compare(pin, company.totemPinHash);
            if (!valid) {
                return res.status(403).json({ message: "PIN incorreto" });
            }

            await extendedPrisma.company.update({
                where: { id: companyId },
                data: { totemActive: false },
            });

            return res.json({ message: "Modo totem desativado" });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "PIN inválido", errors: error.issues });
            }
            console.error("Erro ao desativar totem:", error);
            return res.status(500).json({ message: "Erro ao desativar modo totem" });
        }
    }

    /**
     * POST /totem/recover
     * Recupera a saída do modo totem validando email+senha de um administrador.
     */
    async recover(req: Request, res: Response) {
        const bodySchema = z.object({
            email: z.string().email(),
            password: z.string().min(8),
        });

        try {
            const { email, password } = bodySchema.parse(req.body);

            const companyId = req.totemContext?.companyId;
            if (!companyId) {
                return res.status(403).json({ message: "Contexto de totem inválido" });
            }

            const user = await extendedPrisma.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    role: true,
                    companyId: true,
                    password: true,
                    status: true,
                },
            });

            const isAdmin =
                user &&
                (user.role === "MASTER" || (user.role === "ENTERPRISE_ADMIN" && user.companyId === companyId));

            if (!isAdmin || user.status !== "ACTIVE") {
                return res.status(403).json({ message: "Credenciais inválidas para recuperação" });
            }

            const passwordValid = await bcrypt.compare(password, user.password);
            if (!passwordValid) {
                return res.status(403).json({ message: "Credenciais inválidas para recuperação" });
            }

            await extendedPrisma.company.update({
                where: { id: companyId },
                data: { totemActive: false },
            });

            return res.json({ message: "Modo totem desativado" });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
            }
            console.error("Erro ao recuperar modo totem:", error);
            return res.status(500).json({ message: "Erro ao recuperar modo totem" });
        }
    }

    /**
     * POST /totem/verify
     * Totem valida email+senha do funcionário (sem login persistente).
     * Retorna faceToken vinculado àquele userId.
     */
    async verify(req: Request, res: Response) {
        const bodySchema = z.object({
            email: z.string().email(),
            password: z.string().min(8),
        });

        try {
            const { email, password } = bodySchema.parse(req.body);

            const companyId = req.totemContext?.companyId;
            if (!companyId) {
                return res.status(403).json({ message: "Contexto de totem inválido" });
            }

            const user = await extendedPrisma.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    password: true,
                    companyId: true,
                    faceDescriptor: true,
                    status: true,
                },
            });

            if (!user || user.companyId !== companyId) {
                return res.status(404).json({ message: "Funcionário não encontrado nesta empresa" });
            }

            if (user.status !== "ACTIVE") {
                return res.status(403).json({ message: "Conta inativa. Procure o administrador." });
            }

            const passwordValid = await bcrypt.compare(password, user.password);
            if (!passwordValid) {
                return res.status(403).json({ message: "Credenciais inválidas" });
            }

            if (!user.faceDescriptor) {
                return res.status(403).json({
                    code: "FACE_NOT_REGISTERED",
                    message: "Registro facial pendente. Procure o administrador para cadastrar sua biometria.",
                    userId: user.id,
                });
            }

            const descriptor = decryptFaceDescriptor(user.faceDescriptor as string);
            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 30_000);

            faceTokens.set(token, { descriptor, expiresAt, userId: user.id });
            setTimeout(() => faceTokens.delete(token), 30_000);

            return res.json({
                faceToken: token,
                expiresIn: 30,
                userId: user.id,
                userName: user.name,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
            }
            console.error("Erro ao verificar funcionário no totem:", error);
            return res.status(500).json({ message: "Erro ao verificar funcionário" });
        }
    }

    /**
     * POST /checkins/totem
     * Totem valida face token e registra check-in para o userId identificado.
     */
    async checkin(req: Request, res: Response) {
        const bodySchema = z.object({
            userId: z.string().uuid(),
            type: z.enum(["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"]),
            latitude: z.number(),
            longitude: z.number(),
            faceToken: z.string().uuid(),
        });

        try {
            const { userId, type, latitude, longitude, faceToken } = bodySchema.parse(req.body);

            const companyId = req.totemContext?.companyId;
            if (!companyId) {
                return res.status(403).json({ message: "Contexto de totem inválido" });
            }

            const stored = faceTokens.get(faceToken);
            if (!stored) {
                return res.status(401).json({ message: "Token facial inválido ou expirado" });
            }
            if (stored.expiresAt < new Date()) {
                faceTokens.delete(faceToken);
                return res.status(401).json({ message: "Token facial expirado" });
            }
            if (stored.userId !== userId) {
                return res.status(403).json({ message: "Token facial não corresponde ao usuário" });
            }

            faceTokens.delete(faceToken);

            const user = await extendedPrisma.user.findUnique({
                where: { id: userId },
            });

            if (!user || user.companyId !== companyId) {
                return res.status(404).json({ message: "Funcionário não encontrado nesta empresa" });
            }

            const today = new Date();
            const checkinExists = await extendedPrisma.checkIn.findFirst({
                where: {
                    userId,
                    type,
                    createdAt: {
                        gte: startOfDay(today),
                        lte: endOfDay(today),
                    },
                },
            });

            if (checkinExists) {
                return res.status(400).json({ message: `Ponto de ${type} já registrado hoje.` });
            }

            const ano = currentYear();
            const company = await extendedPrisma.company.findUnique({
                where: { id: companyId },
                select: { cnpj: true, name: true },
            });

            if (!company) {
                return res.status(404).json({ message: "Empresa não encontrada" });
            }

            // A2 mínimo: preservar cru (ver CheckinController)
            const rawCreatedAt = new Date();

            const checkin = await extendedPrisma.$transaction(async (tx) => {
                const nsr = await getNextNSR(tx as unknown as Parameters<typeof getNextNSR>[0], companyId, ano);

                return tx.checkIn.create({
                    data: {
                        type,
                        latitude,
                        longitude,
                        nsr,
                        ano,
                        userId,
                        companyId,
                        employerCnpj: company.cnpj,
                        createdAt: rawCreatedAt,
                    },
                });
            });

            const comprovante = gerarComprovante({
                nsr: checkin.nsr,
                companyName: company.name,
                companyCnpj: company.cnpj,
                employeeName: user.name,
                employeeCpf: formatCpfDigits(decryptCpf(user.cpf ?? "")),
                checkinType: type,
                checkinDate: checkin.createdAt,
                latitude,
                longitude,
            });

            return res.status(201).json({
                checkin: { checkin },
                comprovante: comprovante.texto,
                hashVerificacao: comprovante.hashVerificacao,
            });
        } catch (error) {
            if (error instanceof NsrLimitExceededError) {
                return res.status(503).json({
                    message: "Limite de 999.999 registros de ponto no ano corrente atingido. Contate o suporte.",
                });
            }

            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
            }
            console.error("Erro ao registrar ponto no totem:", error);
            return res.status(500).json({ message: "Erro ao registrar ponto no totem" });
        }
    }

    /**
     * POST /totem/face/verify
     * Valida descriptor facial contra o token emitido em /totem/verify.
     */
    async verifyFace(req: Request, res: Response) {
        const bodySchema = z.object({
            token: z.string().uuid(),
            descriptor: z.array(z.number()).min(128).max(128),
        });

        try {
            const { token, descriptor } = bodySchema.parse(req.body);

            const stored = faceTokens.get(token);
            if (!stored) {
                return res.status(401).json({ message: "Token facial inválido ou expirado" });
            }
            if (stored.expiresAt < new Date()) {
                faceTokens.delete(token);
                return res.status(401).json({ message: "Token facial expirado" });
            }

            const inputDescriptor = new Float32Array(descriptor);
            const distance = euclideanDistanceCalc(inputDescriptor, stored.descriptor);
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
            console.error("Erro ao verificar face no totem:", error);
            return res.status(500).json({ message: "Erro ao verificar face" });
        }
    }

    /**
     * POST /totem/face/register
     * Totem cadastra o descriptor facial do funcionário identificado em /totem/verify
     * quando ele ainda não possui biometria cadastrada.
     */
    async registerFace(req: Request, res: Response) {
        const bodySchema = z.object({
            userId: z.string().uuid(),
            descriptor: z.array(z.number()).min(128).max(128),
        });

        try {
            const { userId, descriptor } = bodySchema.parse(req.body);

            const companyId = req.totemContext?.companyId;
            if (!companyId) {
                return res.status(403).json({ message: "Contexto de totem inválido" });
            }

            const user = await extendedPrisma.user.findUnique({
                where: { id: userId },
                select: { id: true, companyId: true },
            });

            if (!user || user.companyId !== companyId) {
                return res.status(404).json({ message: "Funcionário não encontrado nesta empresa" });
            }

            await extendedPrisma.user.update({
                where: { id: userId },
                data: {
                    faceDescriptor: encryptFaceDescriptor(descriptor),
                    faceDescriptorUpdatedAt: new Date(),
                    faceRevalidationNotifiedAt: null,
                },
            });

            return res.json({ message: "Face registrada com sucesso!" });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
            }
            console.error("Erro ao registrar face no totem:", error);
            return res.status(500).json({ message: "Erro ao registrar face" });
        }
    }
}

function euclideanDistanceCalc(a: Float32Array | number[], b: Float32Array | number[]): number {
    const arrA = Array.from(a);
    const arrB = Array.from(b);
    let sum = 0;
    for (let i = 0; i < arrA.length; i++) {
        const diff = (arrA[i] ?? 0) - (arrB[i] ?? 0);
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

void parseISO;
