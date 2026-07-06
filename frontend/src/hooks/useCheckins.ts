import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { CompanyCheckinEmployee } from "../services/api";

export type FormattedCheckin = {
  employeeId: string;
  employeeName: string;
  entrada?: {
    timestamp: string;
    lat: number;
    lng: number;
  };
  almoco?: {
    timestamp: string;
    lat: number;
    lng: number;
  };
  retorno?: {
    timestamp: string;
    lat: number;
    lng: number;
  };
  saida?: {
    timestamp: string;
    lat: number;
    lng: number;
  };
};

export function useCheckins(date: string) {
  const [checkins, setCheckins] = useState<FormattedCheckin[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;

    const fetchCheckins = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.checkins.listByCompany(date);
        const formatted = formatCheckins(data);
        setCheckins(formatted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao buscar check-ins");
        setCheckins([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCheckins();
  }, [date]);

  return { checkins, isLoading, error };
}

export function formatCheckins(data: CompanyCheckinEmployee[]): FormattedCheckin[] {
  const typeMap: Record<string, keyof Omit<FormattedCheckin, "employeeId" | "employeeName">> = {
    ENTRY: "entrada",
    LUNCH_START: "almoco",
    LUNCH_END: "retorno",
    EXIT: "saida",
  };

  return data.map((emp) => {
    const formatted: FormattedCheckin = {
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
    };

    emp.checkins.forEach((checkin) => {
      const key = typeMap[checkin.type];
      if (key) {
        formatted[key] = {
          timestamp: checkin.createdAt,
          lat: checkin.latitude,
          lng: checkin.longitude,
        };
      }
    });

    return formatted;
  });
}
