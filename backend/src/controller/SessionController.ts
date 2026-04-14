import { type Request, type Response } from "express";

import { prisma } from "../database/prisma";

import { z } from "zod";
import bcrypt from "bcrypt";

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

}