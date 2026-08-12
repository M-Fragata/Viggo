import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prismaContextStore } from "../database/prisma-extensions.js";
import { Env } from "../utils/environment.js";

interface TotemJWTPayload {
    companyId: string;
    totem: boolean;
}

export function totemAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Token de totem não fornecido" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Token de totem não fornecido" });

    try {
        const decoded = jwt.verify(token, Env.JWT_SECRET!, { algorithms: ['HS256'] }) as TotemJWTPayload;

        if (!decoded.totem || !decoded.companyId) {
            return res.status(401).json({ message: "Token inválido para modo totem" });
        }

        req.totemContext = { companyId: decoded.companyId };

        const store = { companyId: decoded.companyId, userId: "totem" };

        prismaContextStore.run(store, () => {
            next();
        });
    } catch (_error) {
        return res.status(401).json({ message: "Token de totem inválido ou expirado" });
    }
}
