import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prismaContextStore } from "../database/prisma-extensions.js";

import { Env } from "../utils/environment.js"

interface JWTPayload {
    id: string;
    role: string;
    companyId: string;
    planTier?: string;
    isMaster?: boolean;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Token não fornecido" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Token não fornecido" });

    try {
        const decoded = jwt.verify(token, Env.JWT_SECRET!, { algorithms: ['HS256'] }) as JWTPayload;
        const { id, role, companyId, planTier } = decoded;

        const user: typeof req.user = {
            id,
            role,
            companyId,
        };
        if (planTier) user.planTier = planTier;

        req.user = user;

        const store = { companyId: companyId ?? "", userId: id };

        prismaContextStore.run(store, () => {
            next();
        });

    } catch (error: any) {
        return res.status(401).json({
            message: "Token inválido"
        });
    }
}