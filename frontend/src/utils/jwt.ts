export interface JWTPayload {
  id: string;
  role: "MASTER" | "ENTERPRISE_ADMIN" | "EMPLOYEE";
  name: string;
  email: string;
  companyName: string;
  companyId: string;
  planTier: string;
  isMaster: boolean;
  isImpersonated?: boolean;
  impersonatedBy?: string;
  exp: number;
}

export function decodeJWT(token: string): JWTPayload | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)) as JWTPayload;
  } catch {
    return null;
  }
}
