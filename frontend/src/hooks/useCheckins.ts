import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { CheckinResponse, User } from "../services/api";

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
        const [checkinsData, usageData] = await Promise.all([
          api.checkins.list(date),
          api.company.getUsage(),
        ]);
        const formatted = formatCheckins(checkinsData, usageData.employees.users);
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

export function formatCheckins(data: CheckinResponse[], users: User[]): FormattedCheckin[] {
  const userMap: Record<string, string> = {};
  users.forEach((user) => {
    userMap[user.id] = user.name;
  });

  const employeeMap: Record<string, FormattedCheckin> = {};

  data.forEach((checkin) => {
    if (!employeeMap[checkin.userId]) {
      employeeMap[checkin.userId] = {
        employeeId: checkin.userId,
        employeeName: userMap[checkin.userId] || checkin.userId,
      };
    }

    const typeMap: Record<string, keyof Omit<FormattedCheckin, "employeeId" | "employeeName">> = {
      ENTRY: "entrada",
      LUNCH_START: "almoco",
      LUNCH_END: "retorno",
      EXIT: "saida",
    };

    const key = typeMap[checkin.type];
    if (key) {
      employeeMap[checkin.userId] = {
        ...employeeMap[checkin.userId],
        [key]: {
          timestamp: checkin.createdAt,
          lat: checkin.latitude,
          lng: checkin.longitude,
        },
      };
    }
  });

  return Object.values(employeeMap);
}