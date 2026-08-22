export interface ToleranceResult {
  horarioEfetivo: Date;
  dentroDaTolerancia: boolean;
  minutosExcedentes: number;
}

/**
 * Calcula se a marcação de ponto está dentro da tolerância CLT (Art. 74 §2º).
 *
 * Regra: se o atraso for menor ou igual à tolerância, o horário efetivo
 * é ajustado para o horário previsto. Caso contrário, mantém o horário real.
 *
 * Apenas atrasos são considerados — adiantamentos nunca são ajustados
 * (funcionário que chega cedo, opcionalmente trabalha antes do horário).
 *
 * @param horarioReal - Horário em que o funcionário bateu o ponto
 * @param horarioPrevisto - Horário programado (minutos desde meia-noite convertidos para Date)
 * @param toleranciaMinutos - Tolerância em minutos (ex: 5 para CLT)
 */
export function aplicarTolerancia(
  horarioReal: Date,
  horarioPrevisto: Date,
  toleranciaMinutos: number
): ToleranceResult {
  const diffMs = horarioReal.getTime() - horarioPrevisto.getTime();
  const diffMinutos = diffMs / (1000 * 60);

  // Adiantamento (horarioReal < horarioPrevisto): não ajusta
  if (diffMinutos < 0) {
    return {
      horarioEfetivo: horarioReal,
      dentroDaTolerancia: false,
      minutosExcedentes: 0,
    };
  }

  // Atraso dentro da tolerância: ajusta para horário previsto
  if (diffMinutos <= toleranciaMinutos) {
    return {
      horarioEfetivo: horarioPrevisto,
      dentroDaTolerancia: true,
      minutosExcedentes: 0,
    };
  }

  // Atraso além da tolerância: mantém horário real
  return {
    horarioEfetivo: horarioReal,
    dentroDaTolerancia: false,
    minutosExcedentes: Math.round(diffMinutos - toleranciaMinutos),
  };
}

/**
 * Converte minutos desde meia-noite para um objeto Date no mesmo dia da referência.
 * Ex: 480 → 08:00 do mesmo dia de `referencia`.
 */
export function minutosParaDate(minutos: number, referencia: Date): Date {
  const date = new Date(referencia);
  date.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
  return date;
}

/**
 * Mapeia tipo de checkin para o campo correspondente no WorkSchedule.
 */
export function tipoParaHorarioPrevisto(
  tipo: string,
  schedule: { entryTime: number; lunchStart: number; lunchEnd: number; exitTime: number }
): number | null {
  switch (tipo) {
    case "ENTRY": return schedule.entryTime;
    case "LUNCH_START": return schedule.lunchStart;
    case "LUNCH_END": return schedule.lunchEnd;
    case "EXIT": return schedule.exitTime;
    default: return null;
  }
}

/**
 * Mapeia tipo de checkin para o campo de tolerância correspondente.
 */
export function tipoParaTolerancia(
  tipo: string,
  schedule: { checkinToleranceMinutes: number; lunchToleranceMinutes: number }
): number {
  switch (tipo) {
    case "LUNCH_START":
    case "LUNCH_END":
      return schedule.lunchToleranceMinutes;
    default:
      return schedule.checkinToleranceMinutes;
  }
}

/**
 * Verifica se o dia da semana atual está nos dias permitidos do horário.
 * Dias da semana: Seg=1, Ter=2, Qua=4, Qui=8, Sex=16, Sab=32, Dom=64
 */
export function isDiaUtil(daysOfWeek: number, data: Date): boolean {
  const day = data.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab
  const bit = day === 0 ? 64 : 1 << (day - 1);
  return (daysOfWeek & bit) !== 0;
}

/**
 * Teto diário CLT Art.58 §1º segunda parte + Súmula 366 TST.
 * Máximo 10 min/dia tolerados (5 min por batida ENTRY/EXIT).
 * Lunch (15 min) NÃO consome teto diário — tratado à parte no service.
 * Cru preservado no DB (Port.671 Art.80); ajuste só no effective.
 */
export const TOLERANCIA_DIARIA_MAX = 10;

/**
 * Decide se um atraso de ENTRY/EXIT cabe no teto diário restante.
 * Retorna se deve aplicar tolerância e o novo restante.
 */
export function aplicarToleranciaComTeto(
  diffMin: number,
  tolerancia: number,
  restante: number
): { dentroDoTeto: boolean; novoRestante: number } {
  if (diffMin <= 0) return { dentroDoTeto: false, novoRestante: restante };
  if (diffMin > tolerancia) return { dentroDoTeto: false, novoRestante: restante };
  if (diffMin > restante) return { dentroDoTeto: false, novoRestante: restante };
  return { dentroDoTeto: true, novoRestante: restante - diffMin };
}
