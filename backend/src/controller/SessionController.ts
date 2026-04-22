import { type Request, type Response } from "express";

import { prisma } from "../database/prisma";

import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export class SessionController {

    async create(req: Request, res: Response) {
        const bodySchema = z.object({
            name: z.string().min(3, "O nome deve conter no mínimo 3 caracteres"),
            email: z.email(),
            password: z.string().min(6, "A senha deve conter no mínimo 6 caracteres"),
            confirmPassword: z.string(),
        })

        try {

            const { name, email, password, confirmPassword } = bodySchema.parse(req.body);

            if (password !== confirmPassword) {
                return res.status(400).json({ message: "Senhas diferentes" });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const company = await prisma.company.findUnique({
                where: {
                    id: "1",
                }
            })

            if (!company) {
                throw new Error("Empresa não encontrada");
            }

            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: passwordHash,
                    companyId: "1",
                }
            })

            return res.status(201).json(user);

        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
            }
            return res.status(500).json({ message: "Erro ao criar usuário no BACKEND, tente novamente em alguns segundos!" });
        }
    }

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
                }
            })

            if (!user) return res.status(400).json({ message: "Email e/ou senha incorretos" });

            const verifyPassword = await bcrypt.compare(password, user.password);

            if (!verifyPassword) return res.status(400).json({ message: "Email e/ou senha incorretos" });

            const { password: _, ...userWithoutPassword } = user

            const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "7d" });

            return res.status(200).json({
                user: userWithoutPassword,
                token
            });

        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
            }
            return res.status(500).json({ message: "Erro ao fazer login no BACKEND, tente novamente em alguns segundos!" });
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

            await prisma.user.update({
                where: {
                    id: userId
                },
                data: {
                    faceDescriptor: JSON.stringify(faceDescriptor)
                }
            })

            return res.status(200).json({ message: "Face registrada com sucesso!" });

        } catch (error) {

            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: "Dados inválidos." })
            }

            return res.status(500).json({ error: "Erro ao salvar face." });

        }

    }

}