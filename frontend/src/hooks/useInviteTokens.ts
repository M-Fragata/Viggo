import { useState, useCallback } from "react";
import { api, type InviteTokenResponse, type CreateInviteTokenDto, type PublicInviteResponse, type AcceptInviteDto } from "../services/api";
import { useToast } from "./useToast";

export function useInviteTokens() {
  const [tokens, setTokens] = useState<InviteTokenResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTokens = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.company.inviteTokens.list();
      setTokens(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar tokens de convite");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createToken = useCallback(
    async (data: CreateInviteTokenDto) => {
      const token = await api.company.inviteTokens.create(data);
      setTokens((prev) => [token, ...prev]);
      toast.success("Link de convite gerado", { description: "Copie e compartilhe o link" });
      return token;
    },
    [toast]
  );

  const revokeToken = useCallback(
    async (id: string) => {
      await api.company.inviteTokens.revoke(id);
      setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, revokedAt: new Date().toISOString(), isActive: false } : t)));
      toast.success("Token de convite revogado");
    },
    [toast]
  );

  return {
    tokens,
    isLoading,
    error,
    fetchTokens,
    createToken,
    revokeToken,
  };
}

export function usePublicInvite() {
  const [invite, setInvite] = useState<PublicInviteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInvite = useCallback(async (token: string) => {
    try {
      setIsLoading(true);
      const data = await api.company.public.getInviteByToken(token);
      setInvite(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Convite inválido ou expirado");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acceptInvite = useCallback(
    async (data: AcceptInviteDto) => {
      const result = await api.company.public.acceptInvite(data);
      toast.success("Conta criada!", { description: "Bem-vindo ao Viggo" });
      return result;
    },
    [toast]
  );

  return {
    invite,
    isLoading,
    error,
    fetchInvite,
    acceptInvite,
  };
}