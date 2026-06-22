import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { setCurrentCompanyId, setCurrentUserId, clearPrismaContext } from "../database/prisma-extensions.js";

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
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
        const { id, role, companyId, planTier, isMaster } = decoded;

        const user: typeof req.user = { 
            id, 
            role, 
            companyId,
        };
        if (planTier) user.planTier = planTier;
        if (isMaster !== undefined) user.isMaster = isMaster;
        req.user = user;
        
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