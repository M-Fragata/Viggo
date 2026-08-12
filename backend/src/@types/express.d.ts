declare namespace Express {
    export interface Request {
        user: {
            id: string;
            role: string;
            companyId?: string;
            planTier?: string;
            isMaster?: boolean;
        }
        totemContext?: {
            companyId: string;
        }
    }
}
