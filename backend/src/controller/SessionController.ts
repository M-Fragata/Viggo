import { type Request, type Response } from "express";

import { prisma } from "../database/prisma.js";

import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { Env } from "../utils/environment.js"
import { encryptFaceDescriptor, hasFaceDescriptor } from "../utils/faceEncryption.js"

export class SessionController {

    async login(req: Request, res: Response) {

        const bodySchema = z.object({
            email: z.email(),
            password: z.string().min(6, "A senha deve conter no mínimo 6 caracteres"),
        })

        try {

            const { email, password } = bodySchema.parse(req.body);

            const user = await prisma.user.findUnique({
                where: {
                    email
                },
                include: {
                    company: true
                }
            })

            if (!user) return res.status(400).json({ message: "Email e/ou senha incorreto(s), tente novamente" });

            const verifyPassword = await bcrypt.compare(password, user.password);

            if (!verifyPassword) return res.status(400).json({ message: "Email e/ou senha incorreto(s), tente novamente" });

            const companyUser = await prisma.company.findUnique({
                where: { id: user.companyId }
            })

            if (!companyUser) return res.status(400).json({ message: "Trabalhador sem empresa" })

            const data = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                hasFaceDescriptor: hasFaceDescriptor(user.faceDescriptor as string | null),
            }

            const token = jwt.sign({
                id: user.id,
                role: user.role,
                name: user.name,
                email: user.email,
                companyName: companyUser.name,
                companyId: user.companyId,
                planTier: user.company?.plan || "TIER_I",
                isMaster: user.role === "MASTER"
            }, Env.JWT_SECRET!, { expiresIn: "7d" });

            return res.status(200).json({
                user: data,
                company: companyUser.name,
                token
            });

        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
            }
            return res.status(500).json({ message: "Erro interno no servidor, tente novamente mais tarde" });
        }



    }

    async update(req: Request, res: Response) {

        const paramsSchema = z.object({
            userId: z.uuid()
        })

        const bodySchema = z.object({
            faceDescriptor: z.array(z.number())
        })

        try {

            const { userId } = paramsSchema.parse(req.params)
            const { faceDescriptor } = bodySchema.parse(req.body)

            const user = await prisma.user.findUnique({
                where: { id: userId }
            })

            if (!user) return res.status(404).json({ message: "Usuário não encontrado" })

            await prisma.user.update({
                where: {
                    id: userId
                },
                data: {
                    faceDescriptor: encryptFaceDescriptor(faceDescriptor)
                }
            })

            return res.status(200).json({ message: "Face registrada com sucesso!" });

        } catch (error) {

            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados inválidos" })
            }

            return res.status(500).json({ message: "Erro ao salvar face" });

        }

    }

}