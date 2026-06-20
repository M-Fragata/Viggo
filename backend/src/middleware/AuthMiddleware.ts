import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { setCurrentCompanyId, setCurrentUserId, clearPrismaContext } from "../database/prisma-extensions.js";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Token não fornecido" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Token não fornecido" });

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        const { id, role, companyId } = decoded as { id: string, role: string, companyId: string };

        req.user = { id, role };
        
        if (companyId) {
            setCurrentCompanyId(companyId);
        }
        setCurrentUserId(id);

        res.on('finish', () => {
            clearPrismaContext();
        });

        next();

    } catch (error: any) {
        return res.status(401).json({
            message: "Token inválido",
            details: error.message
        });
    }
}