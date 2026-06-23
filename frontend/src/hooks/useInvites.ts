import { useState, useCallback } from "react";
import { api, type InviteResponse, type CreateInviteDto, type PublicInviteResponse, type AcceptInviteDto } from "../services/api";
import { useToast } from "./useToast";

export function useInvites() {
  const [invites, setInvites] = useState<InviteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInvites = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.company.invites.list();
      setInvites(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar convites");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createInvite = useCallback(
    async (data: CreateInviteDto) => {
      const { invite } = await api.company.invites.create(data);
      setInvites((prev) => [invite, ...prev]);
      toast.success("Convite enviado", { description: `Convite enviado para ${data.email}` });
      return invite;
    },
    [toast]
  );

  const cancelInvite = useCallback(
    async (id: string) => {
      await api.company.invites.cancel(id);
      setInvites((prev) => prev.filter((invite) => invite.id !== id));
      toast.success("Convite cancelado");
    },
    [toast]
  );

  return {
    invites,
    isLoading,
    error,
    fetchInvites,
    createInvite,
    cancelInvite,
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